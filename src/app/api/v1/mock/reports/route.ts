import { NextRequest, NextResponse } from "next/server";
import { mockReports } from "@/interfaces/business_monitor";
import { IAIResponse } from "@/interfaces/business_monitor";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Info:(20260609 - Julian) 用於開發 Business Monitor 的 Mock API，之後會移除
 * GET /api/v1/mock/reports?query={query}&company={company}&industry={industry}&year={year}&page={page}&pageSize={pageSize}
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("query")?.toLowerCase() || "";
  const company = searchParams.get("company") || "";
  const industry = searchParams.get("industry") || "";
  const year = searchParams.get("year") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "4", 10);

  // Info:(20260609 - Julian) 若無 AI 查詢，模擬基本網路延遲
  const delayMs = query ? 0 : 500;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  let filtered = [...mockReports];
  let aiResponse: IAIResponse | undefined;

  // Info:(20260609 - Julian) 關鍵字與 AI 意圖過濾 (串接 Gemini API)
  if (query) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      // Info:(20260609 - Julian) 將 mockReports 當作參考資料餵給 LLM
      const contextData = mockReports.map((r) => ({
        id: r.id,
        company: r.company,
        title: r.title,
        industry: r.industry,
      }));

      const prompt = `你是一個企業永續報告觀測助理。請根據使用者問題回答。
雖然提供的參考資料僅包含報告的 Metadata (無內文)，你可以利用你既有的知識庫來回答使用者關於該企業的具體永續數據 (例如離職率、碳排放、減碳目標等)。
回答完畢後，請從提供的報告清單中挑出最符合的報告，將其 ID 放入 sourceReportIds 陣列。
如果使用者的問題完全無關或無法回答，請將 answer 設為「在現有報告中找不到相關解答。」，並讓 sourceReportIds 為空陣列。

參考報告清單：
${JSON.stringify(contextData, null, 2)}

使用者問題：
${query}

請嚴格依照此 JSON Schema 格式回傳（不需要 markdown 標記）：
{
  "answer": "字串，你的回答",
  "sourceReportIds": [數字陣列，對應的報告 ID]
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      aiResponse = JSON.parse(text) as IAIResponse;
    } catch (error) {
      console.error("LLM API 發生錯誤:", error);
      // Info: (20260609 - Julian) 發生錯誤時退回預設的錯誤提示
      aiResponse = {
        answer: "系統忙線中或未設定正確的 API Key，請稍後再試。",
        sourceReportIds: [],
      };
    }

    // Info:(20260609 - Julian) 若為 AI 查詢，強制將列表收斂為只顯示來源報告
    filtered = filtered.filter((r) =>
      aiResponse?.sourceReportIds.includes(r.id),
    );
  } else {
    // Info:(20260609 - Julian) 只有非 AI 查詢時，才套用常規過濾邏輯
    if (company) {
      filtered = filtered.filter(
        (r) => company.includes(r.company) || r.company.includes(company),
      );
    }

    if (industry) {
      filtered = filtered.filter((r) => r.industry === industry);
    }

    if (year) {
      filtered = filtered.filter((r) => r.reportYear === year);
    }
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedReports = filtered.slice(startIndex, startIndex + pageSize);

  return NextResponse.json({
    payload: {
      reports: paginatedReports,
      total,
      totalPages,
      ...(aiResponse && { aiResponse }),
    },
  });
}
