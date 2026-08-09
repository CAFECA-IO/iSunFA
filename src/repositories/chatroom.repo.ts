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

/**
 * Info: (20260806 - Tzuhan) 「最新改動」需要的關聯欄位。
 *
 * **`Chatroom.updatedAt` 不是活動訊號。** 它是 Prisma 的 `@updatedAt`,
 * 只在 chatroom 這一列被 update 時才跳 —— 而全專案只有封存/還原會 update 它。
 * 送訊息寫的是 ChatroomMessage、存報告寫的是 CarbonReportDraft、
 * 盤查狀態寫的是 CarbonInventoryState,三者都不會碰到 chatroom 那一列。
 *
 * 所以「這個會話最後一次有動作是什麼時候」必須從關聯表取,
 * 由 service 取四者的最大值(見 resolveLastActivityAt)。
 *
 * 只取最新一則訊息(take: 1)—— 要的是時間點,不是內容,也不該把整串訊息撈進來。
 */
const LAST_ACTIVITY_SELECT = {
  messages: {
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  reportDraft: { select: { updatedAt: true } },
  inventoryState: { select: { updatedAt: true } },
} as const;

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

  // Info: (20260714 - Tzuhan) 依頻道前綴列出聊天室(sessions 列表);前綴含用戶 address,寫入時已由路由層裁決所有權
  /**
   * Info: (20260716 - Tzuhan) #52 綁定會話至帳本(upsert:會話可能尚未建立);
   * 已綁定者不可改綁(報告歸屬不可漂移,審計原則)— 由呼叫端先查後裁決
   */
  async bindAccountBook(
    channel: string,
    purpose: string,
    ownerPublicKey: string,
    accountBookId: string,
  ) {
    return prisma.chatroom.upsert({
      where: { channel },
      update: { accountBookId },
      create: { channel, purpose, ownerPublicKey, accountBookId },
    });
  }

  // Info: (20260716 - Tzuhan) #52 依 channel 查綁定帳本(null = 個人會話或不存在)
  async findAccountBookIdByChannel(channel: string): Promise<string | null> {
    const room = await prisma.chatroom.findUnique({
      where: { channel },
      select: { accountBookId: true },
    });
    return room?.accountBookId ?? null;
  }

  // Info: (20260716 - Tzuhan) #52 列出帳本的碳盤查會話(帳本成員閱覽動線)
  /**
   * Info: (20260730 - Tzuhan) 封存狀態的查詢條件。預設只列使用中者:
   * 已封存的會話應該從清單消失(否則封存等於沒做),但資料仍在,帶 includeArchived 即可列出還原。
   */
  private buildArchivedFilter(includeArchived: boolean) {
    return includeArchived ? {} : { archivedAt: null };
  }

  async listChatroomsByAccountBookId(
    accountBookId: string,
    purpose?: string,
    includeArchived = false,
  ) {
    return prisma.chatroom.findMany({
      where: {
        accountBookId,
        ...(purpose ? { purpose } : {}),
        ...this.buildArchivedFilter(includeArchived),
      },
      orderBy: { createdAt: "desc" },
      select: {
        channel: true,
        createdAt: true,
        updatedAt: true,
        accountBookId: true,
        archivedAt: true,
        ...LAST_ACTIVITY_SELECT,
      },
    });
  }

  async listChatroomsByChannelPrefix(
    channelPrefix: string,
    purpose?: string,
    includeArchived = false,
  ) {
    return prisma.chatroom.findMany({
      where: {
        channel: { startsWith: channelPrefix },
        ...(purpose ? { purpose } : {}),
        ...this.buildArchivedFilter(includeArchived),
      },
      orderBy: { createdAt: "desc" },
      select: {
        channel: true,
        createdAt: true,
        updatedAt: true,
        // Info: (20260716 - Tzuhan) #52 前端據此切換保存模式(帳本=明文/個人=E2EE)
        accountBookId: true,
        archivedAt: true,
        ...LAST_ACTIVITY_SELECT,
      },
    });
  }

  /**
   * Info: (20260730 - Tzuhan) 封存 / 還原(軟刪)。回傳 null 代表該 channel 不存在——
   * 呼叫端須據此回 404 而非假裝成功,否則使用者無從得知自己刪的是不存在的東西。
   */
  async setArchived(channel: string, archived: boolean) {
    const chatroom = await prisma.chatroom.findUnique({
      where: { channel },
      select: { id: true },
    });
    if (!chatroom) return null;
    return prisma.chatroom.update({
      where: { id: chatroom.id },
      data: { archivedAt: archived ? new Date() : null },
      select: { channel: true, archivedAt: true },
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
