import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables
config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("FATAL: GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// Using gemini-2.5-flash since it supports large text data and advanced reasoning
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

export interface IExtractedContextCache {
  financial: {
    travelExpenseRatio: number; // 0.0 ~ 1.0
    utilitiesRatio: number; // 0.0 ~ 1.0
    top3Vendors: string[];
    depreciationStrategy: string;
  };
  esg: {
    scope1MajorSource: string;
    scope2MajorSource: string;
    hasGreenEnergyPurchases: boolean;
  };
  simulatedNoise: {
    suggestedNoiseLevel: "low" | "medium" | "high";
    commonMissingFields: string[];
  };
}



export const extractContextFromPdf = async (
  stockId: string,
): Promise<IExtractedContextCache | null> => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const cachePath = path.join(dataDir, "ai_extracted_context_cache.json");

  // Principle: Database Idempotency & Data Retention
  // If cache exists, return it immediately to save API costs and ensure reproducibility.
  if (fs.existsSync(cachePath)) {
    console.log(`[INFO] Cache found for ${stockId}. Skipping API call.`);
    const rawCache = fs.readFileSync(cachePath, "utf-8");
    return JSON.parse(rawCache) as IExtractedContextCache;
  }

  const finPdfPath = path.join(dataDir, "2024_FIN_REPORT.pdf");
  const esgPdfPath = path.join(dataDir, "2024_ESG_REPORT.pdf");

  if (!fs.existsSync(finPdfPath) || !fs.existsSync(esgPdfPath)) {
    console.warn(`[WARN] PDFs not found for ${stockId}. Returning null.`);
    return null;
  }

  console.log(`[INFO] Analyzing PDFs for ${stockId} via Gemini Vision API...`);

  try {
    console.log(
      `⏳ [${stockId}] Extracting text from PDFs locally to avoid VPN timeouts...`,
    );
    const { PDFParse } = require("pdf-parse");

    const finBuffer = fs.readFileSync(finPdfPath);
    const finParser = new PDFParse({ data: finBuffer });
    const finData = await finParser.getText({ first: 1, last: 15 });
    const finText = finData.text.substring(0, 30000);
    await finParser.destroy();

    const esgBuffer = fs.readFileSync(esgPdfPath);
    const esgParser = new PDFParse({ data: esgBuffer });
    const esgData = await esgParser.getText({ first: 1, last: 15 });
    const esgText = esgData.text.substring(0, 30000);
    await esgParser.destroy();

    const prompt = `
      You are an expert Certified Public Accountant (CPA) and ESG Auditor.
      I have provided the Annual Financial Report and ESG Report for a specific company.
      Your task is to analyze these PDFs and extract real-world operational nuances that will be used to simulate granular accounting vouchers.
      
      Please extract the following information and return ONLY a valid JSON object matching this schema exactly:
      {
        "financial": {
          "travelExpenseRatio": 0.05, // Estimate the ratio of travel expenses to total operating expenses. (0.0 to 1.0)
          "utilitiesRatio": 0.08, // Estimate the ratio of utilities/electricity to total operating expenses.
          "top3Vendors": ["Vendor A", "Vendor B", "Vendor C"], // Identify or logically deduce 3 major suppliers/vendors.
          "depreciationStrategy": "straight-line" // Briefly state their main depreciation method.
        },
        "esg": {
          "scope1MajorSource": "Stationary combustion from factory boilers", // Detail the main source of Scope 1 emissions.
          "scope2MajorSource": "Purchased electricity from Taipower", // Detail the main source of Scope 2.
          "hasGreenEnergyPurchases": false // True if they mention buying Renewable Energy Certificates (RECs) or green power.
        },
        "simulatedNoise": {
          "suggestedNoiseLevel": "medium", // Based on the company's industry, suggest how messy their raw receipts might be (low/medium/high).
          "commonMissingFields": ["tax_id", "item_name"] // Suggest fields that might typically be missing or blurry on their receipts.
        }
      }
    `;

    const finalPrompt = `
${prompt}

【FIN REPORT 財報摘錄】:
${finText}

【ESG REPORT 報告摘錄】:
${esgText}
    `;

    console.log(`🚀 [${stockId}] Sending text payload to Gemini API...`);
    const result = await model.generateContent([finalPrompt]);
    const responseText = result.response.text();

    // Parse the JSON (Gemini in JSON mode usually returns pure JSON without markdown blocks, but we clean it just in case)
    const cleanJsonString = responseText
      .replace(/^\\s*\\x60{3}(?:json)?\\s*/i, "")
      .replace(/\\s*\\x60{3}\\s*$/, "");
    const parsedData = JSON.parse(cleanJsonString) as IExtractedContextCache;

    // Cache the result
    fs.writeFileSync(cachePath, JSON.stringify(parsedData, null, 2), "utf-8");
    console.log(`[SUCCESS] Extracted and cached data for ${stockId}.`);

    return parsedData;
  } catch (error) {
    console.error(
      `[FATAL] Failed to extract data for ${stockId} from Gemini API.`,
    );
    console.error(
      "This is likely due to a network timeout or VPN restriction when uploading large PDFs to the AI model.",
    );
    console.error(
      "-> PLEASE CHECK YOUR VPN CONNECTION OR PROXY SETTINGS AND RETRY <-",
    );
    console.error("Error details:", error);
    process.exit(1);
  }
};

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx ai_vision_extractor.ts 1538",
    );
    process.exit(1);
  }
  extractContextFromPdf(targetStock).then(console.log).catch(console.error);
}
