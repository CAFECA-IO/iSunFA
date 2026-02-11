import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { mockThreads } from '@/interfaces/ai_talk';
// import { ChatService } from '@/services/chat.service';

/**
 * 取得所有討論串
 */
export async function GET() {
  try {
    const threads = mockThreads

    return jsonOk(threads);
  } catch (error) {
    console.error('[API] /threads error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

/**
 * 向 AI 提問(建立討論串)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question /* , attachments = [] */ } = body;

    // const apiKey = process.env.GEMINI_API_KEY;

    // if (!apiKey) {
    //   console.error('Missing GEMINI_API_KEY');
    //   return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Server configuration error');
    // }

    // const chatService = new ChatService(apiKey);
    // const reply = await chatService.generateResponse(message, tags, image, mimeType);

    if (!question) {
      console.error('Missing question');
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Question is required');
    }

    return jsonOk({
      message: 'Thread created successfully',
    });
  } catch (error) {
    console.error('[API] /threads error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
