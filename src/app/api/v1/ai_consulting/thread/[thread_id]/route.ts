import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { talkRepo } from "@/repositories/talk.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { IFile, IThreadDetail } from "@/interfaces/ai_consulting";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260112 - Julian) 取得單一討論串
 * GET /api/v1/ai_consulting/thread/:thread_id
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  try {
    // Info: (20260212 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    const { thread_id: threadId } = await params;
    const thread = await talkRepo.getThreadByIdWithFiles(threadId);

    if (!thread) {
      console.error(`Thread ${threadId} not found`);
      return jsonFail(API_ERRORS.IN_THREAD_NOT_FOUND);
    }

    // Info: (20260212 - Julian) 取得登入的使用者
    const currentUserId = user?.id ?? "";

    // Info: (20260212 - Julian) 取得討論串的作者
    const author = await webAuthnRepo.findUserById(thread.userId);

    // Info: (20260212 - Julian) 取得與討論串關聯的標籤
    const tags = await talkRepo.getTagsByThreadId(threadId);

    // Info: (20260212 - Julian) 取得與討論串關聯的按讚、倒讚
    const reaction = await talkRepo.getReactionsByThreadId(threadId);
    const likeCount = reaction.filter(
      (reaction) => reaction.type === "LIKE",
    ).length;
    const dislikeCount = reaction.filter(
      (reaction) => reaction.type === "DISLIKE",
    ).length;
    const userReaction =
      reaction.find((reaction) => reaction.userId === currentUserId)?.type ??
      null;

    // Info: (20260212 - Julian) 取得與討論串關聯的分享數
    const shareCount = await talkRepo.countSharesByThreadId(threadId);

    // Info: (20260212 - Julian) 取得與討論串關聯的評論數
    const countOfComment = await talkRepo.countCommentsByThreadId(threadId);

    // Info: (20260212 - Julian) 取得與討論串關聯的 File
    const formattedFiles: IFile[] = thread.files.map((file) => ({
      id: file.id,
      hash: file.hash,
      fileName: file.fileName ?? "",
      threadId: file.analysisId ?? "",
    }));

    const rawData =
      (thread.data as unknown as {
        question?: string;
        data?: { question?: string };
      }) || {};
    const questionStr = rawData?.data?.question || "";

    let answerStr = "-";
    if (thread.result) {
      if (typeof thread.result === "string") {
        try {
          const parsed = JSON.parse(thread.result);
          if (
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.answer === "string"
          ) {
            answerStr = parsed.answer;
          } else {
            answerStr = thread.result;
          }
        } catch {
          answerStr = thread.result;
        }
      } else {
        answerStr =
          (thread.result as unknown as { answer?: string })?.answer ||
          JSON.stringify(thread.result);
      }
    }

    const response: IThreadDetail = {
      id: thread.id,
      question: questionStr,
      answer: answerStr,
      createdAt: new Date(thread.createdAt).getTime() / 1000,
      authorName: author?.name ?? "Unknown",
      tags: tags.map((tag) => tag.name),
      countOfLike: likeCount,
      countOfDislike: dislikeCount,
      countOfShare: shareCount,
      countOfComment: countOfComment,
      userReaction: userReaction,
      file: formattedFiles,
    };

    return jsonOk(response);
  } catch (error) {
    console.error(`[API] /threads/${(await params).thread_id} error:`, error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
