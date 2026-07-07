"use server";

import { ChatService } from "@/services/chat.service";

export interface ISmartParseResult {
  origin?: { lat: number; lng: number };
  dest?: { lat: number; lng: number };
  exportPort?: { lat: number; lng: number };
  importPort?: { lat: number; lng: number };
  exportAirport?: { lat: number; lng: number };
  importAirport?: { lat: number; lng: number };
  weightKg?: number;
}

export async function parseSmartInput(
  text: string,
): Promise<ISmartParseResult> {
  try {
    // Info: (20260707 - Julian)
    // apiKey 的讀取與驗證已移至 ChatService 內部處理，此處直接使用預設建構
    const chatService = new ChatService();

    const prompt = `
            You are a professional logistics AI assistant.
            Extract the precise logistics routing coordinates and cargo weight from the user's description.
            
            User Request: "${text}"
            
            You must output ONLY a valid JSON object matching the following strict structure. Do NOT include markdown code blocks like \`\`\`json or any other text.
            
            {
                "origin": {"lat": float, "lng": float},
                "dest": {"lat": float, "lng": float},
                "exportPort": {"lat": float, "lng": float},
                "importPort": {"lat": float, "lng": float},
                "exportAirport": {"lat": float, "lng": float},
                "importAirport": {"lat": float, "lng": float},
                "weightKg": float
            }
            
            Rules:
            1. For origin and dest, accurately infer the exact latitude and longitude of the described cities/locations.
            2. For exportPort and importPort, identify the closest MAJOR international seaport to origin and dest respectively, and provide its coordinates.
            3. For exportAirport and importAirport, identify the closest MAJOR international cargo airport to origin and dest respectively, and provide its coordinates.
            4. If the weight is mentioned, convert it to kg. If NOT mentioned, default to 1000.
            5. CRITICAL: If the origin and destination are separated by an ocean or are on different continents (e.g., Japan to USA, Asia to Europe), it is IMPOSSIBLE to use pure land transport. In such cases, if you were to output a mode, it MUST be SEA_LAND, AIR_LAND, or SEA_LAND_AIR. DO NOT assume continuous land connection where none exists.
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

    const data = JSON.parse(resultText) as ISmartParseResult;
    return data;
  } catch (error) {
    console.error("[Action Error] parseSmartInput:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "transportation_carbon_footprint_calculator.error.ai_parse_failed",
    );
  }
}

export async function parseMultipleRoutesFromText(text: string): Promise<
  Array<{
    origin: string;
    dest: string;
    waypoints?: Array<{ name: string; lat: number; lng: number }>;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    weightKg?: number;
  }>
> {
  try {
    const chatService = new ChatService();
    const prompt = `
            You are a professional logistics AI assistant.
            Extract all distinct transportation routes from the user's description.
            For each route, identify the origin and destination as a string description (e.g., city name, address).
            CRITICAL: You MUST accurately infer the exact latitude and longitude for both the origin and destination based on their locations. Do NOT omit them. If you are unsure, make your best guess for the city or airport coordinates.
            Extract the weight or mass of the cargo in kilograms (KG) as a number. Be aware that the input might be conversational text, or it might be tabular/CSV data (e.g., a number under a "Weight" or "Weight(kg)" column). If you see a number corresponding to weight, extract it.
            Extract any mentioned waypoints or intermediate stops. For each waypoint, accurately infer its exact latitude and longitude based on the location name. If none are mentioned, omit the field or leave it empty.
            
            User Request: "${text}"
            
            You must output ONLY a valid JSON array of objects matching the following structure. Do NOT include markdown code blocks.
            
            [
              {
                  "origin": "String description of origin",
                  "dest": "String description of destination",
                  "waypoints": [
                    { "name": "Singapore", "lat": 1.29, "lng": 103.85 },
                    { "name": "Rotterdam", "lat": 51.92, "lng": 4.47 }
                  ],
                  "originLat": 12.34,
                  "originLng": 56.78,
                  "destLat": 12.34,
                  "destLng": 56.78,
                  "weightKg": 1000
              }
            ]
        `;
    const rawResult = await chatService.generateRaw(prompt, undefined, {
      modelName: "gemini-2.5-flash",
    });
    let resultText = rawResult.trim();
    if (resultText.startsWith("\`\`\`json"))
      resultText = resultText
        .replace("\`\`\`json", "")
        .replace("\`\`\`", "")
        .trim();
    else if (resultText.startsWith("\`\`\`"))
      resultText = resultText.replace("\`\`\`", "").trim();

    return JSON.parse(resultText);
  } catch (error) {
    console.error("[Action Error] parseMultipleRoutesFromText:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "transportation_carbon_footprint_calculator.error.ai_parse_failed",
    );
  }
}
