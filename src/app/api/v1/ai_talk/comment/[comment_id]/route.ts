import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { mockThreads } from '@/interfaces/ai_talk';

/**
 * 對評論點讚/倒讚
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ comment_id: string }> }) {
  try {
    const body = await request.json();
    const { reaction } = body;

    if (!reaction) {
      console.error('Reaction is required');
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Reaction is required');
    }
    
    const { comment_id: commentId } = await params;
    const comment = mockThreads.find((thread) => thread.id === Number(commentId));

    if (!comment) {
      console.error('Comment not found');
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Comment not found');
    }
    
    return jsonOk({
        message: `Comment ${commentId} reacted successfully with ${reaction}`,
    });
  } 
  catch (error) {
    console.error(`[API] /comment/${(await params).comment_id} error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}