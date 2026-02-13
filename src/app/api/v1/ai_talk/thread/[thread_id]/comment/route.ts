import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { IComment } from "@/interfaces/ai_talk";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260112 - Julian) 取得討論串的評論
 * GET /api/v1/ai_talk/thread/:thread_id/comment
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  try {
    // Info: (20260212 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const { thread_id: threadId } = await params;

    if (!threadId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid thread ID");
    }

    // Info: (20260212 - Julian) 取得登入的使用者
    const loginUserId = user.id;

    // Info: (20260212 - Julian) 一次取得該討論串所有評論及其關聯資料
    const comments = await prisma.comment.findMany({
      where: { threadId },
      include: {
        user: true,
        replyToUser: true,
        reactions: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Info: (20260212 - Julian) 格式化評論內容
    const formattedComments: IComment[] = comments.map((comment) => ({
      id: comment.id,
      authorName: comment.user?.name ?? "Unknown",
      content: comment.content,
      createdAt: Math.floor(comment.createdAt.getTime() / 1000),
      likes: comment.reactions.filter((r) => r.type === "LIKE").length,
      dislikes: comment.reactions.filter((r) => r.type === "DISLIKE").length,
      isProfessional: comment.isProfessional,
      isVerified: false,
      parentId: comment.parentCommentId,
      replyToUserName: comment.replyToUser?.name || undefined,
      replies: [],
      isDeleted: !!comment.deletedAt,
      userReaction:
        comment.reactions.find((r) => r.userId === loginUserId)?.type ?? null,
    }));

    // Info: (20260212 - Julian) 建立巢狀結構
    const commentMap = new Map<string, IComment>();
    formattedComments.forEach((c) => commentMap.set(c.id, c));

    const rootComments: IComment[] = [];
    formattedComments.forEach((c) => {
      // 如果有父評論，且父評論在同一個 Thread 下，則加入父評論的 replies
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId)!.replies.push(c);
      } else {
        // Info: (20260112 - Julian) 沒有父評論，或者是頂層評論
        rootComments.push(c);
      }
    });

    return jsonOk(rootComments);
  } catch (error) {
    console.error(
      `[API] /api/v1/ai_talk/thread/${(await params).thread_id}/comment GET error:`,
      error,
    );
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

/**
 * Info: (20260112 - Julian) 新增評論或回覆
 * POST /api/v1/ai_talk/thread/:thread_id/comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  try {
    // Info: (20260212 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const body = await request.json();
    const { content, parentId, isProfessional, replyTo } = body;

    if (!content) {
      console.error("Content is required");
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Content is required");
    }

    const { thread_id: threadId } = await params;

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      console.error("Thread not found");
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Thread not found");
    }

    const parentComment = parentId
      ? await prisma.comment.findUnique({
          where: { id: parentId },
        })
      : null;

    const replyToUser = replyTo
      ? await prisma.user.findFirst({
          where: { name: replyTo },
        })
      : null;

    // Info: (20260212 - Julian) 取得登入的使用者
    const loginUserId = user.id;

    // Info: (20260212 - Julian) 限制巢狀評論只有兩層：如果評論已有 parentCommentId，則直接使用該 parentCommentId
    const parentCommentId =
      parentComment?.parentCommentId || parentComment?.id || null;

    // Info: (20260212 - Julian) 新增評論
    await prisma.comment.create({
      data: {
        userId: loginUserId,
        threadId,
        content,
        isProfessional,
        parentCommentId,
        replyToUserId: replyToUser?.id ?? null,
      },
    });

    return jsonOk({});
  } catch (error) {
    console.error(
      `[API] /thread/${(await params).thread_id}/comment error:`,
      error,
    );
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
