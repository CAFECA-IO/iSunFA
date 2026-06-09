import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

// Info: (20260502 - Tzuhan) 載入環境變數
config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("FATAL: GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Info: (20260605 - Tzuhan) 升級使用 gemini-2.5-pro 因為我們需要支援原生的 PDF 檔案上傳與高精度的分析
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

export interface IExtractedContextCache {
  historicalBaseline: {
    revenueScale: string;
    scope1Emissions: string;
    scope2Emissions: string;
  };
  crossYearExtrapolation: {
    macroTrends: string; // Info: (20260605 - Tzuhan) Time-machine logic (e.g. 2024->2025 CBAM impact, EV market)
    predictedRevenueGrowth: string;
    greenEnergyShift: string;
  };
  supplyChainIntelligence: {
    upstreamSuppliers: string[]; // Info: (20260605 - Tzuhan) REAL company names from PDF
    downstreamCustomers: string[]; // Info: (20260605 - Tzuhan) REAL OEM/Tier1 customers
    outsourcedProcesses: string[]; // Info: (20260605 - Tzuhan) e.g. "Heat treatment", "Electroplating"
  };
  costStructureAnalysis: {
    majorCostComponents: string;
    majorExpenseComponents: string;
  };
}

// Info: (20260605 - Tzuhan) 呼叫現有的 auto_download 腳本進行真實下載
const checkDatabaseAndDownload = async (stockId: string, year: string): Promise<boolean> => {
  console.log(`[INFO] 正在連線至資料庫檢查 ${stockId} 在 ${year} 年的財報下載紀錄，並嘗試觸發自動下載爬蟲...`);
  
  try {
    const result = spawnSync("npx", [
      "tsx", 
      "scripts/auto_download.ts", 
      `--stockId=${stockId}`, 
      `--year=${year}`,
      `--resurrect=0` // Info: 禁用復活機制，失敗就立刻進入歷史回溯，不要等 10 分鐘
    ], {
      stdio: "inherit",
      cwd: process.cwd()
    });

    if (result.status !== 0) {
      console.error(`[ERROR] auto_download 腳本執行失敗，請檢查 Docker 資料庫是否開啟。`);
      return false;
    }

    // Info: (20260605 - Tzuhan) 檢查爬蟲是否真的有把 PDF 下載下來
    const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
    const finPdfPath = path.join(dataDir, "inputs", "raw_reports", `${year}_FIN_REPORT.pdf`);
    const esgPdfPath = path.join(dataDir, "inputs", "raw_reports", `${year}_ESG_REPORT.pdf`);
    
    if (fs.existsSync(finPdfPath) && fs.existsSync(esgPdfPath)) {
       console.log(`[SUCCESS] 成功透過爬蟲下載 ${year} 年報！`);
       return true;
    } else {
       console.log(`[WARN] 下載腳本順利結束，但本地依然找不到 PDF。可能目標年份（${year}）的報告尚未於公開資訊觀測站公布。`);
       return false;
    }
  } catch (error) {
    console.error(`[ERROR] 觸發下載腳本時發生錯誤:`, error);
    return false;
  }
};

export const extractContextFromPdf = async (
  stockId: string,
  targetYear: string = "2024",
): Promise<IExtractedContextCache | null> => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${targetYear}`);
  const cachePath = path.join(
    dataDir,
    "outputs",
    "ai_extracted_context_cache.json",
  );

  // Info: (20260502 - Tzuhan) 原則：資料庫冪等性與資料保留
  // Info: (20260502 - Tzuhan) 如果快取存在，立即回傳以節省 API 成本並確保結果可重現。
  if (fs.existsSync(cachePath)) {
    console.log(
      `[INFO] Cache found for ${stockId} (${targetYear}). Skipping API call.`,
    );
    const rawCache = fs.readFileSync(cachePath, "utf-8");
    return JSON.parse(rawCache) as IExtractedContextCache;
  }

  let finPdfPath = path.join(
    dataDir,
    "inputs",
    "raw_reports",
    `${targetYear}_FIN_REPORT.pdf`,
  );
  let esgPdfPath = path.join(
    dataDir,
    "inputs",
    "raw_reports",
    `${targetYear}_ESG_REPORT.pdf`,
  );

  let finBaseYear = targetYear;
  let esgBaseYear = targetYear;

  // Info: (20260605 - Tzuhan) 分別針對 FIN 與 ESG 進行獨立檢查與回溯
  if (!fs.existsSync(finPdfPath)) {
    console.warn(`[WARN] 本地端找不到 ${stockId} 於 ${targetYear} 的 FIN 報告。`);
    const downloadSuccess = await checkDatabaseAndDownload(stockId, targetYear);
    if (!downloadSuccess) {
      console.warn(`[WARN] 確定取得 ${targetYear} FIN 報告失敗！準備啟動歷史回溯...`);
      finBaseYear = "2024";
      finPdfPath = path.join(path.resolve(process.cwd(), `data/${stockId}/${finBaseYear}`), "inputs", "raw_reports", `${finBaseYear}_FIN_REPORT.pdf`);
      if (!fs.existsSync(finPdfPath)) return null;
    }
  }

  if (!fs.existsSync(esgPdfPath)) {
    console.warn(`[WARN] 本地端找不到 ${stockId} 於 ${targetYear} 的 ESG 報告。`);
    // Info: (20260605 - Tzuhan) 如果剛剛已經跑過下載腳本，就不需要再跑一次
    const downloadSuccess = fs.existsSync(esgPdfPath) || await checkDatabaseAndDownload(stockId, targetYear);
    if (!downloadSuccess) {
      console.warn(`[WARN] 確定取得 ${targetYear} ESG 報告失敗！準備啟動歷史回溯...`);
      esgBaseYear = "2024";
      esgPdfPath = path.join(path.resolve(process.cwd(), `data/${stockId}/${esgBaseYear}`), "inputs", "raw_reports", `${esgBaseYear}_ESG_REPORT.pdf`);
      if (!fs.existsSync(esgPdfPath)) return null;
    }
  }

  console.log(`[INFO] Final Reports to analyze: FIN(${finBaseYear}), ESG(${esgBaseYear}) target: ${targetYear}`);

    console.log(
      `[INFO] Analyzing PDFs for ${stockId} via Gemini Vision API...`,
    );

    try {
      console.log(
        `⏳ [${stockId}] Uploading PDFs to Gemini API via FileManager...`,
      );

      const finUploadResult = await fileManager.uploadFile(finPdfPath, {
        mimeType: "application/pdf",
        displayName: `${stockId}_${finBaseYear}_FIN_REPORT.pdf`,
      });

      const esgUploadResult = await fileManager.uploadFile(esgPdfPath, {
        mimeType: "application/pdf",
        displayName: `${stockId}_${esgBaseYear}_ESG_REPORT.pdf`,
      });

      const prompt = `
      You are an elite Intelligence Analyst, Certified Public Accountant (CPA), and Macroeconomic Forecaster.
      I have provided the Annual Financial Report from ${finBaseYear} and the ESG Report from ${esgBaseYear} for a specific company.
      ${finBaseYear !== targetYear || esgBaseYear !== targetYear ? `\n      CRITICAL INSTRUCTION [TIME-MACHINE]: The target simulation year is ${targetYear}, but some reports are from historical years. You MUST perform a Cross-Year Baseline Extrapolation for any missing data. Analyze the historical baselines, then logically project how macroeconomic trends (e.g., CBAM, global EV market, interest rates, geopolitics) will impact their ${targetYear} revenue, supply chain, and carbon emissions (specifically their green energy adoption rate).\n` : ""}
      
      Your task is to perform an EXTREME GRANULARITY FACT EXTRACTION. 
      DO NOT invent generic placeholder names (like "主要熱處理外包商"). You MUST extract the REAL supplier names, REAL bank names, REAL numbers, and REAL product lines directly from the tens of thousands of words in these PDFs.
      
      Please extract the information and return ONLY a valid JSON object matching this schema exactly:
      {
        "historicalBaseline": {
          "revenueScale": "Extract the exact revenue number for the target year or closest available year (e.g. '新台幣 6,854,321 仟元')",
          "scope1Emissions": "Extract exact Scope 1 emissions (e.g. '12,345 tCO2e')",
          "scope2Emissions": "Extract exact Scope 2 emissions (e.g. '45,678 tCO2e')"
        },
        "crossYearExtrapolation": {
          "macroTrends": "A detailed paragraph forecasting the macroeconomic and industry challenges heading into ${targetYear}.",
          "predictedRevenueGrowth": "Logical deduction of revenue growth/decline % for ${targetYear} with rationale based on the extracted baseline.",
          "greenEnergyShift": "How will their Scope 2 emissions and green power purchasing behavior change in ${targetYear} due to regulations like CBAM?"
        },
        "supplyChainIntelligence": {
          "upstreamSuppliers": ["REAL_NAME_1", "REAL_NAME_2", "REAL_NAME_3"], // Must be ACTUAL company names found in the text!
          "downstreamCustomers": ["REAL_CUSTOMER_1", "REAL_CUSTOMER_2"], // Actual customers or target markets mentioned
          "outsourcedProcesses": ["REAL_PROCESS_1", "REAL_PROCESS_2"] // Specific outsourced processes like "達可銹處理", "高週波熱處理"
        },
        "costStructureAnalysis": {
          "majorCostComponents": "Detailed breakdown of their direct materials, labor, and specific manufacturing overheads.",
          "majorExpenseComponents": "Detailed breakdown of their selling, administrative, and R&D expenses (e.g., specific shipping lines used, precise R&D %)."
        }
      }
    `;

      console.log(`🚀 [${stockId}] Sending request to Gemini 2.5 Pro...`);
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: finUploadResult.file.mimeType,
            fileUri: finUploadResult.file.uri,
          },
        },
        {
          fileData: {
            mimeType: esgUploadResult.file.mimeType,
            fileUri: esgUploadResult.file.uri,
          },
        },
        { text: prompt },
      ]);
      const responseText = result.response.text();

      // Info: (20260502 - Tzuhan) 解析 JSON (Gemini 在 JSON 模式下通常會回傳純 JSON 而不帶 markdown 區塊，但我們還是先清理以防萬一)
      const cleanJsonString = responseText
        .replace(/^\\s*\\x60{3}(?:json)?\\s*/i, "")
        .replace(/\\s*\\x60{3}\\s*$/, "");
      const parsedData = JSON.parse(cleanJsonString) as IExtractedContextCache;

      // Info: (20260502 - Tzuhan) 快取結果
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
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

  // Info: (20260502 - Tzuhan) 如果直接執行此腳本
  if (import.meta.url === `file://${process.argv[1]}`) {
    const targetStock = process.argv[2];
    const targetYear = process.argv[3] || "2024";
    if (!targetStock) {
      console.error(
        "Please provide a stock ID. Usage: tsx ai_vision_extractor.ts 1538 [year]",
      );
      process.exit(1);
    }
    extractContextFromPdf(targetStock, targetYear)
      .then(console.log)
      .catch(console.error);
  }
