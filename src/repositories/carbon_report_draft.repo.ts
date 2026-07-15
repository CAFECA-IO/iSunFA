// Info: (20260714 - Emily) CarbonReportDraft 資料存取層(唯一碰 Prisma);僅存密文,version 樂觀鎖

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export interface IUpsertReportDraftParams {
  channel: string;
  purpose?: string;
  recipientPublicKey: string;
  encryptedContent: string;
  ephemeralPublicKey?: string | null;
  keyDerivationHint: string;
  algorithm: string;
  // Info: (20260714 - Emily) 呼叫端讀取時的版本;不符即回 null(由服務層轉為衝突錯誤)
  expectedVersion: number;
}

export class CarbonReportDraftRepository {
  // Info: (20260714 - Emily) 依 channel 取草稿(密文);無 chatroom 或無草稿回 null
  async findByChannel(channel: string) {
    const chatroom = await prisma.chatroom.findUnique({ where: { channel } });
    if (!chatroom) return null;
    return prisma.carbonReportDraft.findUnique({
      where: { chatroomId: chatroom.id },
    });
  }

  // Info: (20260714 - Emily) upsert + 樂觀鎖:版本不符回 null,成功回新版本紀錄
  async upsertByChannel(params: IUpsertReportDraftParams) {
    const chatroom = await prisma.chatroom.upsert({
      where: { channel: params.channel },
      update: {},
      create: {
        channel: params.channel,
        purpose: params.purpose,
        ownerPublicKey: params.recipientPublicKey,
      },
    });

    const envelopeData = {
      recipientPublicKey: params.recipientPublicKey,
      encryptedContent: params.encryptedContent,
      ephemeralPublicKey: params.ephemeralPublicKey ?? null,
      keyDerivationHint: params.keyDerivationHint,
      algorithm: params.algorithm,
    };

    const existing = await prisma.carbonReportDraft.findUnique({
      where: { chatroomId: chatroom.id },
    });

    if (!existing) {
      // Info: (20260714 - Emily) 首存:呼叫端讀取到的版本必須是 0(從未存過)
      if (params.expectedVersion !== 0) return null;
      try {
        return await prisma.carbonReportDraft.create({
          data: { chatroomId: chatroom.id, ...envelopeData, version: 1 },
        });
      } catch (error) {
        // Info: (20260715 - Luphia) 併發首存競態:另一端已先建立(chatroomId unique, P2002),視為版本衝突回 null,交由服務層轉衝突錯誤而非 DB 錯誤
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return null;
        }
        throw error;
      }
    }

    // Info: (20260714 - Emily) updateMany 以 version 條件原子更新;count 0 = 他端已改版(衝突)
    const updated = await prisma.carbonReportDraft.updateMany({
      where: { chatroomId: chatroom.id, version: params.expectedVersion },
      data: { ...envelopeData, version: params.expectedVersion + 1 },
    });
    if (updated.count === 0) return null;

    return prisma.carbonReportDraft.findUnique({
      where: { chatroomId: chatroom.id },
    });
  }
}

export const carbonReportDraftRepo = new CarbonReportDraftRepository();
