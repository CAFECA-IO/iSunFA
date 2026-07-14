// Info: (20260712 - Luphia) Chatroom 資料存取層（唯一碰 Prisma）；訊息一律以密文入庫
import { prisma } from "@/lib/prisma";

export interface ICreateChatroomMessageParams {
  chatroomId: string;
  senderPublicKey?: string | null;
  recipientPublicKey: string;
  encryptedContent: string;
  ephemeralPublicKey?: string | null;
  algorithm: string;
  keyDerivationHint: string;
}

export class ChatroomRepository {
  // Info: (20260712 - Luphia) 依 channel 取得或建立聊天室（upsert 避免併發競態）
  async findOrCreateByChannel(
    channel: string,
    purpose?: string,
    ownerPublicKey?: string,
  ) {
    return prisma.chatroom.upsert({
      where: { channel },
      update: {},
      create: { channel, purpose, ownerPublicKey },
    });
  }

  // Info: (20260712 - Luphia) 寫入一則加密訊息紀錄
  async createMessage(params: ICreateChatroomMessageParams) {
    return prisma.chatroomMessage.create({
      data: {
        chatroom: { connect: { id: params.chatroomId } },
        senderPublicKey: params.senderPublicKey ?? null,
        recipientPublicKey: params.recipientPublicKey,
        encryptedContent: params.encryptedContent,
        ephemeralPublicKey: params.ephemeralPublicKey ?? null,
        algorithm: params.algorithm,
        keyDerivationHint: params.keyDerivationHint,
      },
    });
  }

  // Info: (20260714 - Emily) 依頻道前綴列出聊天室(sessions 列表);前綴含用戶 address,寫入時已由路由層裁決所有權
  async listChatroomsByChannelPrefix(channelPrefix: string, purpose?: string) {
    return prisma.chatroom.findMany({
      where: {
        channel: { startsWith: channelPrefix },
        ...(purpose ? { purpose } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { channel: true, createdAt: true, updatedAt: true },
    });
  }

  // Info: (20260712 - Luphia) 依聊天室分頁列出訊息（密文，供前端以主私鑰解密）
  // Info: (20260712 - Luphia) 取「早於 before」的最新 limit 則（desc）；before 省略即取最新一頁
  async listMessagesByChannel(channel: string, limit: number, before?: Date) {
    const chatroom = await prisma.chatroom.findUnique({ where: { channel } });
    if (!chatroom) return [];
    return prisma.chatroomMessage.findMany({
      where: {
        chatroomId: chatroom.id,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export const chatroomRepo = new ChatroomRepository();
