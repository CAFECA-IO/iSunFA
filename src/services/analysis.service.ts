import { mkdir } from "fs/promises";
import { promises as fs } from "fs";
import path from "path";
import { getAnalysisCost, IOrderParams } from "@/lib/analysis/pricing";
import { storageService } from "@/services/storage.service";
import { analysisRepo } from "@/repositories/analysis.repo";
import { teamRepo } from "@/repositories/team.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { orderRepo } from "@/repositories/order.repo";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
// import { getAccountByCode } from "@/lib/utils/account";
// import { IAccount } from "@/constants/accounts";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import {
  missionGenerator,
  IMissionDefinition,
} from "@/lib/worker/mission.generator";
import { getPeriodDateRange } from "@/lib/analysis/period";
import { AppError } from "@/lib/utils/error";
import { ApiCode } from "@/lib/utils/status";
// import { AccountBook, Prisma } from "@/generated";
import { ANALYSIS_CATEGORY } from "@/constants/price";
import { IVoucherFilterOptions } from "@/interfaces/data_filter_option";
import { VerifyStatus } from "@/constants/verify_status";
import { VoucherSorting } from "@/constants/sort";
import type { IVoucher } from "@/interfaces/voucher";
import { IAccountBook } from "@/interfaces/account_book";
import { IJSONObject } from "@/validators";

export interface IGenerateAnalysisParams extends IOrderParams {
  orderId?: string;
  status?: string;
  category?: string;
  periodType?: string;
  periodValue?: string;
  year?: number;
  country?: string;
  keyword?: string;
  isExternal?: boolean;
}

export class AnalysisService {
  /**
   * Info: (20260120 - Luphia) Mock generation of financial analysis.
   * In a real implementation, this would:
   * 1. Validate the user and credits.
   * 2. Deduct credits via transaction.
   * 3. Trigger the AI analysis job.
   * 4. Return the job ID or result.
   */
  async generateAnalysis(userId: string, params: IGenerateAnalysisParams) {
    Object.assign(params, params.data || {});
    console.log(`[AnalysisService] Generating for ${userId}:`, params);

    /**
     * Info: (20260128 - Luphia) Calculate dynamic cost
     * Note: In production this cost should ideally be passed from the trusted Order
     * or recalculated and verified to match the Order.
     */
    const cost = getAnalysisCost(
      params as unknown as import("@/lib/analysis/pricing").AnalysisCostParams,
    );

    // Info: (20260120 - Luphia) Simulate basic validation
    if (!params.category) {
      throw new Error("Missing required parameters: category");
    }

    const isNonPeriodAnalysis = [
      ANALYSIS_CATEGORY.AI_CONSULTING,
      ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS,
      ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT,
    ].some((category) => params.category === category);

    if (!isNonPeriodAnalysis && !params.periodType) {
      throw new Error("Missing required parameters: periodType");
    }

    // Info: (20260129 - Luphia) Generate Mission Content via MissionGenerator
    let missionDef: IMissionDefinition | null = null;
    let analysisResult = "AI Analysis Content Placeholder...";
    let parsedPrerequisiteParams: Record<string, unknown> | undefined =
      undefined;

    try {
      // Info: (20260320 - Tzuhan) Fetch prerequisite data for net_zero_emissions
      let prerequisiteStr = "";

      if (
        params.category === ANALYSIS_CATEGORY.NET_ZERO_EMISSIONS &&
        params.keyword
      ) {
        const prerequisite = await analysisRepo.findFirst({
          where: {
            userId,
            type: ANALYSIS_CATEGORY.CARBON_HEALTH_CHECK,
            data: {
              path: ["keyword"],
              equals: params.keyword,
            },
          },
          orderBy: { createdAt: "desc" },
        });

        if (prerequisite?.result) {
          prerequisiteStr =
            typeof prerequisite.result === "string"
              ? prerequisite.result
              : JSON.stringify(prerequisite.result);
        }

        if (prerequisiteStr) {
          const carbonHealthScoreMatch =
            prerequisiteStr.match(/碳健檢綜合評分.*?(\d+)/) ||
            prerequisiteStr.match(/總分.*?(\d+)/);
          const score = carbonHealthScoreMatch
            ? parseInt(carbonHealthScoreMatch[1], 10)
            : 50;

          let tier2Status = "NONE";
          if (
            prerequisiteStr.includes("高碳排鎖定警示") ||
            prerequisiteStr.includes("雷神之鎚")
          )
            tier2Status = "HAMMER";
          if (
            prerequisiteStr.includes("戰略性氣候基建") ||
            prerequisiteStr.includes("免死金牌")
          )
            tier2Status = "SHIELD";

          const firstLayerMatch = prerequisiteStr.match(
            /第一層：物理現實([\s\S]*?)(第二層|戰略外掛|附錄)/,
          );
          const failedQuestionsText = firstLayerMatch
            ? firstLayerMatch[1].trim()
            : "未檢測到重大痛點";

          parsedPrerequisiteParams = {
            carbonHealthScore: score,
            tier2Status,
            failedQuestions: [failedQuestionsText],
            companyIndustry: "科技製造與能源產業", // Info: (20260320 - Tzuhan) We will replace this dynamically if available, or rely on web search
          };
        }
      } else if (
        [
          ANALYSIS_CATEGORY.CARBON_HEALTH_CHECK,
          ANALYSIS_CATEGORY.BALANCE_SHEET,
          ANALYSIS_CATEGORY.CASH_FLOW,
          ANALYSIS_CATEGORY.INCOME_STATEMENT,
          ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE,
          ANALYSIS_CATEGORY.FINANCIAL_HEALTH,
          ANALYSIS_CATEGORY.IRSC,
          ANALYSIS_CATEGORY.NET_ZERO_EMISSIONS,
        ].some((c) => c === params.category)
      ) {
        if (!params.isExternal) {
          const { start, end } = getPeriodDateRange(
            params.periodType!,
            params.year!,
            params.periodValue!,
          );
          const startTs = Math.floor(new Date(start).getTime() / 1000);
          const endTs = Math.floor(
            new Date(end + "T23:59:59.999Z").getTime() / 1000,
          );

          const teamMembers = await teamRepo.findManyMembers({
            where: { userId },
          });
          const teamIds = teamMembers.map((tm) => tm.teamId);

          let targetAccountBookId: string | null = null;
          // Info: (20260508 - Julian) 以 IAccountBook 替代 Prisma 取值
          // let matchedAccountBook: AccountBook | null = null;
          let matchedAccountBook: IAccountBook | null = null;

          if (params.keyword) {
            const match = params.keyword.match(/\((.*?)\)/);
            const taxId = match ? match[1] : params.keyword;

            console.log(
              `[ESG-DEBUG] Keyword: ${params.keyword}, Extracted Tax ID: ${taxId}`,
            );

            matchedAccountBook = await accountBookRepo.findFirst({
              where: {
                teamId: { in: teamIds },
                enterpriseId: taxId,
              },
            });
            if (matchedAccountBook) {
              targetAccountBookId = matchedAccountBook.id;
              console.log(
                `[ESG-DEBUG] Matched account book ID: ${targetAccountBookId}`,
              );
            } else {
              console.log(
                `[ESG-DEBUG] No account book matched enterpriseId: ${taxId}`,
              );
            }
          }

          console.log(`[ESG-DEBUG] Start TS: ${startTs}, End TS: ${endTs}`);

          const esgRecords = targetAccountBookId
            ? await esgRepo.getEsgRecordsForReport({
                accountBookId: targetAccountBookId,
                start: new Date(start + "T00:00:00.000Z"),
                end: new Date(end + "T23:59:59.999Z"),
              })
            : [];

          // Info: (20260418 - Tzuhan) [去耦合與效能最佳化] 分離 Period (當期) 與 Cumulative (歷史累積) 的查詢，避免財報數據打架
          /*
          type VoucherWithLines = Prisma.VoucherGetPayload<{
            include: { lines: true };
          }>;
          let periodVouchers: VoucherWithLines[] = [];
          let cumulativeVouchers: VoucherWithLines[] = [];
          */
          let periodVouchers: IVoucher[] = [];
          let cumulativeVouchers: IVoucher[] = [];

          if (
            params.category === ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE ||
            params.category === ANALYSIS_CATEGORY.FINANCIAL_HEALTH ||
            params.category === ANALYSIS_CATEGORY.BALANCE_SHEET ||
            params.category === ANALYSIS_CATEGORY.CASH_FLOW ||
            params.category === ANALYSIS_CATEGORY.INCOME_STATEMENT
          ) {
            // Info: (20260508 - Julian) 移除 Prisma.VoucherWhereInput
            /*
            const baseWhere: Prisma.VoucherWhereInput = {
              accountBookId: targetAccountBookId!,
              deletedAt: null,
              isVerified: true, // Info: (20260502 - Tzuhan) ⚠️修復：排除草稿傳票
              tradingDate: { lte: new Date(end + "T23:59:59.999Z") },
            };
            */

            if (targetAccountBookId) {
              const category =
                params.category as (typeof ANALYSIS_CATEGORY)[keyof typeof ANALYSIS_CATEGORY];

              // Info: (20260508 - Julian) 使用 IVoucherFilterOptions 建立篩選條件
              const cumulativeFilter: IVoucherFilterOptions = {
                accountBookId: targetAccountBookId,
                hideDeleted: true, // Info: (20260508 - Julian) 排除已刪除的傳票
                verifyStatus: VerifyStatus.VERIFIED, // Info: (20260502 - Julian) 選擇傳票
                endDate: new Date(end + "T23:59:59.999Z"), // Info: (20260508 - Julian) 排除未來傳票
                sorting: VoucherSorting.DATE_ASC, // Info: (20260508 - Julian) 按日期排序
              };

              // Info: (20260502 - Tzuhan) 1. 資產負債表需要累積餘額 (無 gte)
              const needsCumulative: (typeof ANALYSIS_CATEGORY)[keyof typeof ANALYSIS_CATEGORY][] =
                [
                  ANALYSIS_CATEGORY.BALANCE_SHEET,
                  ANALYSIS_CATEGORY.FINANCIAL_HEALTH,
                  ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE,
                ];
              if (needsCumulative.includes(category)) {
                // Info: (20260508 - Julian) 使用 getVouchersByFilter 取代原來的 findManyVouchers
                /*
                cumulativeVouchers = (await voucherRepo.findManyVouchers({
                  where: baseWhere,
                  orderBy: { tradingDate: "asc" },
                  include: { lines: true },
                })) as unknown as VoucherWithLines[];
                */
                cumulativeVouchers =
                  await voucherRepo.getVouchersByFilter(cumulativeFilter);
              }

              // Info: (20260502 - Tzuhan) 2. 損益與現金流量表需要當期發生額 (有 gte)
              const needsPeriod: (typeof ANALYSIS_CATEGORY)[keyof typeof ANALYSIS_CATEGORY][] =
                [
                  ANALYSIS_CATEGORY.INCOME_STATEMENT,
                  ANALYSIS_CATEGORY.CASH_FLOW,
                  ANALYSIS_CATEGORY.FINANCIAL_HEALTH,
                  ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE,
                ];
              if (needsPeriod.includes(category)) {
                // Info: (20260508 - Julian) 使用 getVouchersByFilter 取代原來的 findManyVouchers
                /*
                periodVouchers = (await voucherRepo.findManyVouchers({
                  where: {
                    ...baseWhere,
                    tradingDate: {
                      lte: new Date(end + "T23:59:59.999Z"),
                      gte: new Date(start + "T00:00:00.000Z"),
                    },
                  },
                  orderBy: { tradingDate: "asc" },
                  include: { lines: true },
                })) as unknown as VoucherWithLines[];
                */
                periodVouchers = await voucherRepo.getVouchersByFilter({
                  ...cumulativeFilter,
                  startDate: new Date(start + "T00:00:00.000Z"),
                });
              }
            }
          }

          console.log(
            `[ESG-DEBUG] Fetched esgRecords: ${esgRecords.length}, periodVouchers: ${periodVouchers.length}, cumulativeVouchers: ${cumulativeVouchers.length}`,
          );

          if (
            esgRecords.length > 0 ||
            periodVouchers.length > 0 ||
            cumulativeVouchers.length > 0
          ) {
            parsedPrerequisiteParams = {
              accountBook: matchedAccountBook || undefined,
            };

            /*
            const formatLines = (vouchers: VoucherWithLines[]) => {
              const allLines: IVoucherLineUI[] = [];
              for (const v of vouchers) {
                if (!v.lines || !Array.isArray(v.lines)) continue;
                for (const line of v.lines) {
                  const code = String(line.accountingCode || "");
                  const acc = getAccountByCode(code);
                  allLines.push({
                    id: String(line.id || ""),
                    accountingCode: code,
                    accounting: acc
                      ? (acc as IAccount)
                      : ({ code, name: code } as IAccount), // Info: (20260502 - Tzuhan) ⚠️修復：正確綁定科目字典，消滅 AI 幻覺
                    particular: String(line.particular || ""),
                    amount: Number(line.amount || 0),
                    isDebit: Boolean(line.isDebit),
                  } as unknown as IVoucherLineUI);
                }
              }
              return allLines;
            };
            */
            // Info: (20260508 - Julian) Phase 2: 移除手動轉換邏輯，直接從 IVoucher 取出 lines
            const formatLines = (vouchers: IVoucher[]) =>
              vouchers.flatMap((v) => v.lineItems?.lines || []);

            const periodLines = formatLines(periodVouchers);
            const cumulativeLines = formatLines(cumulativeVouchers);

            // Info: (20260502 - Tzuhan) ⚠️修復：只有合規抓鬼 (FINANCIAL_COMPLIANCE) 這種異常偵測，才需要把「原始傳票明細」餵給 AI，其餘純財報分析嚴禁餵原始明細避免 AI 重複加總
            if (
              params.category === ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE &&
              periodVouchers.length > 0
            ) {
              /*
              const voucherLinesStr = periodVouchers
                .map((v) => {
                  const linesStr = (Array.isArray(v.lines) ? v.lines : [])
                    .map((l) => {
                      const code = String(l.accountingCode || "");
                      const acc = getAccountByCode(code);
                      return `    - 科目: ${acc ? acc.name : code}, 金額:${Number(l.amount || 0)}, 摘要: ${l.particular || ""}, 借貸: ${l.isDebit ? "借方" : "貸方"}`;
                    })
                    .join("\n");
                  const dateStr =
                    v.tradingDate instanceof Date
                      ? v.tradingDate.toISOString().split("T")[0]
                      : String(v.tradingDate).split("T")[0];
                  return `- 傳票號: ${v.id}, 日期: ${dateStr}\n${linesStr}`;
                })
                .join("\n");
              */
              // Info: (20260508 - Julian) 轉換日期格式，並將 lineItems 的結構轉換成字串
              const voucherLinesStr = periodVouchers
                .map((v) => {
                  const linesStr = (v.lineItems?.lines || [])
                    .map((l) => {
                      return `    - 科目: ${l.accounting?.name || l.accountingCode}, 金額:${l.amount}, 摘要: ${l.particular}, 借貸: ${l.isDebit ? "借方" : "貸方"}`;
                    })
                    .join("\n");
                  const dateStr = new Date(v.tradingDate * 1000)
                    .toISOString()
                    .split("T")[0];
                  return `- 傳票號: ${v.id}, 日期: ${dateStr}\n${linesStr}`;
                })
                .join("\n");
              parsedPrerequisiteParams.voucherRecordsContext = `\n【內部傳票明細數據紀錄】(僅供合規異常分析參考，嚴禁自行加總):\n${voucherLinesStr}\n`;
            }

            if (params.category === ANALYSIS_CATEGORY.BALANCE_SHEET) {
              parsedPrerequisiteParams.balanceSheetReport =
                generateBalanceSheet(
                  cumulativeLines,
                  matchedAccountBook?.parValue || 10,
                );
            } else if (params.category === ANALYSIS_CATEGORY.CASH_FLOW) {
              parsedPrerequisiteParams.cashFlowReport =
                generateCashFlowStatement(periodLines);
            } else if (params.category === ANALYSIS_CATEGORY.INCOME_STATEMENT) {
              parsedPrerequisiteParams.incomeStatementReport =
                generateIncomeStatement(periodLines);
            } else if (
              params.category === ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE ||
              params.category === ANALYSIS_CATEGORY.FINANCIAL_HEALTH ||
              params.category === ANALYSIS_CATEGORY.CARBON_HEALTH_CHECK ||
              params.category === ANALYSIS_CATEGORY.NET_ZERO_EMISSIONS
            ) {
              parsedPrerequisiteParams.balanceSheetReport =
                generateBalanceSheet(
                  cumulativeLines,
                  matchedAccountBook?.parValue || 10,
                );
              parsedPrerequisiteParams.cashFlowReport =
                generateCashFlowStatement(periodLines);
              parsedPrerequisiteParams.incomeStatementReport =
                generateIncomeStatement(periodLines);
            }

            if (esgRecords.length > 0) {
              parsedPrerequisiteParams.esgReport =
                generateEsgReport(esgRecords);

              if (params.category === ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE) {
                const esgContextLines = esgRecords.map((r) => {
                  const tradingDateStr = new Date(r.tradingDate * 1000)
                    .toISOString()
                    .split("T")[0];
                  return `- 日期: ${tradingDateStr}, 活動: ${r.activityType}, 排放量: ${Number(r.emissions)} ${r.unit}, 範疇: ${r.scope}, 廠商: ${r.vendor}`;
                });
                parsedPrerequisiteParams.esgRecordsContext = `\n【內部 ESG 明細紀錄】:\n${esgContextLines.join("\n")}\n`;
              }
            }
          } else {
            console.log(
              `[ESG-DEBUG] Records length is 0 for the selected period. Proceeding with empty internal analysis.`,
            );
          }
        }
      }

      missionDef = missionGenerator.generateMission({
        category: params.category!,
        periodType: params.periodType!,
        periodValue: params.periodValue!,
        year: params.year!,
        country: params.country,
        keyword: params.keyword,
        prerequisiteData: parsedPrerequisiteParams,
        data: params.data, // Info: (20260418 - Luphia) Pass through extraneous Payload
        orderId: params.orderId, // Info: (20260418 - Luphia) Pass through Order ID
        isExternal: params.isExternal, // Info: (20260418 - Luphia) Just in case it needs this too
      });

      // Info: (20260418 - Tzuhan) [BUGFIX] 如果 generator 根本不認識這個類別，或是生成的 tasks 是空的，絕對不允許進入資料庫建立幽靈 Mission
      if (!missionDef || !missionDef.tasks || missionDef.tasks.length === 0) {
        throw new AppError({
          code: "VA000099",
          message: String(
            `找不到有效的分析任務產生器 (Category: ${params.category})`,
          ).slice(0, 30),
          status: ApiCode.VALIDATION_ERROR,
        });
      }

      analysisResult = "Analysis Mission Generated. Pending Execution.";
    } catch (error) {
      console.error("[AnalysisService] Mission Generation Failed:", error);
      if (error instanceof AppError) {
        throw error; // Info: (20260417 - Tzuhan) Let the caller (API route) abort the operation instantly
      }
      // Info: (20260418 - Tzuhan) [BUGFIX] 如果發生未知崩潰(例如 Payload 超過 Prisma 大小限制)，必須拋出異常，阻斷 API 回傳 200，讓前端顯示錯誤而不吞噬訂單！
      throw new AppError({
        code: "IN000099",
        message: "發生非預期錯誤，報告生成失敗。您的訂單紀錄已保留，請稍...",
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }

    // Info: (20260128 - Luphia) Create Plan Content
    const planContent = {
      title: `Financial Analysis - ${params.category}`,
      userId,
      params,
      cost,
      createdAt: new Date().toISOString(),
      result: analysisResult,

      // Info (20260508 - Julian) For Debug
      // prerequisiteData: parsedPrerequisiteParams,
      // missionDef: missionDef,
    };

    // Info: (20260304 - Tzuhan) Create an instant UUID for reportId instead of waiting 15s for Laria Hash
    const reportId = crypto.randomUUID();

    const reportDir = path.join(process.cwd(), "reports", reportId);

    // Info: (20260128 - Luphia) Create report directory
    try {
      await mkdir(reportDir, { recursive: true });
      console.log(`[AnalysisService] Created report directory: ${reportDir}`);

      // Info: (20260128 - Luphia) Save local backup
      await fs.writeFile(
        path.join(reportDir, "plan.json"),
        JSON.stringify(planContent, null, 2),
      );
    } catch (error) {
      console.error(
        `[AnalysisService] Failed to create report directory:`,
        error,
      );
      throw new Error("Failed to initialize report storage");
    }

    if (params.orderId) {
      try {
        // Info: (20260327 - Tzuhan) Cache disabled for reports (Always generate fresh report)
        await analysisRepo.create({
          reportId,
          userId,
          orderId: params.orderId,
          category: params.category,
          data: {
            missionName: missionDef
              ? missionDef.name
              : `Analysis-${params.category}-${params.periodType!}`,
            category: params.category,
            cost,
            remainingBalance: 9500,
            generatedAt: new Date().toISOString(),
            planHash: null,
            periodType: params.periodType!,
            periodValue: params.periodValue!,
            year: params.year!,
            country: params.country,
            keyword: params.keyword,
            isExternal: params.isExternal === true,
            historicalTags: await analysisRepo.getGlobalTopTags(20),
            data: params.data,
          },
        });
      } catch (error) {
        console.error(`[AnalysisService] Failed to save report to DB:`, error);
        throw new Error("Failed to save report metadata");
      }

      try {
        const existingOrder = await orderRepo.findFirst({
          where: { id: params.orderId },
        });
        if (existingOrder && parsedPrerequisiteParams) {
          const orderDataObj =
            (existingOrder.data as Record<string, unknown>) || {};
          const innerData =
            (orderDataObj.data as Record<string, unknown>) || {};

          await orderRepo.update({
            where: { id: params.orderId },
            data: {
              data: {
                ...orderDataObj,
                data: {
                  ...innerData,
                  prerequisiteData: parsedPrerequisiteParams,
                },
                // Info: (20260509 - Julian) 移除 Prisma 依賴，使用 IJSONObject
              } as unknown as IJSONObject, // Prisma.InputJsonObject,
            },
          });
          console.log(
            `[AnalysisService] Injected prerequisiteData into Order ${params.orderId} successfully.`,
          );
        }
      } catch (error) {
        console.error(
          `[AnalysisService] Failed to update Order prerequisiteData:`,
          error,
        );
        throw new Error("Failed to update order metadata");
      }
    }

    const planFile = new File([JSON.stringify(planContent)], "plan.json", {
      type: "application/json",
    });

    storageService
      .uploadLaria(planFile)
      .then(async (hash) => {
        console.log(
          `[Info: (20260304 - Tzuhan)] BACKGROUND Plan uploaded, hash: ${hash} for Order ${params.orderId}`,
        );
        /**
         * Info: (20260420 - Luphia) The worker logic should pick up from the IPFS if we need to manually trigger, or the order polling handles it.
         * Wait, analysis data already stores the plan internally or the worker IPFS logic handles it.
         */
      })
      .catch(async (error) => {
        console.error(
          `[Info: (20260304 - Tzuhan)] BACKGROUND Failed to upload plan:`,
          error,
        );
      });

    // Info: (20260120 - Luphia) Mock Response returned instantly
    return {
      success: true,
      message: "Analysis generated successfully",
      data: {
        reportId: reportId,
        cost: cost,
        remainingBalance: 9500,
        generatedAt: new Date().toISOString(),
        periodType: params.periodType!,
        periodValue: params.periodValue!,
        year: params.year!,
      },
    };
  }
}

export const analysisService = new AnalysisService();
