import { extractContextFromPdf } from "@/scripts/e2e-seeder/ai_vision_extractor";
import { generateFinancialVouchers } from "@/scripts/e2e-seeder/financial_reverse_engineer";
import { generateEsgRecords } from "@/scripts/e2e-seeder/esg_reverse_engineer";
import { generateReceiptImages } from "@/scripts/e2e-seeder/receipt_image_generator";
import { runCrossValidation } from "@/scripts/e2e-seeder/cross_validator";

const runPipeline = async (stockId: string) => {
  console.log(
    `\n🚀 [START] Running Full E2E Seeder Pipeline for Stock ID: ${stockId}`,
  );

  try {
    console.log("\n[1/5] Running AI Vision Extractor...");
    await extractContextFromPdf(stockId);

    console.log("\n[2/5] Running Financial Reverse Engineer...");
    generateFinancialVouchers(stockId);

    console.log("\n[3/5] Running ESG Reverse Engineer...");
    generateEsgRecords(stockId);

    console.log("\n[4/5] Running Receipt Image Generator...");
    generateReceiptImages(stockId);

    console.log("\n[5/5] Running Enterprise Cross Validator...");
    runCrossValidation(stockId);

    console.log(`\n✅ [DONE] Pipeline successfully completed for ${stockId}!`);
    console.log(`Check the output in: data/${stockId}/`);
  } catch (error) {
    console.error(
      `\n❌ [PIPELINE FAILED] The pipeline was halted due to an error:`,
      error,
    );
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx run_pipeline.ts <stockId>",
    );
    process.exit(1);
  }
  runPipeline(targetStock);
}
