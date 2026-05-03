import * as fs from "fs";
import * as path from "path";
import { runPipeline } from "@/scripts/e2e-seeder/run_pipeline";
import pLimit from "p-limit";

export const runScaleTest = async () => {
  console.log(`\n======================================================`);
  console.log(`🏢 [ENTERPRISE SCALING] Batch E2E Seeder Initialization`);
  console.log(`======================================================\n`);

  const dataDir = path.resolve(process.cwd(), "data");

  if (!fs.existsSync(dataDir)) {
    console.error(`[FATAL] data directory not found.`);
    process.exit(1);
  }

  // Info: (20260502 - Tzuhan) 尋找 data/ 底下的所有子目錄
  const items = fs.readdirSync(dataDir, { withFileTypes: true });
  const stockIds = items
    .filter((item) => item.isDirectory() && /^\d+$/.test(item.name))
    .map((item) => item.name);

  if (stockIds.length === 0) {
    console.log(`[INFO] No valid enterprise data folders found in data/.`);
    return;
  }

  console.log(
    `Found ${stockIds.length} enterprise(s) for processing: ${stockIds.join(", ")}`,
  );

  const results: Record<string, string> = {};

  // Info: (20260503 - Tzuhan) 設定併發上限為 1 (嚴格序列化)，以避免過度請求導致 AI API 封鎖
  const limit = pLimit(1);

  const tasks = stockIds.map((stockId) => limit(async () => {
    console.log(`\n------------------------------------------------------`);
    console.log(`>>> Processing Enterprise: ${stockId} <<<`);
    console.log(`------------------------------------------------------`);

    // Info: (20260502 - Tzuhan) 執行前進行快速驗證
    const finDataPath = path.join(dataDir, stockId, "2024_FIN_DATA.json");
    const esgDataPath = path.join(dataDir, stockId, "2024_ESG_METRICS.json");

    if (!fs.existsSync(finDataPath) || !fs.existsSync(esgDataPath)) {
      console.warn(
        `[WARN] Skipping ${stockId} due to missing FIN/ESG JSON data sources.`,
      );
      results[stockId] = "SKIPPED (Missing Data)";
      return;
    }

    try {
      await runPipeline(stockId);
      results[stockId] = "PASSED";
    } catch {
      console.error(
        `[ERROR] Enterprise ${stockId} failed during pipeline execution.`,
      );
      results[stockId] = "FAILED";
    }
  }));

  await Promise.all(tasks);

  console.log(`\n======================================================`);
  console.log(`📈 [ENTERPRISE SCALING] Batch Summary`);
  console.log(`======================================================`);
  Object.entries(results).forEach(([id, status]) => {
    const icon =
      status === "PASSED" ? "✅" : status.includes("SKIPPED") ? "⏭️" : "❌";
    console.log(`${icon} Enterprise ${id}: ${status}`);
  });
  console.log(`======================================================\n`);
};

// Info: (20260502 - Tzuhan) 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  runScaleTest().catch((err) => {
    console.error("Batch execution failed:", err);
    process.exit(1);
  });
}
