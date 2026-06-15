import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import LlamaCloud from "@llamaindex/llama-cloud";
import { lanceDBService } from "@/services/lancedb.service";
import { ILanceDBRow } from "@/interfaces/lance_db";

dotenv.config();

const OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings";
const EMBED_MODEL = "nomic-embed-text";

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

    /** ToDo: (20260612 - Julian) 目前 companyName 是直接從檔名提取的，未來須加入 LLM Metadata Extraction (資料萃取) 的機制。
     * 具體做法如下：
     * 1. 讓 LLM 自己讀前幾頁： 當 LlamaCloud 把 PDF 轉成 Markdown 之後，我們不要立刻切塊存入 LanceDB。我們先把文件的前 1000~2000 字（通常包含封面、目錄、董事長致詞）丟給一個輕量級的 LLM。
     * 2. 要求 LLM 判斷公司： 給 LLM 一個 Prompt：「請閱讀以下報告片段，判斷這份報告是屬於哪一家企業的？請回傳該企業的『全名』與『常見簡稱』的 JSON。」
     * 3. 將萃取結果存入 LanceDB： LLM 回傳 {"fullName": "亞洲水泥股份有限公司", "shortName": "亞泥"} 後，我們再把這兩個精確的名字，當作 Metadata 寫入 LanceDB 的欄位裡。
     */

    const [companyName, yearStr] = file.split("_");
    const year = parseInt(yearStr) || 2026;
    const filePath = path.join(pdfDir, file);

    try {
      // Info: (20260612 - Julian) 先檢查是否已經存在於 LanceDB，若有則直接跳過，節省 Embedding 與 API 呼叫時間
      const existingRows = await table
        .query()
        .where(`reportId = '${file.replace(/'/g, "''")}'`)
        .limit(1)
        .toArray();
      if (existingRows.length > 0) {
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
            id: `${companyName}_${year}_lp_${absoluteIdx}`,
            vector: new Float32Array(vector),
            text: formattedText,
            reportId: file,
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
          `✅ 檔案 [${file}] 匯入成功！已存入 ${recordsToInsert.length} 筆向量資料。`,
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
