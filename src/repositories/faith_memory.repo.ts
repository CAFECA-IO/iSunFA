import { prisma } from "@/lib/prisma";
import { openSecret, sealSecret, VaultPurpose } from "@/lib/auth/key_vault";
import type { IFaithMemoryItem } from "@/lib/faith_memory/items";
import type { FaithMemoryDeletionReason } from "@/constants/faith_memory";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260817 - Luphia) 費思長期記憶的資料存取層（規範 §6.1 / §6.2）。
 *
 * 兩條隔離規則寫在型別裡，不靠呼叫端自律：
 * 1. **所有讀寫都以 `(userId, teamId)` 為必要參數**——沒有依單邊查詢的方法，
 *    也沒有「列出全部記憶」的入口。管理者的團隊權限不延伸到成員的對話偏好。
 * 2. **明文不出這一層以外的地方**：密文在此封裝與解開，上層拿到的一律是
 *    `IFaithMemoryItem[]`，而 DB 裡永遠只有密文。
 *
 * 例外是保留期守護行程要掃 `expiresAt <= now`——那支只取 id 與計數，
 * 不解密任何內容（刪除不需要看見內容）。
 */

export interface IFaithMemoryRecord {
  items: IFaithMemoryItem[];
  expiresAt: Date | null;
}

function seal(items: IFaithMemoryItem[]) {
  const sealed = sealSecret(JSON.stringify(items), VaultPurpose.FAITH_MEMORY);
  return {
    itemsCipher: sealed.ciphertext,
    itemsIv: sealed.iv,
    itemsTag: sealed.authTag,
    keyVersion: sealed.keyVersion,
    itemCount: items.length,
  };
}

class FaithMemoryRepository {
  /**
   * Info: (20260817 - Luphia) 解不開時回空記憶而不是拋錯。
   *
   * 金鑰輪替失誤或密文毀損時，使用者該看到的是「費思忘了我的偏好」，
   * 而不是「費思壞了、不能對話」。記憶是加分項，不是對話的前提。
   */
  async get(
    userId: string,
    teamId: string,
  ): Promise<IFaithMemoryRecord | null> {
    const row = await prisma.faithMemory.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!row) return null;

    try {
      const plaintext = openSecret(
        {
          ciphertext: row.itemsCipher,
          iv: row.itemsIv,
          authTag: row.itemsTag,
          keyVersion: row.keyVersion,
        },
        VaultPurpose.FAITH_MEMORY,
      );
      const parsed: unknown = JSON.parse(plaintext);
      return {
        items: Array.isArray(parsed) ? (parsed as IFaithMemoryItem[]) : [],
        expiresAt: row.expiresAt,
      };
    } catch (error) {
      logger.error("faith memory decrypt failed", {
        userId,
        teamId,
        message: error instanceof Error ? error.message : String(error),
      });
      return { items: [], expiresAt: row.expiresAt };
    }
  }

  async upsert(
    userId: string,
    teamId: string,
    items: IFaithMemoryItem[],
  ): Promise<void> {
    const payload = seal(items);
    await prisma.faithMemory.upsert({
      where: { userId_teamId: { userId, teamId } },
      create: { userId, teamId, ...payload },
      /**
       * Info: (20260817 - Luphia) 寫入時不動 `expiresAt`：
       * 期限由訂閱狀態的變動決定（見 setExpiry / clearExpiry），
       * 而不是由「使用者又講了一句話」決定。
       */
      update: payload,
    });
  }

  /**
   * Info: (20260817 - Luphia) 排定刪除時點（訂閱終止）。
   * 只動尚未排定的列：重複執行降級流程不該把期限一路往後推。
   */
  async setExpiry(teamId: string, expiresAt: Date): Promise<number> {
    const result = await prisma.faithMemory.updateMany({
      where: { teamId, expiresAt: null },
      data: { expiresAt },
    });
    return result.count;
  }

  // Info: (20260817 - Luphia) 恢復訂閱：取消排定的刪除，記憶延續
  async clearExpiry(teamId: string): Promise<number> {
    const result = await prisma.faithMemory.updateMany({
      where: { teamId, expiresAt: { not: null } },
      data: { expiresAt: null },
    });
    return result.count;
  }

  /**
   * Info: (20260817 - Luphia) 有記憶的團隊清單（供保留期守護行程對帳）。
   *
   * 這是 §6.1「不提供單邊查詢」的唯一例外，而它不違反該條的用意：
   * 只取 `teamId` 與是否已排定刪除，**不讀任何記憶內容**。
   * 守護行程要知道的是「哪些團隊該排刪除」，不需要看見任何一個字。
   */
  async listTeamRetentionState() {
    return prisma.faithMemory.groupBy({
      by: ["teamId"],
      _count: { _all: true },
    });
  }

  /**
   * Info: (20260817 - Luphia) 到期的記憶（供守護行程）。
   * **只取識別欄位與計數，不取密文**——刪除不需要看見內容。
   */
  async listExpired(now: Date, limit: number) {
    return prisma.faithMemory.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true, userId: true, teamId: true, itemCount: true },
      take: limit,
    });
  }

  /**
   * Info: (20260817 - Luphia) 硬刪除 + 寫稽核（規範 §7.2）。
   *
   * `DELETE` 而非 soft delete：條款承諾的是「刪除」，留一筆 `deletedAt`
   * 不算刪除。稽核列與刪除同一個交易——分開寫就會出現「刪了但沒有紀錄」
   * 或「有紀錄但沒刪」，兩者在合規上都說不過去。
   */
  async deleteWithLog(params: {
    id: string;
    userId: string;
    teamId: string;
    itemCount: number;
    reason: FaithMemoryDeletionReason;
  }): Promise<void> {
    const { id, userId, teamId, itemCount, reason } = params;
    await prisma.$transaction([
      prisma.faithMemory.delete({ where: { id } }),
      prisma.faithMemoryDeletionLog.create({
        data: { userId, teamId, itemCount, reason },
      }),
    ]);
  }

  /**
   * Info: (20260817 - Luphia) 依 (userId, teamId) 刪除（使用者主動要求 / 團隊解散）。
   * 查無資料回 false——「沒有東西可刪」不是錯誤。
   */
  async deleteByScope(
    userId: string,
    teamId: string,
    reason: FaithMemoryDeletionReason,
  ): Promise<boolean> {
    const row = await prisma.faithMemory.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: { id: true, itemCount: true },
    });
    if (!row) return false;

    await this.deleteWithLog({
      id: row.id,
      userId,
      teamId,
      itemCount: row.itemCount,
      reason,
    });
    return true;
  }
}

export const faithMemoryRepo = new FaithMemoryRepository();
