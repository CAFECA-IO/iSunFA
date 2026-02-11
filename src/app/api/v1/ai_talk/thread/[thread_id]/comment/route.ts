import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { mockThreads } from '@/interfaces/ai_talk';

/**
 * 新增評論或回覆
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ thread_id: string }> }) {
  try {
    const body = await request.json();
    const { content /* , parentId */ } = body;

    if (!content) {
      console.error('Content is required');
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Content is required');
    }
    
    const { thread_id: threadId } = await params;
    const thread = mockThreads.find((thread) => thread.id === Number(threadId));

    if (!thread) {
      console.error('Thread not found');
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Thread not found');
    }
    
    return jsonOk({
        message: `Thread ${threadId} commented successfully with ${content}`,
    });
  } 
  catch (error) {
    console.error(`[API] /thread/${(await params).thread_id}/comment error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}