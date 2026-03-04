import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260112 - Julian) 對評論點讚/倒讚
 * POST /api/v1/ai_talk/comment/:comment_id/react
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
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "User not found");
    }

    const body = await request.json();
    const { reaction } = body;

    if (!reaction) {
      console.error("Reaction is required");
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Reaction is required");
    }

    const { comment_id: commentId } = await params;

    if (!commentId) {
      console.error("Comment not found");
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Comment not found");
    }

    const author = await prisma.user.findUnique({
      where: { address: user.address },
    });
    if (!author) {
      console.error("Author not found");
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Author not found");
    }
    const userId = user.id;

    // Info: (20260212 - Julian) 1. 尋找現有的 Reaction
    const existing = await prisma.reaction.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
    });

    let currentReaction = reaction;

    // Info: (20260212 - Julian) 2. 邏輯處理
    if (existing) {
      if (existing.type === reaction) {
        // Info: (20260212 - Julian) 情境 1：如果按了同一個按鈕，代表取消 (Delete)
        await prisma.reaction.delete({
          where: { id: existing.id },
        });
        currentReaction = null;
      } else {
        // Info: (20260212 - Julian) 情境 2：如果按了不同按鈕，代表切換 (Update)
        await prisma.reaction.update({
          where: { id: existing.id },
          data: { type: reaction },
        });
      }
    } else {
      // Info: (20260212 - Julian) 情境 3：不存在則建立 (Create)
      await prisma.reaction.create({
        data: { userId, commentId, type: reaction },
      });
    }

    // Info: (20260212 - Julian) 3. 重新計算該評論的按讚/倒讚總數
    const countOfLike = await prisma.reaction.count({
      where: { commentId, type: "LIKE" },
    });
    const countOfDislike = await prisma.reaction.count({
      where: { commentId, type: "DISLIKE" },
    });

    return jsonOk({
      countOfLike,
      countOfDislike,
      userReaction: currentReaction, // Info: (20260212 - Julian) 回傳當前使用者的狀態：LIKE | DISLIKE | null
    });
  } catch (error) {
    console.error(`[API] /comment/${(await params).comment_id} error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
