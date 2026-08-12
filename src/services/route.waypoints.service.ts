"use server";

import { ChatService, isLlmKeyMissingError } from "@/services/chat.service";
import { AppError } from "@/lib/utils/error";

export async function parseWaypointsToCoordinates(
  waypointsDesc: string,
): Promise<Array<{ lat: number; lng: number; name: string }>> {
  if (!waypointsDesc || !waypointsDesc.trim()) return [];

  try {
    /**
     * Info: (20260812 - Luphia) 不再自行讀 env 並預先擋掉 —— 交給 ChatService 解析。
     *
     * 原本先從環境變數讀金鑰、缺就拋錯,再把它當「明確傳入」送進
     * ChatService。那讓資料庫設定完全失效(ChatService 的優先序是
     * 建構子 > DB > env),而且在**已經把金鑰搬進 /admin/settings、env 不再保留**
     * 的部署上,這個提前擋下會讓功能直接不可用 —— 金鑰明明設好了。
     *
     * 缺金鑰的錯誤改由 ChatService 在實際呼叫時拋出,並帶
     * `LLM_KEY_MISSING_ERROR_MARKER`,上層以 `isLlmKeyMissingError()` 分類
     * (見 admin/pdf_editor 的三條路由)。
     *
     * Info: (20260812 - Luphia) 原本寫「訊息仍含 GEMINI_API_KEY,字串比對行為不變」,
     * 而那個機制已在同一支 branch 的下一個 commit 換成具名分類 —— 註解沒跟上。
     */
    const chatService = new ChatService();

    const prompt = `
            You are a professional logistics AI assistant.
            The user has provided a list of waypoints (e.g. cities, ports, addresses) separated by commas.
            Extract each distinct waypoint and accurately infer its exact latitude and longitude.

            User Request: "${waypointsDesc}"
            
            You must output ONLY a valid JSON array of objects matching the following strict structure. Do NOT include markdown code blocks like \`\`\`json or any other text.
            
            [
              {
                "name": "String description of the waypoint (e.g. Singapore)",
                "lat": float,
                "lng": float
              }
            ]
        `;

    const rawResult = await chatService.generateRaw(prompt, undefined, {
      modelName: "gemini-2.5-flash",
    });
    let resultText = rawResult.trim();

    if (resultText.startsWith("\`\`\`json")) {
      resultText = resultText
        .replace("\`\`\`json", "")
        .replace("\`\`\`", "")
        .trim();
    } else if (resultText.startsWith("\`\`\`")) {
      resultText = resultText.replace("\`\`\`", "").trim();
    }

    const data = JSON.parse(resultText) as Array<{
      lat: number;
      lng: number;
      name: string;
    }>;
    return data;
  } catch (error) {
    console.error("[Action Error] parseWaypointsToCoordinates:", error);

    /**
     * Info: (20260812 - Luphia) 設定問題不吞成「這條路線沒有中繼站」（PR review F5）。
     *
     * 回 `[]` 對「模型看不懂那串地名」是合理的降級,對「金鑰沒設」或
     * 「系統設定驗簽失敗」不是 —— **中繼站會改變路線,路線會改變運輸碳排數字**,
     * 而配合已知的「路網資料只有臺灣,境外陸運段全數為推估」
     * (`known_issues/osrm_taiwan_only_coverage.md`),那個降級會**靜默進入申報數值**。
     *
     * 這兩種成因都是可分類的,而且都不是重試能解的:往上拋讓呼叫端知道
     * 「這不是查不到,是這台機器沒設好」。ADR 013 已經立下「估算必須誠實標示」的慣例,
     * 這裡至少不能連「發生了設定錯誤」都不說。
     */
    if (isLlmKeyMissingError(error) || error instanceof AppError) {
      throw error;
    }
    return [];
  }
}
