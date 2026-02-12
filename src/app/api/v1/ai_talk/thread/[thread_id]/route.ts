import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { prisma } from '@/lib/prisma';
import { IAttachment, IThreadDetail } from '@/interfaces/ai_talk';

/**
 * 取得單一討論串
 * GET /api/v1/ai_talk/thread/:thread_id
 */
 
export async function GET(_request: Request, { params }: { params: Promise<{ thread_id: string }> }) {
  try {
    const { thread_id: threadId } = await params;
    const thread = await prisma.thread.findUnique({
      where: {id: threadId},
    });

    if (!thread) {
      console.error(`Thread ${threadId} not found`);
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Thread not found');
    }

    // ToDo: 取得登入的使用者
    const loginUserId = ''

    // Info: (20260212 - Julian) 取得討論串的使用者
    const user = await prisma.user.findUnique({
      where: {id: thread.userId},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的標籤
    const tagIds = await prisma.threadTag.findMany({
      where: {threadId: thread.id},
    })
    const tags = await prisma.tag.findMany({
      where: {id: {in: tagIds.map((tagId) => tagId.tagId)}},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的按讚、倒讚
    const reaction = await prisma.reaction.findMany({
      where: {threadId: thread.id},
    })
    const likeCount = reaction.filter((reaction) => reaction.type === 'LIKE').length
    const dislikeCount = reaction.filter((reaction) => reaction.type === 'DISLIKE').length
    const userReaction = reaction.find((reaction) => reaction.userId === loginUserId)?.type ?? null

    // Info: (20260212 - Julian) 取得與討論串關聯的分享數
    const shareCount = await prisma.share.count({
      where: {threadId: thread.id},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的評論
    const commentsOfThread = await prisma.comment.findMany({
      where: {threadId: thread.id},
    })
    
    // Info: (20260212 - Julian) 取得與討論串關聯的附件
    const attachments =  await prisma.attachment.findMany({
      where: {threadId: thread.id},
    })
    const formattedAttachments:IAttachment[] = attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      url: attachment.url,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    }))

    const response:IThreadDetail = {
      id: thread.id,
      question: thread.question,
      answer: thread.answer ?? '-',
      createdAt: new Date(thread.createdAt).getTime()/1000,
      authorName: user?.name ?? 'Unknown',
      tags: tags.map((tag) => tag.name),
      countOfLike: likeCount,
      countOfDislike: dislikeCount,
      countOfShare: shareCount,
      countOfComment: commentsOfThread.length,
      userReaction: userReaction,
      attachments: formattedAttachments,
    }

    return jsonOk(response);
  } 
  catch (error) {
    console.error(`[API] /threads/${(await params).thread_id} error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}