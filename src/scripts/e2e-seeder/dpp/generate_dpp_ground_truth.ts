import * as fs from "fs";
import * as path from "path";
import {
  GoogleGenerativeAI,
  Schema,
  SchemaType,
  GenerativeModel,
} from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Info: (20260604 - Tzuhan) --- Schema Definition ---
const dppGroundTruthSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    general: {
      type: SchemaType.OBJECT,
      properties: {
        passportId: {
          type: SchemaType.STRING,
          description: "Unique DID for the passport",
        },
        productId: { type: SchemaType.STRING },
        name: { type: SchemaType.STRING },
        modelNumber: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING },
        cnCode: {
          type: SchemaType.STRING,
          description: "Customs Nomenclature code, e.g., 7318.15",
        },
        manufacturedDate: {
          type: SchemaType.STRING,
          description: "YYYY-MM-DD",
        },
        facility: { type: SchemaType.STRING },
        weightKg: { type: SchemaType.NUMBER },
      },
      required: [
        "passportId",
        "productId",
        "name",
        "modelNumber",
        "category",
        "cnCode",
        "manufacturedDate",
        "facility",
        "weightKg",
      ],
    },
    carbonFootprint: {
      type: SchemaType.OBJECT,
      properties: {
        total_tCO2e: { type: SchemaType.NUMBER },
        methodology: {
          type: SchemaType.STRING,
          description: "e.g., ISO 14067 (Cradle-to-Gate)",
        },
        breakdown: {
          type: SchemaType.OBJECT,
          properties: {
            precursorsEmissions: { type: SchemaType.NUMBER },
            directEmissionsScope1: { type: SchemaType.NUMBER },
            indirectEmissionsScope2: { type: SchemaType.NUMBER },
          },
          required: [
            "precursorsEmissions",
            "directEmissionsScope1",
            "indirectEmissionsScope2",
          ],
        },
      },
      required: ["total_tCO2e", "methodology", "breakdown"],
    },
    circularity: {
      type: SchemaType.OBJECT,
      properties: {
        recycledContentShare: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              material: { type: SchemaType.STRING },
              preConsumerShare: { type: SchemaType.NUMBER },
              postConsumerShare: { type: SchemaType.NUMBER },
              primaryMaterial: { type: SchemaType.NUMBER },
            },
            required: [
              "material",
              "preConsumerShare",
              "postConsumerShare",
              "primaryMaterial",
            ],
          },
        },
      },
      required: ["recycledContentShare"],
    },
    materialComposition: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          materialName: {
            type: SchemaType.STRING,
            description: "e.g., Alloy Steel (SCM440)",
          },
          elements: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                element: {
                  type: SchemaType.STRING,
                  description: "e.g., Fe, C, Cr",
                },
                percentage: { type: SchemaType.NUMBER },
              },
              required: ["element", "percentage"],
            },
          },
        },
        required: ["materialName", "elements"],
      },
    },
    durabilityAndRepair: {
      type: SchemaType.OBJECT,
      properties: {
        physicalLifespanYears: { type: SchemaType.NUMBER },
        repairability: { type: SchemaType.STRING },
        disposal: { type: SchemaType.STRING },
      },
      required: ["physicalLifespanYears", "repairability", "disposal"],
    },
    compliance: {
      type: SchemaType.OBJECT,
      properties: {
        declarationDocument: { type: SchemaType.STRING },
        rohsCompliant: { type: SchemaType.BOOLEAN },
        pfasFree: { type: SchemaType.BOOLEAN },
      },
      required: ["declarationDocument", "rohsCompliant", "pfasFree"],
    },
  },
  required: [
    "general",
    "carbonFootprint",
    "circularity",
    "materialComposition",
    "durabilityAndRepair",
    "compliance",
  ],
};

// Info: (20260604 - Tzuhan) --- Retry Wrapper ---
async function generateContentWithRetry(
  modelInstance: GenerativeModel,
  prompt: string,
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
        currentDelayMs *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`❌ API call failed after ${maxRetries} attempts.`);
}

// Info: (20260604 - Tzuhan) --- Main Generator ---
export async function generateDppGroundTruth(
  stockId: string,
  year: string = "2024",
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}/outputs`);
  const baseDir = path.join(dataDir, "e2e_roadmap-sprint1");
  const mockSourcesDir = path.join(baseDir, "mock_sources");

  // Info: (20260604 - Tzuhan) 讀取所有來源資料
  const personaPath = path.join(baseDir, `${stockId}_company_persona.json`);
  const bomPath = path.join(mockSourcesDir, "boms_and_precursors.json");
  const specsPath = path.join(mockSourcesDir, "product_specs.json");

  // Info: (20260604 - Tzuhan) 防呆檢查
  const filesToCheck = [personaPath, bomPath, specsPath];
  for (const f of filesToCheck) {
    if (!fs.existsSync(f)) {
      throw new Error(
        `❌ Missing required seeder file: ${f}. Please run previous seeder steps first.`,
      );
    }
  }

  const personaStr = fs.readFileSync(personaPath, "utf-8");
  const bomRaw = JSON.parse(fs.readFileSync(bomPath, "utf-8"));
  const specsRaw = JSON.parse(fs.readFileSync(specsPath, "utf-8"));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in .env");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  console.log(`🚀 [DPP Ground Truth Generator] 開始為 ${stockId} 的 ${bomRaw.products.length} 項產品產出 SKU 級別 DPP 標準答案...`);

  const aggregatorModel = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: dppGroundTruthSchema,
      temperature: 0.1, // Info: (20260604 - Tzuhan) 低溫確保嚴謹與服從
    },
  });

  for (const product of bomRaw.products) {
    const productId = product.productId;
    const productMockDir = path.join(baseDir, productId, "mock_sources");
    if (!fs.existsSync(productMockDir)) fs.mkdirSync(productMockDir, { recursive: true });
    
    const outFile = path.join(productMockDir, `${productId}_dpp_ground_truth.json`);
    const productSpec = specsRaw.specs.find((s: { productId: string }) => s.productId === productId);

    // Info: (20260604 - Tzuhan) 建立強大的 Context 文本 (針對單一 SKU)
    const baseContext = `我們正在為台灣公司代號 ${stockId} (年份 ${year}) 的產品 ${productId} (${product.productName}) 建立數位產品護照 (DPP) 的 Ground Truth 測試數據。
這份 DPP 將用於前端 Battery Pass 風格的 Dashboard 顯示。
以下是底層系統生成的 Raw Mock Data：

【1. Company Persona (公司畫像)】
${personaStr}

【2. BOM & Material Composition (單一產品物料與化學成分)】
${JSON.stringify(product, null, 2)}

【3. Product Specs (單一產品規格與壽命)】
${JSON.stringify(productSpec, null, 2)}
`;

    console.log(`🔄 [${productId}] STEP 1: 啟動 Map-Reduce 三大 Auditor 平行審查...`);

    const [resCarbon, resCircularity, resSupplyChain] = await Promise.all([
      generateContentWithRetry(
        model,
        `你現在是【嚴格的碳會計師 (Carbon Actuary)】。
${baseContext}
你的任務是從這些資料中推算出這項產品的「單件總碳排 (total_tCO2e)」。
遵守歐盟 CBAM 規範，必須是 Cradle-to-Gate (搖籃到大門)，不可包含 Distribution (運輸與分發)。
必須拆分成三大項：
1. Precursors Emissions (原物料碳排)
2. Direct Emissions Scope 1 (製程直接排放)
3. Indirect Emissions Scope 2 (製程間接排放/電力)
請參考 Company Persona 中的 \`totalScope2Emissions_tCO2e\` 進行合理推估，數字加總必須等於單件總碳排。
請給出你的分析筆記與最終數字。`,
      ),
      generateContentWithRetry(
        model,
        `你現在是【循環經濟與材料專家 (Circularity & Material Expert)】。
${baseContext}
你的任務是從 BOM 表萃取出這個產品的主要材質與詳細的化學元素。
1. 針對每種主材料 (如 Alloy Steel)，提供詳細的 elements 比例 (Fe, C, Cr, Mo...等)，以符合 CRMA 關鍵原物料的顆粒度要求。
2. 精確推算它的 recycledContentShare (包含 preConsumerShare, postConsumerShare, primaryMaterial)。三者加總必須為 100。
請確保數據跟 BOM 表的記載吻合！給出你的分析筆記。`,
      ),
      generateContentWithRetry(
        model,
        `你現在是【供應鏈與合規稽核員 (Supply Chain & Compliance Auditor)】。
${baseContext}
你的任務是統整 General Info (Model Number, Weight, Name, Facility, Manufactured Date)。
強烈注意：請務必根據產品屬性(例如扣件 fastener)推斷並提供正確的海關稅則號列 (CN Code，如 7318.15.xx)。
並且統整 durabilityAndRepair (壽命與維修) 以及 compliance (合規性：是否符合 RoHS, PFAS Free)。
參考產品規格 (Product Specs) 以及先前的 PDF 宣告書邏輯，給出精準的屬性值。`,
      ),
    ]);

    const carbonNotes = resCarbon.response.text();
    const circularityNotes = resCircularity.response.text();
    const supplyChainNotes = resSupplyChain.response.text();

    console.log(`✅ [${productId}] 三大 Auditor 審查意見收集完成。`);
    console.log(`🔄 [${productId}] STEP 2: Aggregator 正在聚合意見並強制輸出符合 Schema 的 JSON...`);

    const aggregatorPrompt = `你現在是【Aggregator 總架構師】。
我們需要為 ${stockId} 的產品 ${productId} 建立一份符合嚴格 JSON Schema 的 DPP Ground Truth JSON 檔案。

以下是底層的上下文：
${baseContext}

以下是三大專家的平行審查意見：
【碳足跡意見】：${carbonNotes}
【循環經濟意見】：${circularityNotes}
【供應鏈合規意見】：${supplyChainNotes}

請綜合以上資訊，解決潛在衝突，並輸出最終完美的 JSON。
- carbonFootprint.methodology 請填寫 "ISO 14067 (Cradle-to-Gate)"
- 確保 carbonFootprint.breakdown 的三個數字 (precursorsEmissions + directEmissionsScope1 + indirectEmissionsScope2) 加起來等於 total_tCO2e。
- 確保 general.cnCode 有填寫海關稅則號碼。
- 確保 recycledContentShare 的每個 material 內部，pre + post + primary 剛好等於 100。
- compliance.declarationDocument 檔名應設定為 "${productId}_dpp_compliance_declaration.pdf"。
- general.passportId 請設定為 "did:web:isunfa.com:dpp:${stockId}-${productId}"。`;

    const finalResult = await generateContentWithRetry(
      aggregatorModel,
      aggregatorPrompt,
    );

    fs.writeFileSync(outFile, finalResult.response.text(), "utf-8");
    console.log(`🎉 [SUCCESS] [${productId}] DPP Ground Truth 已成功產出：${outFile}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  if (!stockId) {
    console.error("Usage: npx tsx generate_dpp_ground_truth.ts <stockId>");
    process.exit(1);
  }
  generateDppGroundTruth(stockId).catch(console.error);
}
