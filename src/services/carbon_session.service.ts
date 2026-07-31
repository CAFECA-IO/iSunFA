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
  accountBookId: string | null;
  archivedAt: Date | null;
  isOwn: boolean;
}

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
