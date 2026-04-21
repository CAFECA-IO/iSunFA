import { mkdir } from "fs/promises";
import { promises as fs } from "fs";
import path from "path";
import { getAnalysisCost, IOrderParams } from "@/lib/analysis/pricing";
import { storageService } from "@/services/storage.service";
import { prisma } from "@/lib/prisma";
import { analysisRepo } from "@/repositories/analysis.repo";
import {
  missionGenerator,
  IMissionDefinition,
} from "@/lib/worker/mission.generator";
import { MISSION_STATUS } from "@/constants/status";
import { getPeriodDateRange } from "@/lib/analysis/period";
import { AppError } from "@/lib/utils/error";
import { ApiCode } from "@/lib/utils/status";
import { Prisma, Voucher, VoucherLine } from "@/generated/client";

export interface IGenerateAnalysisParams extends IOrderParams {
  orderId?: string;
  status?: string;
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
    console.log(`[AnalysisService] Generating for ${userId}:`, params);

    /**
     * Info: (20260128 - Luphia) Calculate dynamic cost
     * Note: In production this cost should ideally be passed from the trusted Order
     * or recalculated and verified to match the Order.
     */
    const cost = getAnalysisCost(params);

    // Info: (20260120 - Luphia) Simulate basic validation
    if (!params.category || !params.periodType) {
      throw new Error("Missing required parameters");
    }

    // Info: (20260129 - Luphia) Generate Mission Content via MissionGenerator
    let missionDef: IMissionDefinition | null = null;
    let analysisResult = "AI Analysis Content Placeholder...";

    try {
      // Info: (20260320 - Tzuhan) Fetch prerequisite data for net_zero_emissions
      let parsedPrerequisiteParams: Record<string, unknown> | undefined =
        undefined;
      let prerequisiteStr = "";

      if (params.category === "net_zero_emissions" && params.keyword) {
        const prerequisite = await prisma.analysis.findFirst({
          where: {
            userId,
            type: "carbon_health_check",
            data: {
              path: ["keyword"],
              equals: params.keyword,
            },
          },
          orderBy: { createdAt: "desc" },
          include: { mission: true },
        });

        if (prerequisite?.mission?.result) {
          prerequisiteStr =
            typeof prerequisite.mission.result === "string"
              ? prerequisite.mission.result
              : JSON.stringify(prerequisite.mission.result);
        } else if (prerequisite?.result) {
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
      } 
      
      // Info: (20260420 - Tzuhan) 將內部報告的 Context 撈取邏輯從互斥的 else-if 獨立出來，確保淨零排放(net_zero)等報告也能吃到 Voucher。
      if (
        [
          "carbon_health_check",
          "balance_sheet",
          "cash_flow",
          "income_statement",
          "financial_compliance",
          "financial_health",
          "irsc",
          "net_zero_emissions"
        ].includes(params.category)
      ) {
        if (!params.isExternal) {
          const { start, end } = getPeriodDateRange(
            params.periodType,
            params.year,
            params.periodValue,
          );
          const startTs = Math.floor(new Date(start).getTime() / 1000);
          const endTs = Math.floor(
            new Date(end + "T23:59:59.999Z").getTime() / 1000,
          );

          const teamMembers = await prisma.teamMember.findMany({
            where: { userId },
          });
          const teamIds = teamMembers.map((tm) => tm.teamId);

          let targetAccountBookId: string | null = null;
          if (params.keyword) {
            const match = params.keyword.match(/\((.*?)\)/);
            const taxId = match ? match[1] : params.keyword;

            console.log(
              `[ESG-DEBUG] Keyword: ${params.keyword}, Extracted Tax ID: ${taxId}`,
            );

            const matchedAccountBook = await prisma.accountBook.findFirst({
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
            ? await prisma.esgRecord.findMany({
              where: {
                accountBookId: targetAccountBookId,
                tradingDate: { gte: new Date(start + "T00:00:00.000Z"), lte: new Date(end + "T23:59:59.999Z") },
                deletedAt: null,
              },
              orderBy: { tradingDate: "asc" },
            })
            : [];

          // Info: (20260420 - Tzuhan) 取消分類限制，對所有內部報告開放 DB 傳票撈取，讓碳健檢也能抓到電費、水費、磅單等 ESG 單據
          let voucherRecords: (Voucher & { lines: VoucherLine[] })[] = [];
          voucherRecords = targetAccountBookId
            ? await prisma.voucher.findMany({
                where: {
                  accountBookId: targetAccountBookId,
                  tradingDate: { gte: new Date(start + "T00:00:00.000Z"), lte: new Date(end + "T23:59:59.999Z") },
                  deletedAt: null,
                },
                orderBy: { tradingDate: "asc" },
                include: { lines: true } // Info: (20260417 - Tzuhan) 包含分錄以供 AI 判定異常大金額或原物料採購
              })
            : [];

          const journalRecords = targetAccountBookId
            ? await prisma.journal.findMany({
                where: {
                  accountBookId: targetAccountBookId,
                  tradingDate: { gte: new Date(start + "T00:00:00.000Z"), lte: new Date(end + "T23:59:59.999Z") },
                  deletedAt: null,
                },
                orderBy: { tradingDate: "asc" },
                select: { id: true, tradingDate: true, text: true, aiNote: true }
              })
            : [];

          console.log(
            `[ESG-DEBUG] Fetched esgRecords: ${esgRecords.length}, vouchers: ${voucherRecords.length}, journals: ${journalRecords.length}`
          );

          if (esgRecords.length > 0 || voucherRecords.length > 0 || journalRecords.length > 0) {
            // Info: (20260421 - Tzuhan) Pruning: 移除無關的系統欄位，避免浪費 Token 以及膨脹 DB
            // Pre-aggregation: 預先加總大科目
            let totalRevenue = 0;
            let totalOpex = 0;
            let totalAssets = 0;
            let totalLiabilities = 0;

            const cleanVouchers = voucherRecords.map(v => {
              const lines = v.lines.map(l => {
                const codeStr = l.accountingCode || "";
                if (codeStr.startsWith("4") && !l.isDebit) totalRevenue += l.amount;
                if ((codeStr.startsWith("5") || codeStr.startsWith("6")) && l.isDebit) totalOpex += l.amount;
                if (codeStr.startsWith("1") && l.isDebit) totalAssets += l.amount;
                if (codeStr.startsWith("2") && !l.isDebit) totalLiabilities += l.amount;

                return {
                  c: l.accountingCode, // c = code
                  p: l.particular, // p = particular
                  a: l.amount, // a = amount
                  d: l.isDebit // d = debit
                };
              });

              return {
                d: v.tradingDate ? v.tradingDate.toISOString().split("T")[0] : "N/A", // d = date
                n: v.note, // n = note
                l: lines // l = lines
              };
            });

            const cleanEsgs = esgRecords.map(r => ({
              date: r.tradingDate.toISOString().split("T")[0],
              activity: r.activityType,
              emissions: Number(r.emissions),
              unit: r.unit,
              scope: r.scope,
              vendor: r.vendor
            }));

            const cleanJournals = journalRecords.map(j => ({
              date: j.tradingDate.toISOString().split("T")[0],
              text: j.text,
              note: j.aiNote || undefined
            }));

            // Info: (20260421 - Tzuhan) 將結構化數據整合進 params.data，自然回寫到 History 並丟給 LLM
            const newPayloadData: Record<string, unknown> = typeof params.data === "object" && params.data !== null ? { ...params.data as Record<string, unknown> } : {};

            newPayloadData.summary = {
              total_revenue: totalRevenue,
              total_opex: totalOpex,
              total_assets: totalAssets,
              total_liabilities: totalLiabilities
            };

            if (cleanEsgs.length > 0) newPayloadData.esg = cleanEsgs;
            if (cleanVouchers.length > 0) newPayloadData.vouchers = cleanVouchers;
            if (cleanJournals.length > 0) newPayloadData.journals = cleanJournals;

            params.data = newPayloadData;

            // Info: (20260421 - Tzuhan) 檢查 DB data 欄位是否過量，如果真的超級巨大(>1MB)，為防 DB 爆掉可採取裁切，但先以輕量化屬性名處理
            const payloadSize = JSON.stringify(newPayloadData).length;
            console.log(`[ESG-DEBUG] New Payload Size after JSON Pruning: ${payloadSize} bytes`);

          } else {
            console.log(`[ESG-DEBUG] Records length is 0. Aborting internal analysis.`);
            throw new AppError(ApiCode.VALIDATION_ERROR, "該企業尚未建立 ESG 或財務數據紀錄。請先上傳相關資料，或是改為申請「外部分析報告」。");
          }
        }
      }

      missionDef = missionGenerator.generateMission({
        category: params.category,
        periodType: params.periodType,
        periodValue: params.periodValue,
        year: params.year,
        country: params.country,
        keyword: params.keyword,
        prerequisiteData: parsedPrerequisiteParams,
        data: params.data, // Info: (20260418 - Luphia) Pass through extraneous Payload
        orderId: params.orderId, // Info: (20260418 - Luphia) Pass through Order ID
        isExternal: params.isExternal, // Info: (20260418 - Luphia) Just in case it needs this too
      });

      // Info: (20260418 - Tzuhan) [BUGFIX] 如果 generator 根本不認識這個類別，或是生成的 tasks 是空的，絕對不允許進入資料庫建立幽靈 Mission
      if (!missionDef || !missionDef.tasks || missionDef.tasks.length === 0) {
        throw new AppError(ApiCode.VALIDATION_ERROR, `找不到有效的分析任務產生器 (Category: ${params.category}) 或是任務為空，拒絕建立幽靈定單。`);
      }

      analysisResult = "Analysis Mission Generated. Pending Execution.";
    } catch (error) {
      console.error("[AnalysisService] Mission Generation Failed:", error);
      if (error instanceof AppError) {
        throw error; // Info: (20260417 - Tzuhan) Let the caller (API route) abort the operation instantly
      }
      // Info: (20260418 - Tzuhan) [BUGFIX] 如果發生未知崩潰(例如 Payload 超過 Prisma 大小限制)，必須拋出異常，阻斷 API 回傳 200，讓前端顯示錯誤而不吞噬訂單！
      throw new AppError(ApiCode.INTERNAL_SERVER_ERROR, "發生非預期錯誤，報告生成失敗。您的訂單紀錄已保留，請稍後至後台重試。");
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

    let createdMissionId: string | undefined;

    if (params.orderId) {
      try {
        // Info: (20260327 - Tzuhan) Cache disabled for reports (Always generate fresh report)
        const result = await analysisRepo.create({
          reportId,
          userId,
          orderId: params.orderId,
          category: params.category,
          missionName: missionDef
            ? missionDef.name
            : `Analysis-${params.category}-${params.periodType}`,
          status: params.status || MISSION_STATUS.UPLOADING,
          missionData: {
            category: params.category,
            cost,
            remainingBalance: 9500,
            generatedAt: new Date().toISOString(),
            planHash: null,
            periodType: params.periodType,
            periodValue: params.periodValue,
            year: params.year,
            country: params.country,
            keyword: params.keyword,
            isExternal: params.isExternal === true,
            historicalTags: await analysisRepo.getGlobalTopTags(20),
            data: params.data ? (params.data as Prisma.InputJsonValue) : undefined,
          },
          tasks: missionDef ? missionDef.tasks : undefined,
        });
        createdMissionId = result.missionId || undefined;
      } catch (error) {
        console.error(`[AnalysisService] Failed to save report to DB:`, error);
        throw new Error("Failed to save report metadata");
      }
    }

    const planFile = new File([JSON.stringify(planContent)], "plan.json", {
      type: "application/json",
    });

    storageService
      .uploadLaria(planFile)
      .then(async (hash) => {
        console.log(
          `[Info: (20260304 - Tzuhan)] BACKGROUND Plan uploaded, hash: ${hash} for Mission ${createdMissionId}`,
        );
        if (createdMissionId) {
          try {
            await analysisRepo.updateMissionUploadSuccess(
              createdMissionId,
              hash,
            );
            console.log(
              `[Info: (20260304 - Tzuhan)] BACKGROUND Mission ${createdMissionId} updated with planHash and set to PENDING`,
            );
          } catch (e) {
            console.error(
              `[Info: (20260304 - Tzuhan)] BACKGROUND Failed to update mission with planHash:`,
              e,
            );
          }
        }
      })
      .catch(async (error) => {
        console.error(
          `[Info: (20260304 - Tzuhan)] BACKGROUND Failed to upload plan:`,
          error,
        );
        if (createdMissionId) {
          try {
            await analysisRepo.updateMissionUploadFailed(
              createdMissionId,
              "File Upload Failed. Please contact support.",
            );
            console.log(
              `[Info: (20260304 - Tzuhan)] BACKGROUND Mission ${createdMissionId} marked as FAILED due to upload error`,
            );
          } catch (e) {
            console.error(
              `[Info: (20260304 - Tzuhan)] BACKGROUND Failed to mark mission as FAILED:`,
              e,
            );
          }
        }
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
        periodType: params.periodType,
        periodValue: params.periodValue,
        year: params.year,
      },
    };
  }
}

export const analysisService = new AnalysisService();
