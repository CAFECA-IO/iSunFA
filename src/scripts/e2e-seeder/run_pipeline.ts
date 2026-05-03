import { extractContextFromPdf } from "@/scripts/e2e-seeder/ai_vision_extractor";
import { generateFinancialVouchers } from "@/scripts/e2e-seeder/financial_reverse_engineer";
import { generateEsgRecords } from "@/scripts/e2e-seeder/esg_reverse_engineer";
import { generateReceiptImages } from "@/scripts/e2e-seeder/receipt_image_generator";
import { runPhase2ReceiptAnalysis } from "@/scripts/e2e-seeder/phase2_runner";
import { runCrossValidation } from "@/scripts/e2e-seeder/cross_validator";

export const runPipeline = async (stockId: string) => {
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

    console.log("\n[4/6] Running Receipt Image Generator...");
    generateReceiptImages(stockId);

    console.log("\n[5/6] Running Phase 2 Receipt Analysis (AI Extraction)...");
    await runPhase2ReceiptAnalysis(stockId);

    console.log("\n[6/6] Running Enterprise Cross Validator...");
    await runCrossValidation(stockId);

    console.log(`\n[7/7] Generating Internal Analysis Reports for ${stockId}...`);
    const { prisma } = await import("@/lib/prisma");
    const { analysisService } = await import("@/services/analysis.service");
    
    // Info: (20260503 - Tzuhan) Find the designated E2E test user
    const user = await prisma.user.findFirst({
      where: { email: { contains: "e2e" } }, // Fallback to any user if needed, but phase2_runner usually uses an e2e user or admin
      orderBy: { createdAt: "asc" }
    }) || await prisma.user.findFirst();

    if (user) {
      const { ANALYSIS_CATEGORY, PERIOD_TYPE } = await import("@/constants/analysis");
      
      await analysisService.generateAnalysis({
        category: ANALYSIS_CATEGORY.FINANCIAL_HEALTH,
        periodType: PERIOD_TYPE.YEARLY,
        periodValue: 1,
        year: 2024,
        keyword: `(${stockId})`, // Must contain the stockId in parentheses for regex matching in analysis.service.ts
        isExternal: false,
      }, user.id);
      
      await analysisService.generateAnalysis({
        category: ANALYSIS_CATEGORY.CARBON_HEALTH_CHECK,
        periodType: PERIOD_TYPE.YEARLY,
        periodValue: 1,
        year: 2024,
        keyword: `(${stockId})`,
        isExternal: false,
      }, user.id);
      console.log(`[SUCCESS] Queued Financial Health & Carbon Health Check reports.`);
    }

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
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx run_pipeline.ts <stockId>",
    );
    process.exit(1);
  }
  runPipeline(targetStock).catch(() => process.exit(1));
}
