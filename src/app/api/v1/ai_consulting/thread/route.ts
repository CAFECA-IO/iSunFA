import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { IThread } from "@/interfaces/ai_consulting";
import { talkRepo } from "@/repositories/talk.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";

/**
 * Info: (20260112 - Julian) 取得所有討論串
 * GET /api/v1/ai_consulting/thread
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const tagsParams = searchParams.get("tags")?.split(",") ?? [];
    const page = searchParams.get("pageNumber")
      ? parseInt(searchParams.get("pageNumber")!)
      : undefined;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : undefined;
    const sortOption = searchParams.get("sort");

    // Info: (20260212 - Julian) 取得所有討論串
    const { items: threads, total } = await talkRepo.listThreadsWithCounts({
      keyword,
      startDate,
      endDate,
      tags: tagsParams,
      sortOption,
      page,
      pageSize,
    });

    // Info: (20260212 - Julian) 取得與討論串關聯的標籤
    const tagIds = await talkRepo.getThreadTagsByThreadIds(
      threads.map((thread) => thread.id),
    );
    const tags = await talkRepo.getTagsByIds(
      tagIds.map((tagId) => tagId.tagId),
    );

    // Info: (20260212 - Julian) 取得討論串的使用者
    const users = await webAuthnRepo.findUsersByIds(
      threads.map((thread) => thread.userId),
    );

    // Info: (20260212 - Julian) 取得與討論串關聯的按讚數、倒讚數
    const reactionCounts = await talkRepo.getReactionCounts();
    const likeCounts = reactionCounts.filter(
      (reaction) => reaction.type === "LIKE",
    );
    const dislikeCounts = reactionCounts.filter(
      (reaction) => reaction.type === "DISLIKE",
    );

    // Info: (20260212 - Julian) 整理資料
    const items: IThread[] = threads.map((thread) => {
      const authorName =
        users.find((user) => user.id === thread.userId)?.name ?? "Unknown";

      // Info: (20260212 - Julian) 取得與討論串關聯的標籤名
      const threadTags = tagIds
        .filter((tagId) => tagId.analysisId === thread.id)
        .map((tagId) => tags.find((tag) => tag.id === tagId.tagId)?.name)
        .filter((name): name is string => !!name);

      const countOfLike =
        likeCounts.find((reaction) => reaction.analysisId === thread.id)?._count
          ._all ?? 0;
      const countOfDislike =
        dislikeCounts.find((reaction) => reaction.analysisId === thread.id)
          ?._count._all ?? 0;

      const data = (thread.data as unknown as { question?: string; data?: { question?: string } }) || {};
      let questionStr = "";
      if (data.question) {
        questionStr = data.question;
      } else if (data.data?.question) {
        questionStr = data.data.question;
      }

      let answerStr = "-";
      if (thread.result) {
        if (typeof thread.result === "string") {
          try {
            const parsed = JSON.parse(thread.result);
            if (parsed && typeof parsed === "object" && typeof parsed.answer === "string") {
              answerStr = parsed.answer;
            } else {
              answerStr = thread.result;
            }
          } catch {
            answerStr = thread.result;
          }
        } else {
          answerStr = ((thread.result as unknown as { answer?: string })?.answer) || JSON.stringify(thread.result);
        }
      }

      return {
        id: thread.id,
        question: questionStr,
        answer: answerStr,
        createdAt: new Date(thread.createdAt).getTime() / 1000,
        authorName,
        tags: threadTags,
        countOfLike,
        countOfDislike,
        countOfShare: thread._count.reportShareTokens,
        countOfComment: thread._count.comments,
      };
    });

    return jsonOk({
      items,
      total,
      totalPages: Math.ceil(total / (pageSize || 20)),
    });
  } catch (error) {
    console.error("[API] /threads error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
