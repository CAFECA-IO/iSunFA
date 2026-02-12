import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { prisma } from '@/lib/prisma';
import { IAttachment, IThreadDetail } from '@/interfaces/ai_talk';
// import { mockThreads } from '@/interfaces/ai_talk';

/**
 * 取得單一討論串
 */
 
export async function GET(_request: Request, { params }: { params: Promise<{ thread_id: string }> }) {
  try {
    const { thread_id: threadId } = await params;
    const thread = await prisma.thread.findUnique({
      where: {
        id: Number(threadId),
      },
    });

    if (!thread) {
      console.error(`Thread ${threadId} not found`);
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Thread not found');
    }

    // Info: (20260212 - Julian) 取得討論串的使用者
    const user = await prisma.user.findUnique({
      where: {id: thread.userId},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的標籤
    const tagIds = await prisma.threadsOnTags.findMany({
      where: {threadId: thread.id},
    })
    const tags = await prisma.tag.findMany({
      where: {id: {in: tagIds.map((tagId) => tagId.tagId)}},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的按讚、倒讚
    const likeCount = await prisma.reaction.count({
      where: {threadId: thread.id, type: 'LIKE'},
    })
    const dislikeCount = await prisma.reaction.count({
      where: {threadId: thread.id, type: 'DISLIKE'},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的分享數
    const shareCount = await prisma.share.count({
      where: {threadId: thread.id},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的評論
    const commentsOfThread = await prisma.comment.findMany({
      where: {threadId: thread.id},
    })

    // // Info: (20260212 - Julian) 取得與評論關聯的使用者
    // const users = await prisma.user.findMany({
    //   where: {id: {in: commentsOfThread.map((comment) => comment.userId)}},
    // })

    // // Info: (20260212 - Julian) 取得與評論關聯的按讚、倒讚
    // const likeCountOfComments = await prisma.reaction.count({
    //   where: {commentId: {in: commentsOfThread.map((comment) => comment.id)}, type: 'LIKE'},
    // })
    // const dislikeCountOfComments = await prisma.reaction.count({
    //   where: {commentId: {in: commentsOfThread.map((comment) => comment.id)}, type: 'DISLIKE'},
    // })

    // // Info: (20260212 - Julian) 取得與評論關聯的回覆
    // const repliesOfComments = await prisma.comment.findMany({
    //   where: {parentCommentId: {in: commentsOfThread.map((comment) => comment.id)}},
    // })

    // // Info: (20260212 - Julian) 取得與回覆關聯的使用者
    // const usersOfReplies = await prisma.user.findMany({
    //   where: {id: {in: repliesOfComments.map((reply) => reply.userId)}},
    // })

    // const formattedReplies:IComment[] = repliesOfComments.map((reply) => ({
    //   id: reply.id,
    //   content: reply.content,
    //   authorName: usersOfReplies.find((user) => user.id === reply.userId)?.name ?? 'Unknown',
    //   createdAt: new Date(reply.createdAt).getTime()/1000,
    //   likes:likeCountOfComments,
    //   dislikes:dislikeCountOfComments,
    //   isProfessional:reply.isProfessional,
    //   isVerified:false,
    //   parentId:reply.parentCommentId,
    //   replies:[],
    //   isDeleted:reply.deletedAt !== null,
    // }))

    // const formattedComments:IComment[] = commentsOfThread.map((comment) => ({
    //   id: comment.id,
    //   content: comment.content,
    //   authorName: users.find((user) => user.id === comment.userId)?.name ?? 'Unknown',
    //   createdAt: new Date(comment.createdAt).getTime()/1000,
    //   likes:likeCountOfComments,
    //   dislikes:dislikeCountOfComments,
    //   isProfessional:comment.isProfessional,
    //   isVerified:false,
    //   parentId:comment.parentCommentId,
    //   replies:formattedReplies,
    //   isDeleted:comment.deletedAt !== null,
    // }))
    
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
      // comments: formattedComments,
      attachments: formattedAttachments,
    }

    return jsonOk(response);
  } 
  catch (error) {
    console.error(`[API] /threads/${(await params).thread_id} error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}