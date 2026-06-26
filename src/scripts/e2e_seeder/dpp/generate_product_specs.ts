import * as fs from "fs";
import * as path from "path";
import {
  FaithService,
  Schema,
  SchemaType,
  GenerativeModel,
} from "@/services/faith.service";
import * as dotenv from "dotenv";
import { IProductBom } from "@/interfaces/cbam";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const specsSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    specs: {
      type: SchemaType.ARRAY,
      description:
        "產品規格與生命週期指南 (Product Specs & Lifecycle Guidelines)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          productId: { type: SchemaType.STRING, description: "對應的產品料號" },
          productName: {
            type: SchemaType.STRING,
            description: "對應的產品名稱",
          },
          durability: {
            type: SchemaType.OBJECT,
            description: "耐用性說明",
            properties: {
              physicalLifespanYears: {
                type: SchemaType.NUMBER,
                description: "預估物理壽命(年)",
              },
              maxOperatingTemperature_C: {
                type: SchemaType.NUMBER,
                description: "最高工作溫度(攝氏)",
              },
              operatingConditions: {
                type: SchemaType.STRING,
                description: "操作與存放環境限制(例如防鏽、扭力限制)",
              },
            },
            required: [
              "physicalLifespanYears",
              "maxOperatingTemperature_C",
              "operatingConditions",
            ],
          },
          repairAndTeardown: {
            type: SchemaType.OBJECT,
            description: "維修與拆解指引",
            properties: {
              isRepairable: {
                type: SchemaType.BOOLEAN,
                description: "是否可修復",
              },
              requiresSpecialTools: {
                type: SchemaType.BOOLEAN,
                description: "是否需要特殊工具",
              },
              toolList: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: "特殊工具清單 (如 Torque Wrench)",
              },
              teardownEffort: {
                type: SchemaType.STRING,
                description: "拆解難易度 (如 Low, Medium, High)",
              },
              guidelines: {
                type: SchemaType.STRING,
                description: "拆解步驟或維修指南",
              },
            },
            required: [
              "isRepairable",
              "requiresSpecialTools",
              "toolList",
              "teardownEffort",
              "guidelines",
            ],
          },
          disposal: {
            type: SchemaType.OBJECT,
            description: "報廢與處置方式",
            properties: {
              recyclabilityRate_percent: {
                type: SchemaType.NUMBER,
                description: "可回收率(%)",
              },
              disposalMethod: {
                type: SchemaType.STRING,
                description: "處置方式 (如 Metal Scrap Smelting)",
              },
              instructions: {
                type: SchemaType.STRING,
                description: "報廢回收指引",
              },
            },
            required: [
              "recyclabilityRate_percent",
              "disposalMethod",
              "instructions",
            ],
          },
        },
        required: [
          "productId",
          "productName",
          "durability",
          "repairAndTeardown",
          "disposal",
        ],
      },
    },
  },
  required: ["specs"],
};

async function generateContentWithRetry(
  modelInstance: GenerativeModel,
  prompt: string,
  maxRetries = 3,
  baseDelayMs = 2000,
) {
  let attempt = 0;
  let delayMs = baseDelayMs;
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
          `⚠️ [API Error] ${err?.status || "503/429"} encountered. Retrying ${attempt}/${maxRetries} in ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`❌ API call failed after ${maxRetries} attempts.`);
}

export async function generateProductSpecs(
  stockId: string,
  year: string = "2024",
  targetProductId?: string,
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = path.join(dataDir, "outputs");
  const mockSourcesDir = path.join(baseDir, "mock_sources");

  if (!fs.existsSync(mockSourcesDir)) {
    fs.mkdirSync(mockSourcesDir, { recursive: true });
  }

  const personaFile = path.join(baseDir, `${stockId}_company_persona.json`);
  let persona = {
    industryDynamics: "金屬扣件與五金零件製造",
    coreCompetence: "",
  };
  if (fs.existsSync(personaFile)) {
    const personaRaw = fs.readFileSync(personaFile, "utf-8");
    persona = JSON.parse(personaRaw);
  }

  const bomFile = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(bomFile)) {
    console.error(
      `❌ 找不到 BOM 檔案: ${bomFile}。請先執行 generate_bom_precursors.ts`,
    );
    process.exit(1);
  }

  const bomRaw = fs.readFileSync(bomFile, "utf-8");
  const bomData = JSON.parse(bomRaw);
  let products: IProductBom[] = bomData.products;

  if (targetProductId) {
    products = products.filter((p) => p.productId === targetProductId);
  }

  if (products.length === 0) {
    console.warn(`⚠️ [DPP Specs Generator] 找不到符合的產品，略過生成。`);
    return;
  }

  console.log(
    `🚀 [DPP Specs Generator] 開始為 ${products.length} 項產品生成規格指南...`,
  );

  const genAI = new FaithService(process.env.AI_SERVICE as string);
  const model = genAI.getGenerativeModel({
    model: "gemma4:e4b",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: specsSchema,
    },
  });

  const prompt = `你是一個專業的產品工程師與法規專家。
我們公司的產業與背景如下：
- 產業描述：${persona.industryDynamics}

我們目前有以下終端產品 (SKU)：
${products.map((p) => `- [${p.productId}] ${p.productName}`).join("\n")}

為了符合歐盟 DPP (數位產品護照) 對於「Durability (耐用性)」、「Repair & Teardown (維修與拆解)」以及「Disposal (報廢處置)」的要求，請根據我們的產業背景與產品特性，為每項產品生成對應的說明。
- 判斷該產品是否可修復 (isRepairable)；對於高精密晶圓或單一機械扣件，一般為 false。
- 拆解難易度 (teardownEffort) 應標示 Low/Medium/High。
- 請條列所需的 toolList，如果是 true (requiresSpecialTools)。
- 報廢處置請明確給出合理的 recyclabilityRate_percent (如果是矽晶圓/半導體材料，請評估其主要材料矽與包裝材料的可回收百分比；如果是金屬螺絲，一般為 100)，以及對應的 disposalMethod (例如 "Silicon Wafer Recycling / Reclaiming" 或 "Metal Scrap Smelting")。`;

  const result = await generateContentWithRetry(model, prompt);
  const generatedData = JSON.parse(result.response.text());

  for (const product of products) {
    const productSpec = generatedData.specs.find(
      (s: { productId: string }) => s.productId === product.productId,
    );
    if (!productSpec) continue;

    const productMockDir = path.join(
      dataDir,
      "outputs",
      product.productId,
      "mock_sources",
    );
    if (!fs.existsSync(productMockDir)) {
      fs.mkdirSync(productMockDir, { recursive: true });
    }
    const outFile = path.join(
      productMockDir,
      `${product.productId}_product_specs.json`,
    );
    fs.writeFileSync(outFile, JSON.stringify(productSpec, null, 2), "utf-8");
    console.log(
      `🎉 [SUCCESS] [${product.productId}] DPP 產品規格指南已成功產生：${outFile}`,
    );
  }
}

import url from "url";
const currentFilePath = url.fileURLToPath(import.meta.url);
if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(currentFilePath)
) {
  const stockId = process.argv[2];
  const year = process.argv[3] || "2024";
  if (!stockId) {
    console.error(
      "❌ 請提供股票代號，例如: npx tsx src/scripts/e2e_seeder/dpp/generate_product_specs.ts 2066",
    );
    process.exit(1);
  }
  let productId: string | undefined;
  if (process.argv.length > 4 && process.argv[4].startsWith("--productId=")) {
    productId = process.argv[4].split("=")[1];
  }

  generateProductSpecs(stockId, year, productId).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
