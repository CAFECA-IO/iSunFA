import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import LlamaCloud from "@llamaindex/llama-cloud";
import { lanceDBService } from "@/services/lancedb.service";
import { ILanceDBRow } from "@/interfaces/lance_db";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings";
const EMBED_MODEL = "nomic-embed-text";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Info: (20260612 - Julian) 輔助函式：呼叫 Ollama 取得 768 維向量
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(OLLAMA_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  const data = await response.json();

  if (data.error) {
    throw new Error(`Ollama API 錯誤: ${data.error}`);
  }

  return data.embedding;
}

// Info: (20260612 - Julian) 輔助函式：Markdown 文字切塊 (層級遞迴切割法)
function chunkMarkdown(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];

  // Info: (20260612 - Julian) 優先以段落 \n\n 切割
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length <= size) {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Info: (20260612 - Julian) 保留上一段最後的字元確保語意連貫
        currentChunk = currentChunk.slice(-overlap);
      }

      // Info: (20260612 - Julian) 單一段落本身就超過 size，只能硬切
      if (para.length > size) {
        let i = 0;
        while (i < para.length) {
          chunks.push(para.slice(i, i + size));
          i += size - overlap;
        }
        currentChunk = chunks.pop() || "";
      } else {
        currentChunk = currentChunk ? currentChunk + "\n\n" + para : para;
      }
    }
  }

  if (currentChunk && currentChunk.length > overlap) {
    chunks.push(currentChunk);
  }

  return chunks;
}

interface IExtractedMetadata {
  companyName: string;
  title: string;
  reportYear: string;
  period: string;
  industry: string;
  capital: string;
  verificationAgency: string;
  verificationStandards: string;
  assuranceAgency: string;
  assuranceStandards: string;
  isVerifiedByThirdParty: boolean;
}

// Info: (20260630 - Julian) 透過 Gemini 萃取報告書詮釋資料
async function extractMetadata(
  textSnippet: string,
  fileName: string,
): Promise<IExtractedMetadata> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `你是一個專業的文件分析器。請閱讀下方提供的報告書開頭片段，以及檔案名稱，並萃取出這份報告書的詮釋資料 (Metadata)。
檔案名稱：${fileName}
報告書開頭片段：
${textSnippet}

請嚴格依照此 JSON Schema 格式回傳，不要包含 any 型別或額外的文字或 markdown 標記：
{
  "companyName": "字串，企業完整全名 (例如 台灣積體電路製造股份有限公司)",
  "title": "字串，例如 '2024 年永續報告書' 或 '2024 年第一季合併財務報告'",
  "reportYear": "字串，如 '2024'",
  "period": "字串，如 '2024/01/01 ~ 2024/12/31' 或 '2024/01/01 ~ 2024/03/31'",
  "industry": "字串，例如 '半導體業'、'水泥工業'、'資訊服務業'、'航運業' 等",
  "capital": "字串，如 '100億以上'、'10億~50億'、'10億以下' 或 '無'",
  "verificationAgency": "字串，查證機構名稱，沒有則填 '無'",
  "verificationStandards": "字串，查證採用標準，沒有則填 '無'",
  "assuranceAgency": "字串，確信機構名稱，沒有則填 '無'",
  "assuranceStandards": "字串，確信採用標準，沒有則填 '無'",
  "isVerifiedByThirdParty": 布林值，是否經第三方確信
}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  return JSON.parse(responseText);
}

/**
 * Info: (20260612 - Julian)
 * 透過 LanceDB 提供的批次處理功能，對指定目錄下的所有 PDF 檔案執行「OCR 辨識 -> 文字切塊 -> 向量化」流程
 * Command: npx tsx scripts/import_pdfs.ts
 */
async function runBatchPipeline() {
  const pdfDir = path.resolve("pdfs");
  if (!fs.existsSync(pdfDir)) {
    console.error("❌ 請先建立 pdfs 資料夾並放入 PDF 檔案");
    return;
  }

  const files = fs.readdirSync(pdfDir).filter((f) => f.endsWith(".pdf"));
  if (files.length === 0) return;

  // Info: (20260612 - Julian) 初始化全新的 LlamaCloud 客戶端
  const client = new LlamaCloud();
  const table = await lanceDBService.getTable();

  console.log(
    `🚀 [新版 SDK] 偵測到 ${files.length} 份報告，開始執行批次預處理...`,
  );

  for (const file of files) {
    console.log(`\n==============================================`);

    const filePath = path.join(pdfDir, file);

    try {
      // Info: (20260630 - Julian) 檢查 PostgreSQL 是否已存在此報告書
      const existingReport = await prisma.report.findUnique({
        where: { pdfPath: file },
      });
      if (existingReport) {
        console.log(`⏭️  [跳過] 檔案 [${file}] 已存在於資料庫中，略過處理。`);
        continue;
      }

      const mdCachePath = path.join(pdfDir, `${path.parse(file).name}.md`);
      let markdownText = "";

      // Info: (20260612 - Julian) 若本地已經有 LlamaCloud 解析過的 .md 快取，則直接讀取，節省 LlamaCloud 額度
      if (fs.existsSync(mdCachePath)) {
        console.log(
          `ℹ️  [1/3] 找到本地快取 Markdown，跳過 LlamaCloud 解析: ${path.parse(file).name}.md`,
        );
        markdownText = fs.readFileSync(mdCachePath, "utf-8");
      } else {
        console.log(
          `📄 [1/3] 正在透過新版 LlamaCloud 進行 Agentic OCR 解析: ${file}`,
        );
        // Info: (20260612 - Julian) 呼叫新版解析方法 (包含上傳與自動輪詢等待)
        const parseResult = await client.parsing.parse({
          upload_file: fs.createReadStream(filePath),
          tier: "agentic",
          version: "latest",
          expand: ["markdown_full"],
        });

        // Info: (20260612 - Julian) 取得回傳的完整 markdown 文本
        markdownText = parseResult.markdown_full || "";

        // Info: (20260612 - Julian) 選擇性快取 .md 檔案到本地
        fs.writeFileSync(mdCachePath, markdownText);
      }

      // Info: (20260630 - Julian) 步驟 1.5：呼叫 Gemini API 萃取詮釋資料，並寫入 PostgreSQL
      console.log(`🤖 [1.5/3] 正在呼叫 Gemini API 進行 AI 詮釋資料萃取...`);
      const textSnippet = markdownText.slice(0, 3000);
      let meta: IExtractedMetadata;

      try {
        meta = await extractMetadata(textSnippet, file);
        console.log(`✨ [1.5/3] 萃取結果：`, JSON.stringify(meta, null, 2));
      } catch (err) {
        console.error(`⚠️  AI 詮釋資料萃取失敗，改用預設檔名解析邏輯:`, err);
        const [fallbackCompany, fallbackYear] = file
          .replace(".pdf", "")
          .split("_");
        meta = {
          companyName: fallbackCompany || "未知企業",
          title: "永續報告書",
          reportYear: fallbackYear || "2024",
          period: `${fallbackYear || "2024"}/01/01 ~ ${fallbackYear || "2024"}/12/31`,
          industry: "其他",
          capital: "100億以上",
          verificationAgency: "無",
          verificationStandards: "無",
          assuranceAgency: "無",
          assuranceStandards: "無",
          isVerifiedByThirdParty: false,
        };
      }

      const report = await prisma.report.create({
        data: {
          companyName: meta.companyName,
          title: meta.title || `${meta.reportYear} 年永續報告書`,
          reportYear: meta.reportYear,
          period: meta.period,
          industry: meta.industry,
          capital: meta.capital,
          verificationAgency: meta.verificationAgency,
          verificationStandards: meta.verificationStandards,
          assuranceAgency: meta.assuranceAgency,
          assuranceStandards: meta.assuranceStandards,
          isVerifiedByThirdParty: meta.isVerifiedByThirdParty,
          pdfPath: file,
        },
      });

      const reportId = report.id;
      const companyName = report.companyName;
      const year = report.reportYear;

      // Info: (20260612 - Julian) 將 markdown 依照頁面分隔符號 (---) 拆分成單頁文字
      const pages = markdownText.split(/(?:\r?\n)+---(?:\r?\n)+/);
      console.log(`📄 [2/3] 偵測到 PDF 共有 ${pages.length} 頁。`);

      const chunksWithPage: { chunk: string; pageNumber: number }[] = [];
      pages.forEach((pageText, pageIdx) => {
        const pageNumber = pageIdx + 1;
        const pageChunks = chunkMarkdown(pageText);
        for (const chunk of pageChunks) {
          chunksWithPage.push({ chunk, pageNumber });
        }
      });

      console.log(
        `✂️  [2/3] Markdown 轉換與切塊完成。共切分成 ${chunksWithPage.length} 個區塊。`,
      );
      console.log(`🧠 [3/3] 開始呼叫 Ollama 生成向量並寫入 LanceDB...`);

      const recordsToInsert: ILanceDBRow[] = [];
      const BATCH_SIZE = 5; // Info: (20260612 - Julian) 控制並行數量，避免過度耗用 Ollama 資源

      for (let i = 0; i < chunksWithPage.length; i += BATCH_SIZE) {
        const batch = chunksWithPage.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (item, batchIdx) => {
          const absoluteIdx = i + batchIdx;
          const formattedText = `### 企業: ${companyName} (${year}年報告) [第 ${item.pageNumber} 頁]\n${item.chunk}`;
          const vector = await getEmbedding(formattedText);
          return {
            id: `report_${reportId}_lp_${absoluteIdx}`,
            vector: new Float32Array(vector),
            text: formattedText,
            reportId: String(reportId),
            companyName: companyName,
            pageNumber: item.pageNumber,
          };
        });

        const batchResults = await Promise.all(batchPromises);
        recordsToInsert.push(...batchResults);
      }

      if (recordsToInsert.length > 0) {
        await table.add(recordsToInsert);
        console.log(
          `✅ 檔案 [${file}] 匯入成功！已存入 PostgreSQL (ID: ${reportId}) 與 LanceDB 共 ${recordsToInsert.length} 筆向量資料。`,
        );
      }
    } catch (error) {
      console.error(`❌ 處理檔案 [${file}] 時發生錯誤:`, error);
      continue;
    }
  }

  console.log("\n🎉 所有 PDF 檔案批次匯入程序全部結束！");
  process.exit(0);
}

runBatchPipeline();
