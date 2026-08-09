// Info: (20260731 - Luphia) 碳盤查會話的 service 層:route 不直接碰 repository(CLAUDE.md 第 1 條)。
// Info: (20260731 - Luphia) 授權裁決沿用 carbon_access.guard,本檔只負責「取數 + 整形」,不重複實作權限。

import { chatroomRepo } from "@/repositories/chatroom.repo";
import {
  CARBON_CHAT_PURPOSE,
  buildCarbonChatChannel,
  isCarbonChatChannelOwnedBy,
} from "@/constants/carbon_chatbot";

export interface ICarbonSessionSummary {
  sessionId: string;
  channel: string;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Info: (20260806 - Tzuhan) 這個會話最後一次**有動作**的時間(清單排序依據)。
   *
   * 與 `updatedAt` 是不同的東西:`updatedAt` 是 Prisma 的 `@updatedAt`,
   * 只在 chatroom 那一列被 update 時才跳,而全專案只有封存/還原會 update 它。
   * 送訊息、存報告、更新盤查狀態寫的都是關聯表,一次都不會碰到它 ——
   * 拿它當「最新改動」排序,結果會是「幾乎所有會話都停在建立那一刻」。
   */
  lastActivityAt: Date;
  accountBookId: string | null;
  archivedAt: Date | null;
  isOwn: boolean;
}

/**
 * Info: (20260806 - Tzuhan) 取四個時間點的最大值:
 * chatroom 本身、最新一則訊息、報告草稿、盤查狀態。
 *
 * 全部取最大而不是只看訊息:一份匯入進來的報告可能一則訊息都沒有,
 * 但它顯然「有動過」—— 只看訊息會讓那種會話永遠沉在清單底部。
 */
const resolveLastActivityAt = (room: {
  updatedAt: Date;
  messages: { createdAt: Date }[];
  reportDraft: { updatedAt: Date } | null;
  inventoryState: { updatedAt: Date } | null;
}): Date => {
  const candidates: Date[] = [room.updatedAt];
  if (room.messages[0]) candidates.push(room.messages[0].createdAt);
  if (room.reportDraft) candidates.push(room.reportDraft.updatedAt);
  if (room.inventoryState) candidates.push(room.inventoryState.updatedAt);
  return candidates.reduce((latest, current) =>
    current > latest ? current : latest,
  );
};

export const carbonSessionService = {
  /**
   * Info: (20260731 - Luphia) #52 帳本閱覽動線:列出該帳本全部會話。
   * 呼叫端須先通過 canViewAccountBook 裁決(非成員不得枚舉)。
   */
  async listByAccountBook(
    accountBookId: string,
    userAddress: string,
    includeArchived: boolean,
  ): Promise<ICarbonSessionSummary[]> {
    const rooms = await chatroomRepo.listChatroomsByAccountBookId(
      accountBookId,
      CARBON_CHAT_PURPOSE,
      includeArchived,
    );
    return rooms.map((room) => ({
      sessionId: room.channel.split("-").pop() ?? room.channel,
      channel: room.channel,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      lastActivityAt: resolveLastActivityAt(room),
      accountBookId: room.accountBookId,
      archivedAt: room.archivedAt,
      // Info: (20260731 - Luphia) 是否為本人會話(前端據此決定聊天面板可用性)
      isOwn: isCarbonChatChannelOwnedBy(room.channel, userAddress),
    }));
  },

  // Info: (20260731 - Luphia) 前綴即所有權:頻道格式 carbon-chat-{address}-{sessionId},只列本人頻道
  async listOwnedByAddress(
    userAddress: string,
    includeArchived: boolean,
  ): Promise<ICarbonSessionSummary[]> {
    const channelPrefix = buildCarbonChatChannel(userAddress, "");
    const rooms = await chatroomRepo.listChatroomsByChannelPrefix(
      channelPrefix,
      CARBON_CHAT_PURPOSE,
      includeArchived,
    );
    return rooms.map((room) => ({
      sessionId: room.channel.slice(channelPrefix.length),
      channel: room.channel,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      lastActivityAt: resolveLastActivityAt(room),
      accountBookId: room.accountBookId,
      archivedAt: room.archivedAt,
      isOwn: true,
    }));
  },

  /**
   * Info: (20260731 - Luphia) #52 綁定帳本。不可改綁:既有綁定與請求不符即拒
   * (報告歸屬不可漂移,審計原則)。回傳 false 代表衝突,由呼叫端轉成權限錯誤。
   */
  async bindAccountBook(
    channel: string,
    accountBookId: string,
    recipientPublicKey: string,
  ): Promise<boolean> {
    const existing = await chatroomRepo.findAccountBookIdByChannel(channel);
    if (existing && existing !== accountBookId) return false;

    await chatroomRepo.bindAccountBook(
      channel,
      CARBON_CHAT_PURPOSE,
      recipientPublicKey,
      accountBookId,
    );
    return true;
  },

  // Info: (20260731 - Luphia) 封存/還原(軟刪)。回傳 null 代表會話不存在,不假裝成功
  async setArchived(channel: string, archived: boolean) {
    return chatroomRepo.setArchived(channel, archived);
  },
};
