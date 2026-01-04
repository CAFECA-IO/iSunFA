import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { message, tags, image, mimeType } = await request.json();
    const apiKey = process.env.GOOGLE_API_KEY;
    const modelName = process.env.MODEL || 'gemini-1.5-flash';

    if (!apiKey) {
      console.error('Missing GOOGLE_API_KEY');
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Server configuration error');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      You are an expert accountant specializing in IFRS (International Financial Reporting Standards).
      User Input: "${message}"
      Selected Tags: ${tags?.join(', ') || 'None'}
      
      Task:
      1. Identify the documented evidence (e.g., Invoice, Receipt, Contract).
      2. Analyze the content based on IFRS standards.
      3. Suggest appropriate accounting entries (Debit/Credit).
      4. If user asks a generic question, answer it as an accountant.
      5. Reply in Traditional Chinese (Taiwan).
    `;

    const parts = [
      { text: prompt },
      ...(image
        ? [
          {
            inlineData: {
              data: image,
              mimeType: mimeType || 'image/jpeg',
            },
          },
        ]
        : []),
    ];

    const result = await model.generateContent(parts);
    const response = await result.response;
    const reply = response.text();

    return jsonOk({ reply });
  } catch (error) {
    console.error('[API] /chat error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
