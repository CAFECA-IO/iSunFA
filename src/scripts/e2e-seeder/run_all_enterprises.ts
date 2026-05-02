import * as fs from "fs";
import * as path from "path";
import { runPipeline } from "@/scripts/e2e-seeder/run_pipeline";

export const runScaleTest = async () => {
  console.log(`\n======================================================`);
  console.log(`🏢 [ENTERPRISE SCALING] Batch E2E Seeder Initialization`);
  console.log(`======================================================\n`);

  const dataDir = path.resolve(process.cwd(), "data");

  if (!fs.existsSync(dataDir)) {
    console.error(`[FATAL] data directory not found.`);
    process.exit(1);
  }

  // Find all subdirectories in data/
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

  for (const stockId of stockIds) {
    console.log(`\n------------------------------------------------------`);
    console.log(`>>> Processing Enterprise: ${stockId} <<<`);
    console.log(`------------------------------------------------------`);

    // Quick validation before running
    const finDataPath = path.join(dataDir, stockId, "2024_FIN_DATA.json");
    const esgDataPath = path.join(dataDir, stockId, "2024_ESG_METRICS.json");

    if (!fs.existsSync(finDataPath) || !fs.existsSync(esgDataPath)) {
      console.warn(
        `[WARN] Skipping ${stockId} due to missing FIN/ESG JSON data sources.`,
      );
      results[stockId] = "SKIPPED (Missing Data)";
      continue;
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
  }

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

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScaleTest().catch((err) => {
    console.error("Batch execution failed:", err);
    process.exit(1);
  });
}
