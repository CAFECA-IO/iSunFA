import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { mdToPdf } from "md-to-pdf";
import { IProductBom } from "@/interfaces/cbam";
import { lookupCompany } from "@/lib/utils/company_lookup";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export async function generateDppCompliance(
  stockId: string,
  year: string = "2024",
  targetProductId?: string,
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = path.join(dataDir, "outputs");
  const mockSourcesDir = path.join(baseDir, "mock_sources");
  const personaFile = path.join(baseDir, `${stockId}_company_persona.json`);

  if (!fs.existsSync(personaFile)) {
    console.error(
      `❌ 找不到企業畫像檔案: ${personaFile}。請先執行 persona_generator.ts`,
    );
    process.exit(1);
  }

  const personaRaw = fs.readFileSync(personaFile, "utf-8");
  const persona = JSON.parse(personaRaw);

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
    console.warn(`⚠️ [DPP Compliance Generator] 找不到符合的產品，略過生成。`);
    return;
  }

  console.log(
    `🚀 [DPP Compliance Generator] 開始為 ${stockId} 的 ${products.length} 項產品產生 SKU 級別法規無使用宣告書...`,
  );

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.3,
    },
  });

  const companyData = await lookupCompany(stockId);
  const companyName =
    companyData.length > 0 ? companyData[0].name : `Company ${stockId}`;
  const address = "Taiwan";
  const today = new Date().toISOString().split("T")[0];

  for (const product of products) {
    const productId = product.productId;
    const productMockDir = path.join(baseDir, productId, "mock_sources");
    const productIngestionDir = path.join(
      baseDir,
      productId,
      "system_ingestion",
    );

    if (!fs.existsSync(productMockDir))
      fs.mkdirSync(productMockDir, { recursive: true });
    if (!fs.existsSync(productIngestionDir))
      fs.mkdirSync(productIngestionDir, { recursive: true });

    const mdOutFile = path.join(
      productMockDir,
      `${productId}_dpp_compliance_declaration.md`,
    );
    const pdfOutFile = path.join(
      productIngestionDir,
      `${productId}_dpp_compliance_declaration.pdf`,
    );

    const prompt = `你現在是「${companyName}」的法規與永續合規長 (Chief Compliance Officer)。
公司基本資料：
- 產業：${persona.industryDynamics}
- 核心競爭力：${persona.coreCompetence}

請為我們即將出口到歐盟的產品撰寫一份正式的英文「符合性與無使用宣告書 (Declaration of Conformity and Non-Use)」。
這份文件將做為 Digital Product Passport (DPP) 審查的佐證資料。
這是一家「車用扣件廠 (Automotive Fasteners)」，因此除了 RoHS 和 REACH，合規宣告中【必須】包含對 **EU ELV Directive (2000/53/EC)** 的遵守宣告，確保無鉛 (Lead)、汞 (Mercury)、鎘 (Cadmium) 與六價鉻 (Hexavalent Chromium)。

【嚴格格式要求】
1. 絕對不要輸出任何對話式的開頭或結尾（例如「好的，身為合規長...」）。
2. 直接輸出 Markdown 內容，絕對不要使用 \`\`\`markdown 程式碼區塊包覆，直接輸出純文本。
3. 文件中必須明確包含以下兩個標題 (Header 2)，以讓自動化審查系統能精準抓取：

## 6.1 Repair & Teardown Guidelines
- 必須明確寫出："Circuit Diagrams & Mainboard Layout: NOT APPLICABLE. This product is a pure mechanical metal fastener and does not contain any electronic components."

## 9.3 Hazardous Chemicals (PFAS)
- 必須明確包含段落："Declaration of exact locations of hazardous materials: **None / Not Applicable**"
- 在該段落後面具體以英文描述：「本產品經檢驗，100% 不含任何 PFAS 或 REACH SVHC 有害物質。產品為純鋼鐵合金，無任何有害化學殘留。Supported by third-party laboratory test report (Ref: SGS-TW-2024-${Math.floor(Math.random() * 90000) + 10000}).」

開頭需有公司信頭與日期，並明確標示適用的單一產品編號與名稱：
"Covered SKU / Part Number: ${productId} - ${product.productName}"
結尾需有簽名欄位。
4. 絕對不可使用任何中括號佔位符 (如 [Company Name], [Address], [Date])。必須直接填寫以下真實資料：
   - Company Name: ${companyName}
   - Address: ${address}
   - Date: ${today}
   - Chief Compliance Officer Signature: (請直接打上一個擬真的英文人名，例如 Tzuhan Lin)
`;

    console.log(`⏳ [${productId}] 正在請求 AI 撰寫宣告信...`);
    // Info: (20260604 - Tzuhan) 簡易重試邏輯
    let mdContent = "";
    try {
      const result = await model.generateContent(prompt);
      mdContent = result.response.text();
    } catch (error) {
      console.warn(`⚠️ [${productId}] API Error, retrying after 3s...`, error);
      await new Promise((r) => setTimeout(r, 3000));
      const result = await model.generateContent(prompt);
      mdContent = result.response.text();
    }

    mdContent = mdContent
      .replace(/^```[a-z]*\s*/im, "")
      .replace(/```\s*$/s, "")
      .trim();

    const blueprintPath = path.resolve(
      process.cwd(),
      `data/${stockId}/${year}/outputs/${productId}/mock_sources/fastener_blueprint.png`,
    );
    if (fs.existsSync(blueprintPath)) {
      const base64Image = fs.readFileSync(blueprintPath).toString("base64");
      const dataUri = `data:image/png;base64,${base64Image}`;
      const imgMarkdown = `\n\n<img src="${dataUri}" alt="Mechanical Layout" width="500" />\n\n*(Above: Engineering Mechanical Blueprint, provided in lieu of circuit diagrams as this product is non-electronic)*\n\n`;
      mdContent = mdContent.replace(
        "## 6.1 Repair & Teardown Guidelines",
        "## 6.1 Repair & Teardown Guidelines" + imgMarkdown,
      );
    }

    fs.writeFileSync(mdOutFile, mdContent, "utf-8");
    console.log(
      `📝 [SUCCESS] [${productId}] Markdown 宣告信已產生：${mdOutFile}`,
    );

    console.log(`⏳ [${productId}] 正在轉檔為 PDF...`);
    try {
      await mdToPdf(
        { content: mdContent },
        {
          dest: pdfOutFile,
          pdf_options: {
            format: "A4",
            margin: {
              top: "20mm",
              right: "20mm",
              bottom: "20mm",
              left: "20mm",
            },
            printBackground: true,
          },
        },
      );
      console.log(
        `📄 [SUCCESS] [${productId}] PDF 宣告信已成功匯出：${pdfOutFile}`,
      );
    } catch (error) {
      console.error(`❌ [${productId}] PDF 轉檔失敗:`, error);
    }
  }
}

import url from "url";
const currentFilePath = url.fileURLToPath(import.meta.url);
if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(currentFilePath)
) {
  const stockId = process.argv[2];
  if (!stockId) {
    console.error(
      "❌ 請提供股票代號，例如: npx tsx src/scripts/e2e_seeder/dpp/generate_dpp_compliance.ts 2330",
    );
    process.exit(1);
  }
  let productId: string | undefined;
  if (
    process.argv.length > 3 &&
    process.argv[3] &&
    !process.argv[3].startsWith("--")
  ) {
    // Info: (20260611 - Tzuhan) legacy compat
  }
  if (process.argv.length > 4 && process.argv[4].startsWith("--productId=")) {
    productId = process.argv[4].split("=")[1];
  }

  const year =
    process.argv[3] && !process.argv[3].startsWith("--")
      ? process.argv[3]
      : "2024";

  generateDppCompliance(stockId, year, productId).catch(console.error);
}
