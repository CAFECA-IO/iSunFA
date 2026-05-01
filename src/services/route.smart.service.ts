'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ISmartParseResult {
    origin?: { lat: number; lng: number };
    dest?: { lat: number; lng: number };
    exportPort?: { lat: number; lng: number };
    importPort?: { lat: number; lng: number };
    exportAirport?: { lat: number; lng: number };
    importAirport?: { lat: number; lng: number };
    weightKg?: number;
}

export async function parseSmartInput(text: string): Promise<ISmartParseResult> {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        `;

        const result = await model.generateContent(prompt);
        let resultText = result.response.text().trim();

        if (resultText.startsWith("\`\`\`json")) {
            resultText = resultText.replace("\`\`\`json", "").replace("\`\`\`", "").trim();
        } else if (resultText.startsWith("\`\`\`")) {
            resultText = resultText.replace("\`\`\`", "").trim();
        }

        const data = JSON.parse(resultText) as ISmartParseResult;
        return data;
    } catch (error) {
        console.error("[Action Error] parseSmartInput:", error);
        throw new Error(error instanceof Error ? error.message : "解析語意時發生錯誤");
    }
}
