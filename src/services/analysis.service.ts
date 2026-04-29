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
import {
  missionGenerator,
  IMissionDefinition,
} from "@/lib/worker/mission.generator";
import { getPeriodDateRange } from "@/lib/analysis/period";
import { AppError } from "@/lib/utils/error";
import { ApiCode } from "@/lib/utils/status";
import { AccountBook, Prisma } from "@/generated/client";
import { ANALYSIS_CATEGORY } from "@/constants/price";
import type { IVoucherLineUI } from "@/interfaces/voucher";

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
    const cost = getAnalysisCost(params as unknown as import('@/lib/analysis/pricing').AnalysisCostParams);

    // Info: (20260120 - Luphia) Simulate basic validation
    if (!params.category) {
      throw new Error("Missing required parameters: category");
    }

    const isNonPeriodAnalysis = [ANALYSIS_CATEGORY.AI_CONSULTING, ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS].some((category) => params.category === category);

    if (!isNonPeriodAnalysis && !params.periodType) {
      throw new Error("Missing required parameters: periodType");
    }

    // Info: (20260129 - Luphia) Generate Mission Content via MissionGenerator
    let missionDef: IMissionDefinition | null = null;
    let analysisResult = "AI Analysis Content Placeholder...";
    let parsedPrerequisiteParams: Record<string, unknown> | undefined = undefined;

    try {
      // Info: (20260320 - Tzuhan) Fetch prerequisite data for net_zero_emissions
      let prerequisiteStr = "";

      if (params.category === ANALYSIS_CATEGORY.NET_ZERO_EMISSIONS && params.keyword) {
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
        ].some(c => c === params.category)
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
          let matchedAccountBook: AccountBook | null = null;
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
            ? await esgRepo.findManyEsgRecords({
              where: {
                accountBookId: targetAccountBookId,
                tradingDate: { gte: new Date(start + "T00:00:00.000Z"), lte: new Date(end + "T23:59:59.999Z") },
                deletedAt: null,
              },
              orderBy: { tradingDate: "asc" },
            })
            : [];

          // Info: (20260418 - Tzuhan) 目前僅先對合規抓鬼與異常傳票執行 DB 傳票的完整撈取並交付快篩
          let voucherRecords: unknown[] = [];
          if (params.category === ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE || params.category === ANALYSIS_CATEGORY.BALANCE_SHEET) {
            voucherRecords = targetAccountBookId
              ? await voucherRepo.findManyVouchers({
                where: {
                  accountBookId: targetAccountBookId,
                  tradingDate: { gte: new Date(start + "T00:00:00.000Z"), lte: new Date(end + "T23:59:59.999Z") },
                  deletedAt: null,
                },
                orderBy: { tradingDate: "asc" },
                include: { lines: true } // Info: (20260417 - Tzuhan) 包含分錄以供 AI 判定異常大額與退貨
              })
              : [];
          }

          console.log(
            `[ESG-DEBUG] Fetched esgRecords: ${esgRecords.length}, vouchers: ${voucherRecords.length}`,
          );

          if (esgRecords.length > 0 || voucherRecords.length > 0) {
            if (params.category === ANALYSIS_CATEGORY.BALANCE_SHEET && voucherRecords.length > 0) {
              const { generateBalanceSheet } = await import("@/lib/report/balance_sheet_generator");
              const allLines: Record<string, unknown>[] = [];
              
              for (const v of voucherRecords) {
                const vData = v as Record<string, unknown>;
                if (!vData.lines || !Array.isArray(vData.lines)) continue;
                for (const line of vData.lines as Record<string, unknown>[]) {
                  allLines.push({
                    id: String(line.id || ""),
                    accounting: { 
                      code: String(line.accountingCode || line.accountId || ""), 
                      name: String(line.accountingCode || line.accountId || "") 
                    },
                    particular: String(line.particular || line.summary || ""),
                    amount: Number(line.amount || 0),
                    isDebit: Boolean(line.isDebit),
                  });
                }
              }
              
              const bsReport = generateBalanceSheet(allLines as unknown as IVoucherLineUI[]);
              parsedPrerequisiteParams = {
                balanceSheetReport: bsReport,
                accountBook: matchedAccountBook || undefined,
              };
              console.log(`[ESG-DEBUG] Parsed Context as Balance Sheet Report`);
            } else if (esgRecords.length > 0) {
              const esgContextLines = esgRecords.map((r) => {
                const dateStr = r.tradingDate.toISOString().split("T")[0];
                return `- 日期: ${dateStr}, 活動: ${r.activityType}, 排放量: ${Number(r.emissions)} ${r.unit}, 範疇: ${r.scope}, 廠商: ${r.vendor}`;
              });
              const recordStr = `\n【用戶提供的內部 ESG 數據紀錄】:\n${esgContextLines.join("\n")}\n`;
              parsedPrerequisiteParams = {
                esgRecordsContext: recordStr,
                accountBook: matchedAccountBook || undefined,
              };
              console.log(`[ESG-DEBUG] Parsed Context length:`, recordStr.length);
            } else {
              parsedPrerequisiteParams = {
                accountBook: matchedAccountBook || undefined,
              };
            }
          } else {
            console.log(`[ESG-DEBUG] Records length is 0 for the selected period. Proceeding with empty internal analysis.`);
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
        throw new AppError({ code: "VA000099", message: String(`找不到有效的分析任務產生器 (Category: ${params.category})`).slice(0, 30), status: ApiCode.VALIDATION_ERROR });
      }

      analysisResult = "Analysis Mission Generated. Pending Execution.";
    } catch (error) {
      console.error("[AnalysisService] Mission Generation Failed:", error);
      if (error instanceof AppError) {
        throw error; // Info: (20260417 - Tzuhan) Let the caller (API route) abort the operation instantly
      }
      // Info: (20260418 - Tzuhan) [BUGFIX] 如果發生未知崩潰(例如 Payload 超過 Prisma 大小限制)，必須拋出異常，阻斷 API 回傳 200，讓前端顯示錯誤而不吞噬訂單！
      throw new AppError({ code: "IN000099", message: "發生非預期錯誤，報告生成失敗。您的訂單紀錄已保留，請稍...", status: ApiCode.INTERNAL_SERVER_ERROR });
    }

    // Info: (20260128 - Luphia) Create Plan Content
    const planContent = {
      title: `Financial Analysis - ${params.category}`,
      userId,
      params,
      cost,
      createdAt: new Date().toISOString(),
      result: analysisResult,
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
            data: params.data ? (params.data as unknown as Prisma.InputJsonValue) : undefined,
          },
        });
      } catch (error) {
        console.error(`[AnalysisService] Failed to save report to DB:`, error);
        throw new Error("Failed to save report metadata");
      }

      try {
        const { orderRepo } = await import("@/repositories/order.repo");
        const existingOrder = await orderRepo.findFirst({ where: { id: params.orderId } });
        if (existingOrder && parsedPrerequisiteParams) {
          const orderDataObj = (existingOrder.data as Record<string, unknown>) || {};
          const innerData = (orderDataObj.data as Record<string, unknown>) || {};
          
          await orderRepo.update({
            where: { id: params.orderId },
            data: {
              data: {
                ...orderDataObj,
                data: {
                  ...innerData,
                  prerequisiteData: parsedPrerequisiteParams
                }
              } as unknown as Prisma.InputJsonObject
            }
          });
          console.log(`[AnalysisService] Injected prerequisiteData into Order ${params.orderId} successfully.`);
        }
      } catch (error) {
        console.error(`[AnalysisService] Failed to update Order prerequisiteData:`, error);
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
