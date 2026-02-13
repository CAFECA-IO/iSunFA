import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { IThread } from "@/interfaces/ai_talk";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ChatService } from "@/services/chat.service";


/**
 * 取得所有討論串
 * GET /api/v1/ai_talk/thread
 */
export async function GET() {
  try {
    // Info: (20260212 - Julian) 取得所有討論串
    const threads = await prisma.thread.findMany({
      orderBy: { createdAt: "desc" }, // Info: (20260212 - Julian) 依建立時間倒序
      include: {
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    });

    // Info: (20260212 - Julian) 取得與討論串關聯的標籤
    const tagIds = await prisma.threadTag.findMany({
      where: { threadId: { in: threads.map((thread) => thread.id) } },
    });
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds.map((tagId) => tagId.tagId) } },
    });

    // Info: (20260212 - Julian) 取得討論串的使用者
    const users = await prisma.user.findMany({
      where: { id: { in: threads.map((thread) => thread.userId) } },
    });

    // Info: (20260212 - Julian) 取得與討論串關聯的按讚數、倒讚數
    const reactionCounts = await prisma.reaction.groupBy({
      by: ["threadId", "type"],
      _count: { _all: true },
    });
    const likeCounts = reactionCounts.filter(
      (reaction) => reaction.type === "LIKE",
    );
    const dislikeCounts = reactionCounts.filter(
      (reaction) => reaction.type === "DISLIKE",
    );

    // Info: (20260212 - Julian) 整理資料
    const response: IThread[] = threads.map((thread) => {
      const authorName =
        users.find((user) => user.id === thread.userId)?.name ?? "Unknown";

      // Info: (20260212 - Julian) 取得與討論串關聯的標籤名
      const threadTags = tagIds
        .filter((tagId) => tagId.threadId === thread.id)
        .map((tagId) => tags.find((tag) => tag.id === tagId.tagId)?.name)
        .filter((name): name is string => !!name);

      // Info: (20260212 - Julian) 取得與討論串關聯的按讚數、倒讚數
      const countOfLike =
        likeCounts.find((reaction) => reaction.threadId === thread.id)?._count
          ._all ?? 0;
      const countOfDislike =
        dislikeCounts.find((reaction) => reaction.threadId === thread.id)
          ?._count._all ?? 0;

      return {
        id: thread.id,
        question: thread.question,
        answer: thread.answer ?? "-",
        createdAt: new Date(thread.createdAt).getTime() / 1000,
        authorName,
        tags: threadTags,
        countOfLike,
        countOfDislike,
        countOfShare: thread._count.shares,
        countOfComment: thread._count.comments,
      };
    });

    return jsonOk(response);
  } catch (error) {
    console.error("[API] /threads error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

/**
 * 向 AI 提問(建立討論串)
 * POST /api/v1/ai_talk/thread
 */
export async function POST(request: NextRequest) {
  try {
    // Info: (20260212 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const body = await request.json();
    const { question /* , attachments = [] */ } = body;

    if (!question) {
      console.error("Missing question");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Question is required");
    }

    const author = await prisma.user.findUnique({
      where: { address: user.address },
    });

    if (!author) {
      console.error("Author not found");
      return jsonFail(ApiCode.NOT_FOUND, "Author not found");
    }

    // Info: (20260213 - Julian) 使用 AI 生成答案與標籤
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Server configuration error",
      );
    }

    const chatService = new ChatService(apiKey);
    const { answer, tags } = await chatService.askAccountTalk(question);

    // Info: (20260212 - Julian) 建立討論串
    const thread = await prisma.thread.create({
      data: {
        question,
        userId: author.id,
        answer: answer,
      },
    });

    // Info: (20260212 - Julian) 建立標籤並關聯
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {},
        });

        await prisma.threadTag.create({
          data: {
            threadId: thread.id,
            tagId: tag.id,
          },
        });
      }
    }

    return jsonOk({ threadId: thread.id });
  } catch (error) {
    console.error("[API] /threads error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

