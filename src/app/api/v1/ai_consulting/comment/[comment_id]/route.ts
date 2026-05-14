import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { talkRepo } from "@/repositories/talk.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260428 - Julian) 刪除單一留言
 * DELETE /api/v1/ai_consulting/comment/:comment_id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ comment_id: string }> },
) {
  try {
    // Info: (20260212 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      console.error("User not found");
      return jsonFail(API_ERRORS.IN_USER_NOT_FOUND);
    }

    const { comment_id: commentId } = await params;

    if (!commentId) {
      console.error("Comment not found");
      return jsonFail(API_ERRORS.IN_COMMENT_NOT_FOUND);
    }

    // Info: (20260428 - Julian) 刪除留言
    const result = await talkRepo.deleteComment(commentId);

    return jsonOk({ success: !!result });
  } catch (error) {
    console.error(`[API] /comment/${(await params).comment_id} error:`, error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
