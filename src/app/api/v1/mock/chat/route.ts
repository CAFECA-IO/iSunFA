import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { lanceDBService } from "@/services/lancedb.service";
import { ILanceDBRow } from "@/interfaces/lance_db";

const OLLAMA_HOST = "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";
const LLM_MODEL = "gemma4:e4b"; // Info: (20260612 - Julian) 指定模型為 gemma4:e4b

// Info: (20260612 - Julian) 輔助函式：將用戶問題轉為向量
async function getQueryEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  const data = await response.json();
  return data.embedding;
}

// Info: (20260612 - Julian) 輔助函式：處理 Ollama 非標準 JSON Stream 的轉換
async function responseToJSON(response: Response) {
  const text = await response.text();
  return JSON.parse(text);
}

// Info: (20260612 - Julian) 輔助函式：透過 LLM 從提問中擷取公司名稱 (Self-Querying)
async function extractCompanyNames(question: string): Promise<string[]> {
  const prompt = `你是一個關鍵字萃取器。請從以下問題中，擷取所有提到的「公司或企業名稱的簡稱或全名」。
請務必回傳合法的 JSON 格式，包含一個 "companies" 陣列，不要有其他文字。
如果沒有提到任何公司，請回傳 {"companies": []}。

問題：${question}
輸出範例：{"companies": ["亞泥", "台泥"]}`;

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: prompt,
        stream: false,
      }),
    });
    const data = await responseToJSON(response);
    const rawResponse = data.response;
    const match = rawResponse.match(/\{.*?\}/s);
    const jsonStr = match ? match[0] : rawResponse;
    const result = JSON.parse(jsonStr);
    return Array.isArray(result.companies) ? result.companies : [];
  } catch (error) {
    console.error("❌ 實體擷取或解析失敗:", error);
    return []; // Info: (20260612 - Julian) 若失敗則回傳空陣列，退階回純向量檢索
  }
}

/**
 * Info:(20260610 - Julian) 測試 AI 諮詢功能
 * POST /api/v1/mock/chat
 */
export const POST = async (req: NextRequest) => {
  try {
    const { question } = await req.json();

    if (!question) {
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    // Info: (20260612 - Julian) 透過 LLM 擷取公司名稱 (Metadata Pre-filtering)
    const companyNames = await extractCompanyNames(question);

    // Info: (20260612 - Julian) 將用戶問題轉換為向量
    const queryVector = await getQueryEmbedding(question);

    // Info: (20260612 - Julian) 到 LanceDB 進行相似度檢索
    const table = await lanceDBService.getTable();
    const DISTANCE_THRESHOLD = 350; // Info: (20260612 - Julian) 距離閾值：越小越相似
    const matchedDocs: ILanceDBRow[] = [];

    if (companyNames.length > 0) {
      // Info: (20260612 - Julian) 1. 針對每家公司單獨檢索，確保都有結果 (Multi-Entity Self-Querying)
      const companyDocsList: ILanceDBRow[][] = [];
      const limitPerCompany = 3; // Info: (20260612 - Julian) 每家公司最多拿 3 筆，確保多樣性與比較基礎

      for (const company of companyNames) {
        const safeCompany = company.replace(/'/g, "''");
        const docs = (await table
          .search(new Float32Array(queryVector))
          .where(`companyName LIKE '%${safeCompany}%'`)
          .limit(limitPerCompany)
          .toArray()) as unknown as ILanceDBRow[];

        console.log(`🔍 針對 [${company}] 檢索到 ${docs.length} 筆資料`);

        // Info: (20260612 - Julian) 過濾距離閾值：大於 350 的不納入檢索
        const filteredDocs = docs.filter(
          (doc) =>
            doc._distance !== undefined && doc._distance < DISTANCE_THRESHOLD,
        );
        if (filteredDocs.length > 0) {
          companyDocsList.push(filteredDocs);
        }
      }

      // Info: (20260612 - Julian) 交錯合併 (Interleave) 檢索結果，確保各家公司的最相關資料排在最前面，避免因長度限制被 slice 截斷
      let hasMore = true;
      let index = 0;
      while (hasMore) {
        hasMore = false;
        for (const list of companyDocsList) {
          if (index < list.length) {
            matchedDocs.push(list[index]);
            hasMore = true;
          }
        }
        index++;
      }
    } else {
      // Info: (20260612 - Julian) 退階：無指定公司，進行純向量檢索
      const rawDocs = (await table
        .search(new Float32Array(queryVector))
        .limit(6)
        .toArray()) as unknown as ILanceDBRow[];
      const filtered = rawDocs.filter(
        (doc) =>
          doc._distance !== undefined && doc._distance < DISTANCE_THRESHOLD,
      );
      matchedDocs.push(...filtered);
    }

    if (matchedDocs.length === 0) {
      return jsonOk({
        answer: "抱歉，根據目前的報告資料，無法找到足夠相關的數據。",
      });
    }

    // Info: (20260612 - Julian) 將搜尋到的 Markdown 文字片段拼接在一起，並加入防溢位保護（擴大到 3500 字元以支持多實體對比）
    const context = matchedDocs
      .map((doc) => doc.text)
      .join("\n\n---\n\n")
      .slice(0, 3500);
    // Info: (20260612 - Julian) 步驟 3：撰寫嚴謹的 RAG Prompt
    const systemPrompt = `你是一個專業的企業報告分析師。請嚴格根據下方提供的【參考資料】來回答使用者的【問題】。
規則：
1. 只能根據【參考資料】內的數據與事實回答，切勿憑空捏造或憑空猜測。
2. 如果【參考資料】中找不到答案，請直接回答：「抱歉，根據目前的報告資料，無法找到相關數據。」，不要嘗試瞎編。
3. 如果資料包含表格，請精準解讀表格中的對應欄位。
4. 不需要開場白（例：根據您提供的【參考資料】...），直接回答問題即可。

【參考資料】：
${context}

【問題】：
${question}`;

    const llmResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: systemPrompt,
        stream: false, // ToDo: (20260612 - Julian) 先採用一次性回傳，穩定後可改為 true 實現 Stream 逐字效果
      }),
    });
    const llmData = await responseToJSON(llmResponse);

    // Info: (20260612 - Julian) 組合結果，回傳給 Next.js 前端
    const result = {
      answer: llmData.response,
      sources: matchedDocs.map((d) => ({
        reportId: d.reportId,
        page: d.pageNumber,
      })),
    };

    return jsonOk(result);
  } catch (error) {
    console.error("❌ AI 諮詢失敗:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
};
