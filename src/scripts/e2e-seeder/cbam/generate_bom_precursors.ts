import * as fs from "fs";
import * as path from "path";
import {
  GoogleGenerativeAI,
  Schema,
  SchemaType,
  GenerativeModel,
  Part,
} from "@google/generative-ai";
import {
  ICompanyPersona,
  IPersonaSupplierCategory,
  IPersonaSupplier,
} from "@/interfaces/cbam";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const bomSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    products: {
      type: SchemaType.ARRAY,
      description: "企業主要銷售的終端產品清單與其物料清單 (BOM)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          productId: {
            type: SchemaType.STRING,
            description: "產品料號 (如: P-M8-HX-001)",
          },
          productName: {
            type: SchemaType.STRING,
            description: "產品名稱 (如: 高強度車用防鬆脫螺帽 M8)",
          },
          cnCode: {
            type: SchemaType.STRING,
            description: "歐盟海關稅則號列 8碼 (如緊固件通常為 73181595)",
          },
          materialComposition: {
            type: SchemaType.ARRAY,
            description: "產品的化學元素組成與佔比",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                element: {
                  type: SchemaType.STRING,
                  description: "元素符號或名稱 (如: Fe, C, Cr, Mo)",
                },
                percentage: {
                  type: SchemaType.NUMBER,
                  description: "重量佔比百分比 (加總應接近 100)",
                },
              },
              required: ["element", "percentage"],
            },
          },
          circularity: {
            type: SchemaType.OBJECT,
            description: "產品循環性指標",
            properties: {
              recycledContentShare: {
                type: SchemaType.OBJECT,
                properties: {
                  total_percent: { type: SchemaType.NUMBER },
                  preConsumer_percent: { type: SchemaType.NUMBER },
                  postConsumer_percent: { type: SchemaType.NUMBER },
                },
                required: [
                  "total_percent",
                  "preConsumer_percent",
                  "postConsumer_percent",
                ],
              },
              recyclability_percent: {
                type: SchemaType.NUMBER,
                description: "產品報廢時可回收之比例 (金屬通常接近 100)",
              },
            },
            required: ["recycledContentShare", "recyclability_percent"],
          },
          bom: {
            type: SchemaType.ARRAY,
            description: "該產品所需的前驅物(Precursors)或原物料清單",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                precursorName: {
                  type: SchemaType.STRING,
                  description: "原料名稱 (如: 10B21 碳鋼盤元)",
                },
                supplierName: {
                  type: SchemaType.STRING,
                  description:
                    "對應的供應商真實名稱 (必須與畫像中的供應商一致)",
                },
                countryOfOrigin: {
                  type: SchemaType.STRING,
                  description: "前驅物原產國 (如: TW)",
                },
                isCbamCovered: {
                  type: SchemaType.BOOLEAN,
                  description:
                    "是否屬於 CBAM 納管項目 (鋼鐵為 true，紙箱包材為 false)",
                },
                inputWeightKg: {
                  type: SchemaType.NUMBER,
                  description:
                    "生產一個單位的終端產品，需要投入多少公斤的此原料 (需考慮合理耗損，大於產品淨重)",
                },
                embeddedEmissionsKgCO2ePerKg: {
                  type: SchemaType.NUMBER,
                  description:
                    "該原料每公斤自帶的碳排係數 (如: 鋼材通常介於 1.5 ~ 2.5 之間)",
                },
              },
              required: [
                "precursorName",
                "supplierName",
                "countryOfOrigin",
                "isCbamCovered",
                "inputWeightKg",
                "embeddedEmissionsKgCO2ePerKg",
              ],
            },
          },
        },
        required: [
          "productId",
          "productName",
          "cnCode",
          "materialComposition",
          "circularity",
          "bom",
        ],
      },
    },
  },
  required: ["products"],
};

async function generateContentWithRetry(
  modelInstance: GenerativeModel,
  prompt: string | Array<string | Part>,
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

export async function generateBOMAndPrecursors(
  stockId: string,
  year: string = "2024",
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const personaFile = path.join(
    dataDir,
    "outputs",
    `${stockId}_company_persona.json`,
  );
  const mockSourcesDir = path.join(dataDir, "outputs", "mock_sources");

  if (!fs.existsSync(mockSourcesDir)) {
    fs.mkdirSync(mockSourcesDir, { recursive: true });
  }

  const outFile = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(personaFile)) {
    console.error(
      `❌ 找不到企業畫像檔案: ${personaFile}。請先執行 persona_generator.ts`,
    );
    process.exit(1);
  }

  const personaRaw = fs.readFileSync(personaFile, "utf-8");
  const persona: ICompanyPersona = JSON.parse(personaRaw);

  const rawMaterialSuppliers =
    persona.topSuppliers
      .find((s: IPersonaSupplierCategory) => s.category.includes("原料"))
      ?.suppliers.map((s: IPersonaSupplier) => s.name) || [];

  console.log(`🚀 [CBAM BOM Generator] 開始為 ${stockId} 產生產品物料清單...`);
  console.log(
    `🔍 抓取到畫像中的主要原料供應商: ${rawMaterialSuppliers.join(", ")}`,
  );

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: bomSchema,
    },
  });

  const prompt = `你是一個 ERP 系統的物料大師 (Master Data Manager) 與碳盤查顧問。
這家企業的畫像如下：
產業動態：${persona.industryDynamics}
可用的主要原料供應商：${JSON.stringify(rawMaterialSuppliers)}

請為這家企業生成 3 到 5 種主力「終端產品」，並展開其 BOM 表。
特別要求：
1. BOM 裡面的 supplierName 必須從「可用的主要原料供應商」中挑選，以保持追溯一致性。
2. inputWeightKg 必須合理。如果是金屬加工，投入的重量通常大於產品最終淨重(因為有邊角料耗損)。
3. 請針對每項產品，幻覺出合理的金屬材料化學元素佔比 (materialComposition)，所有元素的 percentage 加總必須「絕對等於 100%」(可加入 Others 來補齊餘數)。
4. 請賦予產品 8 碼的歐盟海關稅則號列 (cnCode，例如 73181595)。
5. 請在 BOM 中刻意加入一項「紙箱包材」以測試系統邊界，但記得將包材的 isCbamCovered 標記為 false。
6. recycledContentShare 必須將 total_percent 拆分為 preConsumer_percent 與 postConsumer_percent。`;

  const result = await generateContentWithRetry(model, prompt);

  fs.writeFileSync(outFile, result.response.text(), "utf-8");

  console.log(`🎉 [SUCCESS] 產品 BOM 與前驅物數據已成功產生：${outFile}`);
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
      "❌ 請提供股票代號，例如: npx tsx src/scripts/e2e-seeder/cbam/generate_bom_precursors.ts 2066",
    );
    process.exit(1);
  }
  generateBOMAndPrecursors(stockId, year).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
