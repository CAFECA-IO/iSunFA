"use server";

import { ChatService } from "@/services/chat.service";

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
     * 缺金鑰的錯誤改由 ChatService 在實際呼叫時拋出。訊息仍含 "GEMINI_API_KEY",
     * 因此上層以字串比對辨識這個成因的地方(見 admin/pdf_editor 的三條路由)
     * 行為不變。
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
    return [];
  }
}
