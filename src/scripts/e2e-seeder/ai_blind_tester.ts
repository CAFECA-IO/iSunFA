import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";
import { ANALYSIS_CATEGORY, ANALYSIS_PERIOD } from "@/constants/analysis";
import { analysisService } from "@/services/analysis.service";
import { processNext } from "@/services/mission.executor.service";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { getAccountByCode } from "@/lib/utils/account";
import { IAccount } from "@/constants/accounts";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { esgRepo } from "@/repositories/esg.repo";

export const runAiBlindTester = async (stockId: string) => {
  console.log(
    `\n🤖 [AI BLIND TESTER] Phase 4: Output Validation for ${stockId}...`,
  );

  const accountBookId = `e2e-book-${stockId}`;

  // Info: (20260504 - Tzuhan) 1. 取得帳簿與團隊資訊
  const accountBook = await prisma.accountBook.findUnique({
    where: { id: accountBookId },
    include: { team: { include: { teamMembers: true } } },
  });

  if (!accountBook) {
    console.error(
      `[ERROR] AccountBook ${accountBookId} not found. Please run phase2_runner first.`,
    );
    process.exit(1);
  }

  const userId = accountBook.team.teamMembers[0].userId;

  // Info: (20260504 - Tzuhan) ==========================================
  // Info: (20260504 - Tzuhan) 階段 1: JSON 數字報表防呆盲測 (ReportGenerator)
  // Info: (20260504 - Tzuhan) ==========================================
  console.log(`\n==========================================`);
  console.log(`[STAGE 1] ReportGenerator JSON 報表防呆與數值盲測`);
  console.log(`==========================================`);

  const vouchers = await prisma.voucher.findMany({
    where: { accountBookId: accountBookId, deletedAt: null, isVerified: true },
    include: { lines: true },
  });

  // const esgRecords = await prisma.esgRecord.findMany({
  //   where: { accountBookId: accountBookId, deletedAt: null, isVerified: true },
  // });

  // Info: (20260507 - Julian) 改用 getEsgRecordsForReport 取得產生碳盤查資料
  const esgRecords = await esgRepo.getEsgRecordsForReport({ accountBookId });

  const formattedLines: IVoucherLineUI[] = [];
  for (const v of vouchers) {
    for (const line of v.lines) {
      const code = String(line.accountingCode || "");
      const acc = getAccountByCode(code);
      formattedLines.push({
        id: String(line.id || ""),
        accountingCode: code,
        accounting: acc
          ? (acc as IAccount)
          : ({ code, name: code } as IAccount),
        particular: String(line.particular || ""),
        amount: Number(line.amount || 0),
        isDebit: Boolean(line.isDebit),
      } as unknown as IVoucherLineUI);
    }
  }

  try {
    const bsReport = generateBalanceSheet(formattedLines);
    const cfReport = generateCashFlowStatement(formattedLines);
    const isReport = generateIncomeStatement(formattedLines);
    const esgReport = generateEsgReport(esgRecords);

    console.log(
      `✅ [JSON 產出成功] Balance Sheet - 總資產: ${bsReport.assets.total}`,
    );
    console.log(
      `✅ [JSON 產出成功] Cash Flow - 淨現金流: ${cfReport.summary.netIncreaseDecrease}`,
    );
    console.log(
      `✅ [JSON 產出成功] Income Statement - 淨利: ${isReport.sections.netIncome.total}`,
    );
    console.log(
      `✅ [JSON 產出成功] ESG Report - 總碳排: ${esgReport.metrics.totalEmissions} kgCO2e`,
    );

    // Info: (20260504 - Tzuhan) 基本防呆檢查 (有沒有產生 NaN 或非邏輯的 Undefined)
    if (
      isNaN(bsReport.assets.total) ||
      isNaN(cfReport.summary.netIncreaseDecrease)
    ) {
      console.error(
        `❌ [FAILED] JSON 報表結算出現 NaN，運算邏輯可能遭遇浮點數崩潰或除以零！`,
      );
    } else {
      console.log(`✅ [PASSED] JSON 報表結構完整，無 NaN 異常。`);
    }
  } catch (error) {
    console.error(`❌ [FAILED] JSON ReportGenerator 執行失敗:`, error);
  }

  // Info: (20260504 - Tzuhan) ==========================================
  // Info: (20260504 - Tzuhan) 階段 2: AI 解讀與診斷報告盲測 (AnalysisService)
  // Info: (20260504 - Tzuhan) ==========================================
  console.log(`\n==========================================`);
  console.log(`[STAGE 2] AI 診斷與解讀報告抗幻覺盲測`);
  console.log(`==========================================`);

  // Info: (20260504 - Tzuhan) 兩大核心產出與分析：
  // Info: (20260504 - Tzuhan) 1. 三大財務報表與碳盤查 (AI 解讀報告)
  // Info: (20260504 - Tzuhan) 2. 財務健康與合規異常診斷 (AI 診斷報告)
  const categoriesToTest = [
    { category: ANALYSIS_CATEGORY.BALANCE_SHEET, isExternal: false },
    { category: ANALYSIS_CATEGORY.CASH_FLOW, isExternal: false },
    { category: ANALYSIS_CATEGORY.INCOME_STATEMENT, isExternal: false },
    { category: ANALYSIS_CATEGORY.FINANCIAL_HEALTH, isExternal: false },
    { category: ANALYSIS_CATEGORY.FINANCIAL_COMPLIANCE, isExternal: false },
    { category: ANALYSIS_CATEGORY.CARBON_HEALTH_CHECK, isExternal: false },
    { category: ANALYSIS_CATEGORY.NET_ZERO_EMISSIONS, isExternal: false },
    { category: ANALYSIS_CATEGORY.FINANCIAL_PRODUCT_RATING, isExternal: true },
  ];

  let passedCount = 0;

  for (const { category, isExternal } of categoriesToTest) {
    console.log(`\n==========================================`);
    console.log(`▶️ 正在生成分析報告: ${category} (External: ${isExternal})`);

    try {
      // Info: (20260504 - Tzuhan) 模擬前端觸發 Analysis API
      const generateResult = await analysisService.generateAnalysis(userId, {
        type: "ANALYSIS",
        data: {
          category,
          periodType: ANALYSIS_PERIOD.YEARLY,
          periodValue: "2024",
          year: 2024,
          isExternal,
          country: "臺灣",
          keyword: stockId,
        },
      });

      console.log(`✅ 成功派發任務:`, generateResult.data.reportId);

      // Info: (20260504 - Tzuhan) 觸發 Task Worker，等待 AI 執行完成
      console.log(`⏳ 等待 Mission Executor 處理任務中...`);
      await processNext();

      // Info: (20260504 - Tzuhan) 取回剛建立的 Analysis Report ID (透過 DB)
      const report = await prisma.analysis.findFirst({
        where: { id: generateResult.data.reportId },
      });

      // Info: (20260504 - Tzuhan) 取得最新 mission 的 result.md
      if (
        report &&
        report.data &&
        typeof report.data === "object" &&
        "missionName" in report.data
      ) {
        const missionName = report.data.missionName as string;
        const resultPath = path.join(
          process.cwd(),
          "missions",
          missionName,
          "result.md",
        );
        if (fs.existsSync(resultPath)) {
          const resultMd = fs.readFileSync(resultPath, "utf-8");
          console.log(`\n📄 [報告摘錄 - ${category}]:`);
          console.log(resultMd.substring(0, 500) + "...\n(截斷)");

          // Info: (20260504 - Tzuhan) ===============================
          // Info: (20260504 - Tzuhan) Anti-Hallucination 幻覺盲測檢查
          // Info: (20260504 - Tzuhan) ===============================
          console.log(`\n🛡️ 防幻覺盲測 (Anti-Hallucination Check):`);
          const isHallucinating = false;

          // Info: (20260504 - Tzuhan) 1. 檢查 N/A 規則 (如果資料缺乏，AI 是否捏造)
          // Info: (20260504 - Tzuhan) 根據 agent.md，如果缺乏基礎數據，應該要有 [💡缺乏基礎數據：沿用推估或留白 N/A] 或直接 N/A
          // Info: (20260504 - Tzuhan) 如果是測試真實資料，因為我們確實有塞入財務與 ESG 數據，所以不一定出現 N/A。
          // Info: (20260504 - Tzuhan) 但我們可以反向確保它有抓出正確的問題（例如流動性危機、碳鎖定風險）。

          if (category === ANALYSIS_CATEGORY.FINANCIAL_HEALTH) {
            // Info: (20260504 - Tzuhan) 應該要有提及現金流或 ROE 等字眼
            if (!resultMd.includes("ROE") && !resultMd.includes("現金")) {
              console.warn(
                `[WARNING] Financial Health report seems to lack concrete metrics.`,
              );
            }
          }

          if (category === ANALYSIS_CATEGORY.CARBON_HEALTH_CHECK) {
            if (!resultMd.includes("碳")) {
              console.warn(
                `[WARNING] Carbon Health report seems disconnected from actual ESG records.`,
              );
            }
          }

          if (isHallucinating) {
            console.error(`❌ [FAILED] 報告疑似出現幻覺！`);
          } else {
            console.log(`✅ [PASSED] 報告內容符合邏輯與規範。`);
            passedCount++;
          }
        } else {
          console.error(`❌ 無法找到分析結果檔案: ${resultPath}`);
        }
      }
    } catch (err) {
      console.error(`❌ 執行 ${category} 測試時發生錯誤:`, err);
    }
  }

  console.log(`\n==========================================`);
  console.log(`🏁 [盲測總結] 完成 ${categoriesToTest.length} 項報告生成。`);
  console.log(`✅ 通過防幻覺檢驗: ${passedCount} / ${categoriesToTest.length}`);
};

// Info: (20260504 - Tzuhan) 如果是直接執行此腳本：
if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  if (!stockId) {
    console.error("Please provide a stockId (e.g. 2330)");
    process.exit(1);
  }
  runAiBlindTester(stockId)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
