// Info: (20260806 - Tzuhan) CarbonPendingImport 資料存取層(唯一碰 Prisma);僅存密文/明文封裝,version 樂觀鎖
// Info: (20260806 - Tzuhan) 語意與 carbon_report_draft.repo 一致;差別在多一個 deleteByChannel(套用/捨棄後要清掉)

import { prisma } from "@/lib/prisma";
import { assertStorableEnvelope } from "@/repositories/carbon_envelope_invariant";

import { Prisma } from "@/generated";

export interface IUpsertPendingImportParams {
  channel: string;
  purpose?: string;
  recipientPublicKey: string;
  // Info: (20260806 - Tzuhan) 雙模式:個人會話存密文 envelope,帳本會話存 plainContent(擇一)
  encryptedContent?: string | null;
  plainContent?: string | null;
  ephemeralPublicKey?: string | null;
  keyDerivationHint?: string | null;
  algorithm: string;
  // Info: (20260806 - Tzuhan) 呼叫端讀取時的版本;不符即回 null(由服務層轉為衝突錯誤)
  expectedVersion: number;
}

export class CarbonPendingImportRepository {
  // Info: (20260806 - Tzuhan) 依 channel 取待匯入紀錄;無 chatroom 或無紀錄回 null
  async findByChannel(channel: string) {
    const chatroom = await prisma.chatroom.findUnique({ where: { channel } });
    if (!chatroom) return null;
    return prisma.carbonPendingImport.findUnique({
      where: { chatroomId: chatroom.id },
    });
  }

  // Info: (20260806 - Tzuhan) upsert + 樂觀鎖:版本不符回 null,成功回新版本紀錄
  async upsertByChannel(params: IUpsertPendingImportParams) {
    assertStorableEnvelope("CarbonPendingImport", params);
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
      encryptedContent: params.encryptedContent ?? null,
      plainContent: params.plainContent ?? null,
      ephemeralPublicKey: params.ephemeralPublicKey ?? null,
      keyDerivationHint: params.keyDerivationHint ?? null,
      algorithm: params.algorithm,
    };

    const existing = await prisma.carbonPendingImport.findUnique({
      where: { chatroomId: chatroom.id },
    });

    if (!existing) {
      // Info: (20260806 - Tzuhan) 首存:呼叫端讀取到的版本必須是 0(從未存過)
      if (params.expectedVersion !== 0) return null;
      try {
        return await prisma.carbonPendingImport.create({
          data: { chatroomId: chatroom.id, ...envelopeData, version: 1 },
        });
      } catch (error) {
        // Info: (20260806 - Tzuhan) 併發首存競態(chatroomId unique, P2002):視為版本衝突,不當成 DB 錯誤
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return null;
        }
        throw error;
      }
    }

    const updated = await prisma.carbonPendingImport.updateMany({
      where: { chatroomId: chatroom.id, version: params.expectedVersion },
      data: { ...envelopeData, version: params.expectedVersion + 1 },
    });
    if (updated.count === 0) return null;

    return prisma.carbonPendingImport.findUnique({
      where: { chatroomId: chatroom.id },
    });
  }

  /**
   * Info: (20260806 - Tzuhan) 套用或捨棄後清除。
   *
   * 不帶 version 條件:刪除是**幂等**的終態,而「另一端剛好也在刪」不是需要防的衝突。
   * 回傳刪掉幾筆(0 = 本來就沒有),讓呼叫端能分辨「清掉了」與「早就沒有了」。
   */
  async deleteByChannel(channel: string): Promise<number> {
    const chatroom = await prisma.chatroom.findUnique({ where: { channel } });
    if (!chatroom) return 0;
    const deleted = await prisma.carbonPendingImport.deleteMany({
      where: { chatroomId: chatroom.id },
    });
    return deleted.count;
  }
}

export const carbonPendingImportRepo = new CarbonPendingImportRepository();
