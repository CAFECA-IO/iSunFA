import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { talkRepo } from "@/repositories/talk.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260112 - Julian) 對評論點讚/倒讚
 * POST /api/v1/ai_consulting/comment/:comment_id/react
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ comment_id: string }> },
) {
  try {
    // Info: (20260212 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      console.error("User not found");
      return jsonFail({ code: "IN000099", message: "User not found", status: ApiCode.INTERNAL_SERVER_ERROR });
    }

    const body = await request.json();
    const { reaction } = body;

    if (!reaction) {
      console.error("Reaction is required");
      return jsonFail({ code: "IN000099", message: "Reaction is required", status: ApiCode.INTERNAL_SERVER_ERROR });
    }

    const { comment_id: commentId } = await params;

    if (!commentId) {
      console.error("Comment not found");
      return jsonFail({ code: "IN000099", message: "Comment not found", status: ApiCode.INTERNAL_SERVER_ERROR });
    }

    const author = await webAuthnRepo.findUserByAddress(user.address);
    if (!author) {
      console.error("Author not found");
      return jsonFail({ code: "IN000099", message: "Author not found", status: ApiCode.INTERNAL_SERVER_ERROR });
    }
    const userId = user.id;

    const existing = await talkRepo.getReaction(userId, commentId);

    let currentReaction = reaction;

    // Info: (20260212 - Julian) 2. 邏輯處理
    if (existing) {
      if (existing.type === reaction) {
        // Info: (20260212 - Julian) 情境 1：如果按了同一個按鈕，代表取消 (Delete)
        await talkRepo.deleteReaction(existing.id);
        currentReaction = null;
      } else {
        // Info: (20260212 - Julian) 情境 2：如果按了不同按鈕，代表切換 (Update)
        await talkRepo.updateReaction(existing.id, reaction);
      }
    } else {
      // Info: (20260212 - Julian) 情境 3：不存在則建立 (Create)
      await talkRepo.createReaction(userId, commentId, reaction);
    }

    // Info: (20260212 - Julian) 3. 重新計算該評論的按讚/倒讚總數
    const countOfLike = await talkRepo.countReactions(commentId, "LIKE");
    const countOfDislike = await talkRepo.countReactions(commentId, "DISLIKE");

    return jsonOk({
      countOfLike,
      countOfDislike,
      userReaction: currentReaction, // Info: (20260212 - Julian) 回傳當前使用者的狀態：LIKE | DISLIKE | null
    });
  } catch (error) {
    console.error(`[API] /comment/${(await params).comment_id} error:`, error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
