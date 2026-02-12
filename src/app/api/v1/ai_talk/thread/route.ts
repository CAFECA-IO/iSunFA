import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { IThread } from '@/interfaces/ai_talk';
import { prisma } from '@/lib/prisma';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';

/**
 * 取得所有討論串
 * GET /api/v1/ai_talk/thread
 */
export async function GET() {
  try {
    // Info: (20260212 - Julian) 取得所有討論串
    const threads = await prisma.thread.findMany()
    
    // Info: (20260212 - Julian) 取得與討論串關聯的標籤
    const tagIds = await prisma.threadTag.findMany({
      where: {threadId: { in: threads.map((thread) => thread.id)}},
    })
    const tags = await prisma.tag.findMany({
      where: {id: { in: tagIds.map((tagId) => tagId.tagId)}},
    })

    // Info: (20260212 - Julian) 取得與討論串關聯的按讚數、倒讚數
    const likeCount = await prisma.reaction.count({
      where: {threadId: { in: threads.map((thread) => thread.id)}, type: 'LIKE'},
    })
    const dislikeCount = await prisma.reaction.count({
      where: {threadId: { in: threads.map((thread) => thread.id)}, type: 'DISLIKE'},
    })

    // Info: (20260212 - Julian) 取得討論串的評論數
    const comments = await prisma.comment.count({
      where: {threadId: { in: threads.map((thread) => thread.id)}},
    })

    // Info: (20260212 - Julian) 取得與討論串的分享數
    const shareCount = await prisma.share.count({
      where: {threadId: { in: threads.map((thread) => thread.id)}},
    })

    // Info: (20260212 - Julian) 取得討論串的使用者
    const users = await prisma.user.findMany({
      where: {id: { in: threads.map((thread) => thread.userId)}},
    })

    // Info: (20260212 - Julian) 整理資料
    const response: IThread[] = threads.map((thread) => ({
      id: thread.id,
      question: thread.question,
      answer: thread.answer ?? '-',
      createdAt: new Date(thread.createdAt).getTime()/1000,
      authorName: users.find((user) => user.id === thread.userId)?.name ?? 'Unknown',
      tags: tags.map((tag) => tag.name),
      countOfLike: likeCount,
      countOfDislike: dislikeCount,
      countOfShare: shareCount,
      countOfComment: comments,
    }));

    return jsonOk(response);
  } catch (error) {
    console.error('[API] /threads error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

/**
 * 向 AI 提問(建立討論串)
 * POST /api/v1/ai_talk/thread
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question /* , attachments = [] */ } = body;

        if (!question) {
      console.error('Missing question');
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Question is required');
    }

         // Info: (20260212 - Julian) Verify Token & Get User
       const authHeader = request.headers.get('Authorization');
       const user = await getIdentityFromDeWT(authHeader);

       if (!user) {
         console.error('User not found');
         return jsonFail(ApiCode.NOT_FOUND, 'User not found');
       }

    const author = await prisma.user.findUnique({
      where: {address: user.address},
    });

    if (!author) {
      console.error('User not found');
      return jsonFail(ApiCode.NOT_FOUND, 'User not found');
    }

    // Info: (20260212 - Julian) 建立討論串
    const thread = await prisma.thread.create({
      data: {
        question,
        userId: user.id,
        answer: '# 不可以。依據營業稅法，未載明統一編號之進項憑證不得扣抵銷項稅額。\n\n請確保發票上載明貴司統編，並確認屬於營業必要支出。若為餐飲業，需注意交際費限額問題。\n\n- 法條依據：\n 依據《加值型及非加值型營業稅法》第 33 條規定，營業人以進項稅額扣抵銷項稅額者，應具備載明其名稱、地址及統一編號之憑證。\n\n- 執行建議：\n請確保發票上載明貴司統編，並確認屬於營業必要支出。若為餐飲業，需注意交際費限額問題。'
      },
    });

    // Info: (20260212 - Julian) 建立標籤
    const tags = await prisma.tag.create({
      data: {name: '稅法'},
    });

    // Info: (20260212 - Julian) 建立討論串和標籤的關聯
   await prisma.threadTag.create({
      data: {threadId: thread.id, tagId: tags.id},
    });

    // const apiKey = process.env.GEMINI_API_KEY;

    // if (!apiKey) {
    //   console.error('Missing GEMINI_API_KEY');
    //   return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Server configuration error');
    // }

    // const chatService = new ChatService(apiKey);
    // const reply = await chatService.generateResponse(message, tags, image, mimeType);

    return jsonOk({threadId: thread.id});
  } catch (error) {
    console.error('[API] /threads error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
