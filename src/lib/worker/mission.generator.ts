import {
  IMissionParams,
  IMissionDefinition,
} from "@/lib/worker/mission.interface";
import { generateIrscMission } from "@/lib/worker/mission_generators/irsc.generator";
import { generateDocumentParsingMission } from "@/lib/worker/mission_generators/document.generator";
import { generateJournalCorrectionMission } from "@/lib/worker/mission_generators/journal_correction.generator";
import { generateAiConsultingMission } from "@/lib/worker/mission_generators/ai_consulting.generator";
import { generateMission as generateMarketTrends } from "@/lib/worker/mission_generators/market_trends.generator";
import { generateMission as generateIndustryDevelopment } from "@/lib/worker/mission_generators/industry_development.generator";
import { generateMission as generateFinancialProductRating } from "@/lib/worker/mission_generators/financial_product_rating.generator";
import { generateMission as generateCarbonHealthCheck } from "@/lib/worker/mission_generators/carbon_health_check.generator";
import { generateMission as generateNetZeroEmissions } from "@/lib/worker/mission_generators/net_zero_emissions.generator";
import { generateMission as generateBalanceSheet } from "@/lib/worker/mission_generators/balance_sheet.generator";
import { generateMission as generateCashFlow } from "@/lib/worker/mission_generators/cash_flow.generator";
import { generateMission as generateIncomeStatement } from "@/lib/worker/mission_generators/income_statement.generator";
import { generateMission as generateFinancialCompliance } from "@/lib/worker/mission_generators/financial_compliance.generator";
import { generateMission as generateFinancialHealth } from "@/lib/worker/mission_generators/financial_health.generator";
import { generateCertificateAnalysisMission } from "@/lib/worker/mission_generators/certificate_analysis.generator";

export * from "@/lib/worker/mission.interface";

// Info: (20260406 - Luphia) Type alias for our generator signature
export type MissionGeneratorFn = (
  params: IMissionParams,
) => IMissionDefinition | null;

const GENERATOR_MAP: Record<string, MissionGeneratorFn> = {
  // Info: (20260406 - Luphia) Special independent generators
  irsc: generateIrscMission,
  document_parsing: generateDocumentParsingMission,
  journal_correction: generateJournalCorrectionMission,
  ai_consulting: generateAiConsultingMission,
  certificate_analysis: generateCertificateAnalysisMission,

  // Info: (20260406 - Luphia) External generators
  market_trends: generateMarketTrends,
  industry_development: generateIndustryDevelopment,
  financial_product_rating: generateFinancialProductRating,
  carbon_health_check: generateCarbonHealthCheck,
  net_zero_emissions: generateNetZeroEmissions,

  // Info: (20260406 - Luphia) Internal generators
  balance_sheet: generateBalanceSheet,
  cash_flow: generateCashFlow,
  income_statement: generateIncomeStatement,
  financial_compliance: generateFinancialCompliance,
  financial_health: generateFinancialHealth,
};

export class MissionGenerator {
  generateMission(params: IMissionParams): IMissionDefinition | null {
    if (!params.category) return null;
    
    const generatorFn = GENERATOR_MAP[params.category.toLowerCase()];
    if (generatorFn) {
      return generatorFn(params);
    }

    console.warn(
      `[MissionGenerator] No generator found for category: ${params.category}`,
    );
    return null;
  }
}

export const missionGenerator = new MissionGenerator();
