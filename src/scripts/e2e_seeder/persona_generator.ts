import * as fs from "fs";
import * as path from "path";
import {
  FaithService,
  Schema,
  SchemaType,
  GenerativeModel,
  Part,
} from "@/services/faith.service";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Info: (20260603 - Tzuhan) Schema 定義
const personaSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    industryDynamics: {
      type: SchemaType.STRING,
      description: "產業動態與供應鏈概況描述",
    },
    topSuppliers: {
      type: SchemaType.ARRAY,
      description: "按會計科目分類的前大供應商清單",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: { type: SchemaType.STRING, description: "會計科目名稱" },
          suppliers: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: {
                  type: SchemaType.STRING,
                  description: "供應商真實名稱",
                },
                taxId: { type: SchemaType.STRING, description: "8碼統一編號" },
                errorRate: {
                  type: SchemaType.NUMBER,
                  description: "視覺破壞機率(0~1)",
                },
              },
              required: ["name", "taxId", "errorRate"],
            },
          },
        },
        required: ["category", "suppliers"],
      },
    },
    relatedParties: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          relationship: { type: SchemaType.STRING },
        },
        required: ["name", "relationship"],
      },
    },
    commonBankAccounts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          bankCode: { type: SchemaType.STRING },
          isForeign: { type: SchemaType.BOOLEAN },
        },
        required: ["bankCode", "isForeign"],
      },
    },
    revenueScale: {
      type: SchemaType.STRING,
      description: "營業額規模描述(如: 10億~50億新台幣)",
    },
    manufacturingProcess: {
      type: SchemaType.ARRAY,
      description:
        "主要製程步驟與數據(如扣件業的：盤元進料 -> 抽線 -> 成型 -> 熱處理 -> 電鍍 -> 包裝)，請給出具體生產數據",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          stepName: { type: SchemaType.STRING, description: "製程步驟名稱" },
          description: {
            type: SchemaType.STRING,
            description: "該步驟的作業內容與特性",
          },
          energyIntensity: {
            type: SchemaType.STRING,
            description: "耗能強度(高/中/低)",
          },
          lossRate: {
            type: SchemaType.NUMBER,
            description: "平均良率耗損率(0~1，例如0.02代表2%損耗)",
          },
          processWeight_percent: {
            type: SchemaType.NUMBER,
            description:
              "該製程佔整體生產碳排之權重百分比(0~100)。所有廠內製程加總應為100",
          },
        },
        required: [
          "stepName",
          "description",
          "energyIntensity",
          "lossRate",
          "processWeight_percent",
        ],
      },
    },
    totalScope2Emissions_tCO2e: {
      type: SchemaType.NUMBER,
      description: "年度總範疇二碳排量(噸 CO2e)",
    },
    totalRevenue_NTD: {
      type: SchemaType.NUMBER,
      description: "年度總生產成本或總營業額(新台幣元)",
    },
    voucherCalculationRationale: {
      type: SchemaType.STRING,
      description:
        "憑證數量的具體推估算式與邏輯(例如：營收/客單價*每筆訂單對應單據數 + 員工薪資單據 + 日常費用單據)",
    },
    estimatedAnnualVouchers: {
      type: SchemaType.NUMBER,
      description: "依據產業規模推估之一年傳票/憑證總數量(如: 54000)",
    },
  },
  required: [
    "industryDynamics",
    "topSuppliers",
    "relatedParties",
    "commonBankAccounts",
    "revenueScale",
    "manufacturingProcess",
    "totalScope2Emissions_tCO2e",
    "totalRevenue_NTD",
    "voucherCalculationRationale",
    "estimatedAnnualVouchers",
  ],
};

async function generateContentWithRetry(
  modelInstance: GenerativeModel,
  prompt: string | Array<string | Part>,
  maxRetries = 3,
  initialDelayMs = 2000,
) {
  let attempt = 0;
  let currentDelayMs = initialDelayMs;
  while (attempt < maxRetries) {
    try {
      return await modelInstance.generateContent(prompt);
    } catch (error: unknown) {
      attempt++;
      const err = error as { status?: number; message?: string };
      const isRetryable =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes("503") ||
        err?.message?.includes("429") ||
        err?.message?.includes("fetch");
      if (isRetryable && attempt < maxRetries) {
        console.warn(
          `⚠️ [API Error] ${err?.status || "503/429"} encountered. Retrying ${attempt}/${maxRetries} in ${currentDelayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, currentDelayMs));
        currentDelayMs *= 2; // Info: (20260604 - Tzuhan) Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error(`❌ API call failed after ${maxRetries} attempts.`);
}

export async function generatePersona(stockId: string, year: string = "2024") {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const cacheDir = path.join(dataDir, "outputs");
  const outFile = path.join(cacheDir, `${stockId}_company_persona.json`);
  const contextCacheFile = path.join(
    cacheDir,
    `ai_extracted_context_cache.json`,
  );

  if (fs.existsSync(outFile) && !process.argv.includes("--force")) {
    console.log(`[SKIP] 畫像已存在且未開啟 --force，直接使用快取：${outFile}`);
    return;
  }

  const apiKey = process.env.AI_SERVICE;
  if (!apiKey) throw new Error("Missing AI_SERVICE in .env.local");

  const genAI = new FaithService(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemma4:e4b" });

  console.log(`🚀 [Persona Generator] 開始為 ${stockId} 產生企業畫像...`);

  // Info: (20260603 - Tzuhan) STEP 1: PDF 解析與上下文快取 (節省 Token)

  if (!fs.existsSync(contextCacheFile)) {
    throw new Error(
      `[Error] 找不到 context cache。請先執行 ai_vision_extractor.ts! (路徑: ${contextCacheFile})`,
    );
  }

  console.log("✅ 讀取已存在的 Raw Report 萃取快取...");
  const cacheData = JSON.parse(fs.readFileSync(contextCacheFile, "utf-8"));
  const contextStr = JSON.stringify(cacheData, null, 2);

  // Info: (20260603 - Tzuhan) STEP 2: Map (平行獨立審查)

  console.log(`🔄 啟動 Map-Reduce 架構：三大 Auditor 平行審查中...`);

  const basePrompt = `目標企業代碼：${stockId}，目標生成年度：${year}。
這是一份從歷史財報中萃取出的企業特徵：
${contextStr}

請根據你的專業角色，列出你認為該企業在建立「模擬測試用的虛擬畫像」時，最應該具備的特徵。如果是根據舊資料推估 ${year}，請套用合理的成長或衰退邏輯。
需推估或萃取的項目包含：
1. 【供應商特徵】(至少列出 15 家不同種類的供應商)
2. 【關係人特徵】(至少 5 家)
3. 【財務作帳常見漏洞】
4. 【製造業專屬製程數據】(依據其產業特性，如扣件業須包含：盤元進料 -> 抽線 -> 成型 -> 熱處理 -> 電鍍 -> 包裝，並賦予合理的耗能與損耗率，設定「製程碳排權重 processWeight_percent」，廠內總計應為 100%)
5. 嘗試合理推估出 ${year} 年度的【年度總營收 (NTD)】與【總範疇二碳排量 (tCO2e)】作為後續 CBAM 計算的 Macro 總池。
6. 依據其營運規模推估 ${year} 年的【年度憑證數量估算】(Estimated Annual Vouchers)。越詳細、越貼近真實越好。`;

  const [resCPA, resESG, resInfoSec, resMacro] = await Promise.all([
    generateContentWithRetry(model, `你現在是【CPA查帳員】。\n${basePrompt}`),
    generateContentWithRetry(model, `你現在是【ESG顧問】。\n${basePrompt}`),
    generateContentWithRetry(
      model,
      `你現在是【資安與內控專家】。\n${basePrompt}`,
    ),
    generateContentWithRetry(
      model,
      `你現在是【Macroeconomic Forecaster (總體經濟預測專家)】。你的任務是啟動「AI 自我對抗模式」。請你根據你在知識庫中查到的 ${year} 年真實世界總體經濟、通膨率、工業電價調漲、碳費徵收等大環境因素，來對上述公司的【年度總營收】與【碳排量】提出嚴格的增減挑戰與成長率 (CAGR) 設定。你必須提供具體的大環境數據作為依據！\n${basePrompt}`,
    ),
  ]);

  const cpaNotes = resCPA.response.text();
  const esgNotes = resESG.response.text();
  const infoSecNotes = resInfoSec.response.text();
  const macroNotes = resMacro.response.text();

  console.log(`✅ 四大 Auditor (含總體經濟專家) 審查意見已收集完成。`);

  // Info: (20260603 - Tzuhan) STEP 3: Reduce (聚合收斂為最終 JSON)

  console.log(`🔄 Aggregator 正在聚合意見並強制輸出符合 Schema 的 JSON...`);

  const aggregatorModel = genAI.getGenerativeModel({
    model: "gemma4:e4b",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: personaSchema,
      temperature: 0.1, // Info: (20260603 - Tzuhan) 極低溫度確保嚴謹
    },
  });

  const aggregatorPrompt = `你現在是【Aggregator 總架構師】。
我們需要為 ${stockId} 建立一份符合嚴格 JSON Schema 的虛擬企業畫像，供後續 365 天自動化傳票生成測試使用。

以下是原始財報上下文：
${contextStr}

以下是四大專家的平行審查意見：
【CPA意見】：${cpaNotes}
【ESG意見】：${esgNotes}
【資安意見】：${infoSecNotes}
【總體經濟與大環境推估意見 (AI Adversarial)】：${macroNotes}
請綜合以上所有資訊，解決任何潛在衝突，並輸出最終的、完美的 JSON 畫像。特別是營收與碳排數字，請依據總體經濟專家的推估調整。
必須包含：產業動態、特定科目的前三大供應商(總計至少需產出 15~20 家供應商，含假統編與機率)、關聯方(至少 5 家)、常用銀行帳戶、營收規模描述 (revenueScale)、專屬製程數據 (manufacturingProcess，必須包含盤元進料、抽線、成型、熱處理、電鍍、包裝等詳細數據，且 processWeight_percent 總和為 100) 以及 推估年度憑證總數 (estimatedAnnualVouchers)。
請務必包含你從報告中精確萃取或推算的 totalScope2Emissions_tCO2e (總範疇二碳排) 與 totalRevenue_NTD (總營收新台幣)。

【特別注意：關於年度憑證數量估算】
憑證(Voucher)定義應包含：進銷存產生的單據(採購單、入庫單、領料單、出貨單、發票)、會計傳票(應收、應付、費用報銷、薪資發放、折舊等)。
請先在 \`voucherCalculationRationale\` 欄位寫下你一步一步的數學推估邏輯（例如：B2B製造業平均客單價推估訂單數 -> 每筆訂單延伸多少進銷存單據與會計傳票 -> 加上每月固定費用與薪資發放傳票 -> 算出全年總量），然後再把最終數字填入 \`estimatedAnnualVouchers\`。

資料內容必須具備深度、極具商業真實感，且符合複雜的財報情境。`;

  const finalResult = await generateContentWithRetry(
    aggregatorModel,
    aggregatorPrompt,
  );

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(outFile, finalResult.response.text(), "utf-8");
  console.log(`🎉 [SUCCESS] 聚合版企業畫像已成功產出並快取至：${outFile}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];

  let targetYear = process.argv[3] || "2024";
  const yearArg = process.argv.find((a) => a.startsWith("--year="));
  if (yearArg) {
    targetYear = yearArg.split("=")[1];
  }

  if (!stockId || stockId.startsWith("--")) {
    console.error(
      "Usage: npx tsx persona_generator.ts <stockId> [--year=2025] [--force]",
    );
    process.exit(1);
  }
  generatePersona(stockId, targetYear).catch(console.error);
}
