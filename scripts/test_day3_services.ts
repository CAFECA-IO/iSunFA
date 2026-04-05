import path from "node:path";

// Info: (20260402 - Tzuhan) 匯入我們在 Day 3 打造的三個 Service 模組
import { downloadFinancialReport } from "@/services/financial_report.download.service";
import { downloadEsgReport } from "@/services/esg_report.download.service";
import { downloadEsgMetrics } from "@/services/esg_metrics.download.service";

async function runTest() {
  // Info: (20260402 - Tzuhan) 測試目標設定 (此處以亞洲藏壽司 2926 作為靶機)
  const stockId = "2926";
  const marketType = "sii";
  const year = 2024;

  // Info: (20260402 - Tzuhan) 建立一個專屬的測試輸出資料夾
  const outputDir = path.join(process.cwd(), "downloads", "test_run", stockId);
  console.log(`🚀 開始小範圍驗證 Day 3 核心模組`);
  console.log(`🎯 測試目標: ${stockId} (${year}年)`);
  console.log(`📂 輸出目錄: ${outputDir}\n`);

  // ==========================================
  // Info: (20260402 - Tzuhan) 測試 1: 財務年報下載 Service
  // ==========================================
  const finPath = path.join(outputDir, `${year}_FIN_REPORT.pdf`);
  console.log(`⏳ [測試 1] 正在下載財務年報...`);
  const finResult = await downloadFinancialReport(stockId, year, finPath);
  console.log(
    `   👉 結果: ${finResult ? `✅ 成功 (已存至 ${path.basename(finPath)})` : "❌ 失敗"}\n`,
  );

  // ==========================================
  // Info: (20260402 - Tzuhan) 測試 2: ESG 永續報告書下載 Service
  // ==========================================
  const esgPdfPath = path.join(outputDir, `${year}_ESG_REPORT.pdf`);
  console.log(`⏳ [測試 2] 正在下載 ESG 永續報告書...`);
  const esgPdfResult = await downloadEsgReport(
    stockId,
    marketType,
    year,
    esgPdfPath,
  );
  console.log(
    `   👉 結果: ${esgPdfResult ? `✅ 成功 (已存至 ${path.basename(esgPdfPath)})` : "❌ 失敗"}\n`,
  );

  // ==========================================
  // Info: (20260402 - Tzuhan) 測試 3: ESG 數據指標下載 Service
  // ==========================================
  const esgMetricsPath = path.join(outputDir, `${year}_ESG_METRICS.json`);
  console.log(`⏳ [測試 3] 正在下載 ESG 數據指標 (JSON 原檔)...`);
  const esgMetricsResult = await downloadEsgMetrics(
    stockId,
    year,
    esgMetricsPath,
  );
  console.log(
    `   👉 結果: ${esgMetricsResult ? `✅ 成功 (已存至 ${path.basename(esgMetricsPath)})` : "❌ 失敗"}\n`,
  );

  // ==========================================
  // Info: (20260402 - Tzuhan) 驗證總結
  // ==========================================
  if (finResult && esgPdfResult && esgMetricsResult) {
    console.log(`🎉 測試通過！三個 Service 皆可獨立且正常運作。`);
    console.log(`👉 在 ${outputDir} 檢查這 3 個實體檔案。`);
  } else {
    console.log(`⚠️ 測試完成，但有部分 Service 執行失敗，請往上查看錯誤日誌。`);
  }
}

runTest().catch(console.error);
