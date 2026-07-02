"use server";

import { ChatService } from "@/services/chat.service";

export async function parseWaypointsToCoordinates(
  waypointsDesc: string,
): Promise<Array<{ lat: number; lng: number; name: string }>> {
  if (!waypointsDesc || !waypointsDesc.trim()) return [];

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const chatService = new ChatService(apiKey);

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
