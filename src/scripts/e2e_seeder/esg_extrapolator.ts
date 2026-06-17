import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { IExtractedContextCache } from "@/scripts/e2e_seeder/ai_vision_extractor";

config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("FATAL: GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

export interface IEsgExtrapolation {
  macroTrends: string;
  predictedRevenueGrowth: string;
  greenEnergyShift: string;
  scope1EmissionsExtrapolated: string;
  scope2EmissionsExtrapolated: string;
}

export const extrapolateEsg = async (
  stockId: string,
  targetYear: string = "2024",
): Promise<IEsgExtrapolation | null> => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${targetYear}`);
  const cachePath = path.join(
    dataDir,
    "outputs",
    "ai_extracted_context_cache.json",
  );
  const extrapolationPath = path.join(
    dataDir,
    "outputs",
    "esg_extrapolation.json",
  );
  const esgPdfPath = path.join(
    dataDir,
    "inputs",
    "raw_reports",
    `${targetYear}_ESG_REPORT.pdf`,
  );

  // Info: (20260611 - Tzuhan) 如果有真實的 ESG 報告，不需要推估
  if (fs.existsSync(esgPdfPath)) {
    console.log(
      `[INFO] ESG Report exists for ${targetYear}. No extrapolation needed.`,
    );
    return null;
  }

  if (fs.existsSync(extrapolationPath)) {
    console.log(
      `[INFO] ESG Extrapolation found for ${stockId} (${targetYear}). Skipping API call.`,
    );
    const rawCache = fs.readFileSync(extrapolationPath, "utf-8");
    return JSON.parse(rawCache) as IEsgExtrapolation;
  }

  if (!fs.existsSync(cachePath)) {
    console.warn(
      `[WARN] ai_extracted_context_cache.json not found for ${stockId}. Please run ai_vision_extractor first.`,
    );
    return null;
  }

  const extractedContext = JSON.parse(
    fs.readFileSync(cachePath, "utf-8"),
  ) as IExtractedContextCache;

  console.log(
    `[INFO] Extrapolating ESG data for ${stockId} to ${targetYear}...`,
  );

  const prompt = `
    You are an elite Macroeconomic Forecaster and Sustainability Expert.
    You are given the historical baseline data for a company. The data was extracted from their previous financial and ESG reports.
    
    Here is the historical baseline:
    ${JSON.stringify(extractedContext.historicalBaseline, null, 2)}
    
    Here is their supply chain intelligence:
    ${JSON.stringify(extractedContext.supplyChainIntelligence, null, 2)}
    
    CRITICAL INSTRUCTION: The target simulation year is ${targetYear}. You MUST perform a Cross-Year Baseline Extrapolation. Analyze the historical baselines, then logically project how macroeconomic trends (e.g., CBAM, global EV market, interest rates, geopolitics) will impact their ${targetYear} revenue and carbon emissions (specifically their green energy adoption rate).
    
    Return ONLY a valid JSON object matching this schema exactly:
    {
      "macroTrends": "A detailed paragraph forecasting the macroeconomic and industry challenges heading into ${targetYear}.",
      "predictedRevenueGrowth": "Logical deduction of revenue growth/decline % for ${targetYear} with rationale based on the extracted baseline.",
      "greenEnergyShift": "How will their Scope 2 emissions and green power purchasing behavior change in ${targetYear} due to regulations like CBAM?",
      "scope1EmissionsExtrapolated": "Estimated exact Scope 1 emissions for ${targetYear} based on the baseline and growth logic (e.g. '12,500 tCO2e')",
      "scope2EmissionsExtrapolated": "Estimated exact Scope 2 emissions for ${targetYear} considering green energy shift (e.g. '40,000 tCO2e')"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanJsonString = responseText
      .replace(/^\s*`{3}(?:json)?\s*/i, "")
      .replace(/\s*`{3}\s*$/, "");
    const parsedData = JSON.parse(cleanJsonString) as IEsgExtrapolation;

    fs.mkdirSync(path.dirname(extrapolationPath), { recursive: true });
    fs.writeFileSync(
      extrapolationPath,
      JSON.stringify(parsedData, null, 2),
      "utf-8",
    );
    console.log(`[SUCCESS] Extrapolated ESG data for ${stockId}.`);

    return parsedData;
  } catch (error) {
    console.error(
      `[FATAL] Failed to extrapolate ESG data for ${stockId}.`,
      error,
    );
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  const targetYear = process.argv[3] || "2024";
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx esg_extrapolator.ts 1538 [year]",
    );
    process.exit(1);
  }
  extrapolateEsg(targetStock, targetYear)
    .then((res) => {
      if (res) console.log(JSON.stringify(res, null, 2));
    })
    .catch(console.error);
}
