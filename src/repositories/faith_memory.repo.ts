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
  /**
   * Info: (20260818 - Luphia) 這一列存在、但**解不開**（第四輪 B-4）。
   *
   * 解不開時回空記憶是刻意的（記憶是加分項，不是對話的前提），但呼叫端必須
   * 分得出「沒有記憶」與「有記憶而讀不到」——否則下一次寫入會把空的合併結果
   * 蓋上去，那些偏好就永久消失，而且不留任何紀錄。
   *
   * `lostItemCount` 取自未加密的 `itemCount` 欄位：內容讀不到，但筆數還在，
   * 而稽核需要的正是筆數（規範 §6.2「刪除必寫稽核」）。
   */
  unreadable?: boolean;
  lostItemCount?: number;
}

/**
 * Info: (20260818 - Luphia) 密文綁在 `(userId, teamId)` 上（第三輪 C-5）。
 *
 * 規範 §6.2 與 ADR 018 都宣稱「密文與列綁定」，但先前只傳了 purpose——
 * GCM 的 authTag 保證密文沒被竄改，不保證它屬於這一列。有 DB 寫入權的人
 * 把 A 的四個欄位複製到 B 的列，B 下次對話就解出 A 的偏好並注入 B 的 prompt，
 * 而 authTag 完全不會察覺。
 *
 * 綁定值就是這份記憶的作用範圍本身——與 `@@unique([userId, teamId])` 同一組鍵。
 */
function memoryAad(userId: string, teamId: string): string {
  return `faith-memory:${userId}:${teamId}`;
}

function seal(items: IFaithMemoryItem[], userId: string, teamId: string) {
  const sealed = sealSecret(
    JSON.stringify(items),
    VaultPurpose.FAITH_MEMORY,
    memoryAad(userId, teamId),
  );
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
    /**
     * Info: (20260818 - Luphia) 查詢失敗也回 null，不往外拋（第三輪 C-7）。
     *
     * 先前 try/catch 只包解密，`findUnique` 的錯誤會一路拋到
     * `faith_chat.service` 的載入處——而那在 `spendCredits` **之前**，
     * 整個請求 500。`faith_memory` 表短暫不可用時，**所有付費用戶的費思全掛，
     * 免費用戶正常**（免費版根本不讀這張表）。
     *
     * 與本檔開頭「記憶是加分項，不是對話的前提」一致：讀不到就當作沒有記憶。
     */
    let row;
    try {
      row = await prisma.faithMemory.findUnique({
        where: { userId_teamId: { userId, teamId } },
      });
    } catch (error) {
      logger.error("faith memory read failed", {
        userId,
        teamId,
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
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
        memoryAad(userId, teamId),
      );
      const parsed: unknown = JSON.parse(plaintext);
      return {
        items: Array.isArray(parsed) ? (parsed as IFaithMemoryItem[]) : [],
        expiresAt: row.expiresAt,
      };
    } catch (error) {
      /**
       * Info: (20260818 - Luphia) 解不開要**說出來**（第四輪 B-4）。
       *
       * 先前只回 `{ items: [] }`，於是呼叫端把它當成「這個人還沒有記憶」，
       * 下一句話就以空集合為基礎合併並覆寫——舊偏好永久消失，
       * 沒有稽核列、沒有告警，而規範 §6.2 要求「刪除必寫稽核」。
       *
       * 最常見的成因是**遷移**：AAD 綁定（第三輪 C-5）之前封裝的密文，
       * 以新的 AAD 解必定失敗。那批列要嘛先跑
       * `scripts/backfill_faith_memory_aad.ts` 重新封裝，
       * 要嘛在被覆寫時留下一筆紀錄。這裡負責後者。
       */
      logger.error("faith memory decrypt failed", {
        userId,
        teamId,
        itemCount: row.itemCount,
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        items: [],
        expiresAt: row.expiresAt,
        unreadable: true,
        lostItemCount: row.itemCount,
      };
    }
  }

  async upsert(
    userId: string,
    teamId: string,
    items: IFaithMemoryItem[],
  ): Promise<void> {
    const payload = seal(items, userId, teamId);
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
   * Info: (20260818 - Luphia) 逐條刪除：更新內容並寫稽核，**同一個交易**（第三輪 C-6）。
   *
   * 分開寫會出現「刪了但沒有紀錄」或「有紀錄但沒刪」，兩者在合規上都說不過去。
   * 與整包刪除（`deleteWithLog`）用同一條規則，差別只在這裡是更新而非刪列。
   */
  async upsertWithDeletionLog(params: {
    userId: string;
    teamId: string;
    items: IFaithMemoryItem[];
    removedCount: number;
    reason: FaithMemoryDeletionReason;
  }): Promise<void> {
    const { userId, teamId, items, removedCount, reason } = params;
    const payload = seal(items, userId, teamId);
    await prisma.$transaction([
      prisma.faithMemory.update({
        where: { userId_teamId: { userId, teamId } },
        data: payload,
      }),
      prisma.faithMemoryDeletionLog.create({
        // Info: (20260818 - Luphia) 記的是「刪掉幾條」，不是剩下幾條
        data: { userId, teamId, itemCount: removedCount, reason },
      }),
    ]);
  }

  /**
   * Info: (20260817 - Luphia) 排定刪除時點（訂閱終止）。
   * 只動尚未排定的列：重複執行降級流程不該把期限一路往後推。
   */
  async setExpiry(
    teamId: string,
    expiresAt: Date,
    reason: FaithMemoryDeletionReason,
  ): Promise<number> {
    const result = await prisma.faithMemory.updateMany({
      where: { teamId, expiresAt: null },
      data: { expiresAt, expiryReason: reason },
    });
    return result.count;
  }

  /**
   * Info: (20260817 - Luphia) 恢復訂閱：取消排定的刪除，記憶延續。
   *
   * Info: (20260818 - Luphia) **只清自己排的那一種**（第三輪 C-8）。
   *
   * 少了 `expiryReason` 的條件，對帳每 6 小時就會把別人排的期限一起清掉——
   * 例如帳戶終止的 30 天寬限期：團隊仍在訂閱時，那個期限每輪被清一次，
   * 記憶永遠不會被刪，而條款 §3.7 寫的是「以較早屆至者為準」。
   */
  async clearExpiry(
    teamId: string,
    reason: FaithMemoryDeletionReason,
  ): Promise<number> {
    const result = await prisma.faithMemory.updateMany({
      where: { teamId, expiresAt: { not: null }, expiryReason: reason },
      data: { expiresAt: null, expiryReason: null },
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
   * **只取識別欄位、計數與期限，不取密文**——刪除不需要看見內容。
   *
   * Info: (20260818 - Luphia) 游標式分頁：回傳排在 `after` 之後的下一批（第六輪第 6 條）。
   *
   * 先前是「排除本輪失敗過的 id」（`NOT IN`）。那解決了「毒資料被一再撈回來」，
   * 但清單會長大：資料庫整體故障時每批 500 筆全部失敗，清單會一路長到失敗上界
   * （預設 10,000），之後每次查詢都帶一萬個 bind parameter——沒有超過 Postgres
   * 的上限，但查詢計畫會退化，而那正發生在資料庫已經出問題的時候。
   *
   * 游標沒有這個成長，而且保證更強：以 `(expiresAt, id)` 這個**全序**往前推進，
   * 同一輪內每一列最多被看到一次（不只是失敗的那些）。
   *
   * 排序同時是決定論的（最久到期優先、`id` 打破平手）：沒有 `orderBy` 時
   * Postgres 的回傳順序不保證穩定，某些到期列可能整輪排不進 `take`（starvation），
   * 而且除錯時重現不出來。
   */
  async listExpired(
    now: Date,
    limit: number,
    after?: { expiresAt: Date; id: string },
  ) {
    return prisma.faithMemory.findMany({
      where: {
        expiresAt: { lte: now },
        /**
         * Info: (20260818 - Luphia) 「排在游標之後」＝期限更晚，或期限相同而 id 更大。
         * 兩者缺一都會漏列或重複：只比 `expiresAt` 會跳過同一毫秒的其他列，
         * 只比 `id` 則與排序不一致。
         */
        ...(after
          ? {
              OR: [
                { expiresAt: { gt: after.expiresAt } },
                { expiresAt: after.expiresAt, id: { gt: after.id } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        userId: true,
        teamId: true,
        itemCount: true,
        expiresAt: true,
      },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
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
