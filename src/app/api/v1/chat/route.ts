import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { ChatService } from '@/services/chat.service';

export async function POST(request: NextRequest) {
  try {
    const { message, tags, image, mimeType } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY');
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Server configuration error');
    }

    const chatService = new ChatService(apiKey);
    const reply = await chatService.generateResponse(message, tags, image, mimeType);

    return jsonOk({ reply });
  } catch (error) {
    console.error('[API] /chat error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
