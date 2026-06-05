import { extractContextFromPdf } from "@/scripts/e2e-seeder/ai_vision_extractor";
import { generateFinancialVouchers } from "@/scripts/e2e-seeder/financial_reverse_engineer";
import { generateEsgRecords } from "@/scripts/e2e-seeder/esg_reverse_engineer";
import { generateReceiptImages } from "@/scripts/e2e-seeder/receipt_image_generator";
import { runPhase2ReceiptAnalysis } from "@/scripts/e2e-seeder/phase2_runner";
import { runCrossValidation } from "@/scripts/e2e-seeder/cross_validator";

export const runPipeline = async (
  stockId: string,
  year: string = "2024",
  shouldClean: boolean = false,
  skipImages: boolean = false,
) => {
  console.log(
    `\n🚀 [START] Running Full E2E Seeder Pipeline for Stock ID: ${stockId} (Year: ${year})`,
  );

  try {
    console.log(`\n[1/6] Running AI Vision Extractor for ${year}...`);
    await extractContextFromPdf(stockId, year);

    console.log("\n[2/6] Running Financial Reverse Engineer...");
    generateFinancialVouchers(stockId);

    console.log("\n[3/6] Running ESG Reverse Engineer...");
    generateEsgRecords(stockId);

    if (!skipImages) {
      console.log("\n[4/6] Running Receipt Image Generator...");
      await generateReceiptImages(stockId);
    } else {
      console.log(
        "\n[4/6] ⏭️ Skipping Receipt Image Generator (--skip-images)...",
      );
    }

    console.log("\n[5/6] Running Phase 2 Receipt Analysis (AI Extraction)...");
    await runPhase2ReceiptAnalysis(stockId, shouldClean);

    console.log("\n[6/6] Running Enterprise Cross Validator...");
    await runCrossValidation(stockId);

    console.log(`\n✅ [DONE] Pipeline successfully completed for ${stockId}!`);
    console.log(`Check the output in: data/${stockId}/`);
  } catch (error) {
    console.error(
      `\n❌ [PIPELINE FAILED] The pipeline was halted for ${stockId} due to an error:`,
      error,
    );
    throw error;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  const shouldClean = process.argv.includes("--clean");
  const skipImages = process.argv.includes("--skip-images");
  
  let targetYear = "2024";
  const yearArg = process.argv.find((a) => a.startsWith("--year="));
  if (yearArg) {
    targetYear = yearArg.split("=")[1];
  }

  if (!targetStock || targetStock.startsWith("--")) {
    console.error(
      "Please provide a stock ID. Usage: tsx run_pipeline.ts <stockId> [--clean] [--skip-images] [--year=2025]",
    );
    process.exit(1);
  }
  runPipeline(targetStock, targetYear, shouldClean, skipImages).catch(() =>
    process.exit(1),
  );
}
