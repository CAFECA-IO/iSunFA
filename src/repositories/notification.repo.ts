import { prisma } from "@/lib/prisma";
import { Notification, Prisma } from "@/generated";

/**
 * Info: (20260821 - Luphia) 小鈴鐺通知 Repository（ADR 021 補充）。
 * 只做資料存取；「哪些型別算待辦、摘要怎麼算」在 Service 層。
 */
export class NotificationRepository {
  /**
   * Info: (20260821 - Luphia) 發通知（冪等）。
   *
   * `dedupeKey` 撞唯一鍵＝這件事已經通知過（worker 重試、腳本重跑），
   * 回 null 讓呼叫端知道沒有新東西——**不拋錯**：發通知永遠不該讓
   * 主流程（分析入庫、腳本）失敗。
   */
  async createIfAbsent(params: {
    userId: string;
    type: string;
    payload: Prisma.InputJsonObject;
    dedupeKey?: string;
  }): Promise<Notification | null> {
    try {
      return await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          payload: params.payload,
          dedupeKey: params.dedupeKey ?? null,
        },
      });
    } catch (error) {
      const isUniqueConflict =
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "P2002";
      if (isUniqueConflict) return null;
      throw error;
    }
  }

  /**
   * Info: (20260825 - Julian) 未讀的**待辦型**通知（新到舊）。
   *
   * 與事件型分成兩支查詢，而不是一支撈完再在記憶體裡分類 —— 後者在未讀
   * 超過 limit 時會靜默吃掉待辦：`take: 20` 依 createdAt 取最新 20 則，
   * 一則三天前的錢包升級待辦排在 25 則新分析後面就撈不到，
   * 而摘要用的 `countUnreadByType` 沒有截斷、照樣算它。
   * 結果是徽章說「1 則待辦」而待辦區整個不存在（計畫書 D4）。
   *
   * 待辦型天然有限（一人最多一則錢包升級），但仍給上限：
   * 「天然有限」是今天的事實，不是資料庫層的約束。
   */
  async listUnreadByTypes(
    userId: string,
    types: readonly string[],
    limit: number,
  ): Promise<Notification[]> {
    if (types.length === 0) return [];
    return prisma.notification.findMany({
      where: { userId, readAt: null, type: { in: [...types] } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Info: (20260825 - Julian) 未讀的**事件型**通知（新到舊），附「還有更多」。
   *
   * 多取一則來判斷 hasMore：靜默截斷會被讀成「這就是全部」，而使用者
   * 沒有任何方式發現少了 5 則（檢查清單 §一.1 的同構要求：有上限就要說出來）。
   */
  async listUnreadExcludingTypes(
    userId: string,
    excludeTypes: readonly string[],
    limit: number,
  ): Promise<{ items: Notification[]; hasMore: boolean }> {
    const rows = await prisma.notification.findMany({
      where: {
        userId,
        readAt: null,
        ...(excludeTypes.length > 0
          ? { type: { notIn: [...excludeTypes] } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  }

  /**
   * Info: (20260821 - Luphia) 未讀計數，**依型別分組**。
   * 摘要的兩個數字不能拿截斷在 20 則的清單去數——那會把「37 個完成通知」
   * 顯示成 20。count 走索引 (userId, readAt)，便宜。
   *
   * Info: (20260825 - Julian) 同時回傳**最新一則未讀的建立時間**（計畫書 D17）。
   *
   * 為什麼跟計數綁在同一支：提示音的跨分頁去重需要一個「這是哪一次抵達」的
   * 識別值，而原本用的是 `todoCount:completedCount` —— 數量組合會重複，
   * 於是「讀完 → 來一則 → 讀完 → 再來一則」的第二則就再也不出聲。
   *
   * 用 `_max` 併進既有的 groupBy 而不是另開一支查詢：這支是每 60 秒
   * × 在線人數會打的端點，多一趟往返的代價要乘上那個係數。
   * 兩個值本來就來自同一批列，分兩次查反而可能看到不一致的快照。
   */
  async summarizeUnread(userId: string): Promise<{
    counts: Map<string, number>;
    latestCreatedAt: Date | null;
  }> {
    const groups = await prisma.notification.groupBy({
      by: ["type"],
      where: { userId, readAt: null },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const latest = groups.reduce<Date | null>((newest, group) => {
      const candidate = group._max.createdAt;
      if (!candidate) return newest;
      return newest === null || candidate > newest ? candidate : newest;
    }, null);
    return {
      counts: new Map(groups.map((group) => [group.type, group._count._all])),
      latestCreatedAt: latest,
    };
  }

  /**
   * Info: (20260825 - Julian) 把**指定型別以外**的未讀標為已讀。
   *
   * 以 `readAt: null` 為條件而不是逐 id：小鈴鐺打開就是「我看過了」，
   * 逐 id 會讓「清單截斷」之外的通知永遠未讀。
   *
   * `excludeTypes` 是這次新增的關鍵：待辦型（錢包升級）不能被「打開鈴鐺」
   * 收掉。它存在 DB、`dedupeKey` 是永久唯一鍵，一旦被誤標已讀，
   * 重跑 `request_wallet_upgrades.ts` 會撞 P2002 而不補發 ——
   * 使用者從此不知道自己需要升級，且沒有任何觀測量會顯示這件事（計畫書 D1）。
   */
  async markReadExcludingTypes(
    userId: string,
    excludeTypes: readonly string[],
    nowMs: number,
  ): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(excludeTypes.length > 0
          ? { type: { notIn: [...excludeTypes] } }
          : {}),
      },
      data: { readAt: new Date(nowMs) },
    });
    return result.count;
  }

  /**
   * Info: (20260825 - Julian) 這批使用者裡，誰有某一型別的未讀（唯讀）。
   *
   * 給預演用：`request_wallet_upgrades.ts` 不帶 `--commit` 時要能回報
   * 「有幾則待辦**會被**收掉」，而那不能靠真的去收一次。
   *
   * 一支查詢查完整批，不是逐人問 —— 掃全站使用者時後者是 N 次往返，
   * 而預演本來就已經要為每個人做一次 eth_call 了，不該再加一層。
   *
   * `distinct` 讓回傳是「有未讀的人」而不是「未讀的列」：呼叫端要的是
   * 集合成員判斷，不是筆數。
   */
  async listUserIdsWithUnread(
    type: string,
    userIds: readonly string[],
  ): Promise<Set<string>> {
    // Info: (20260825 - Julian) 空集合不進 Prisma（`in: []` 也對，但省一趟）
    if (userIds.length === 0) return new Set();
    const rows = await prisma.notification.findMany({
      where: { type, readAt: null, userId: { in: [...userIds] } },
      select: { userId: true },
      distinct: ["userId"],
    });
    return new Set(rows.map((row) => row.userId));
  }

  /**
   * Info: (20260825 - Julian) 把某一型別的未讀標為已讀（待辦型的關閉路徑）。
   *
   * 待辦型的消失由「事情真的做完了」驅動，不由「使用者看過了」驅動：
   * 錢包升級待辦在探針轉 true 時才收掉（見 `request_wallet_upgrades.ts`）。
   *
   * 回傳筆數而不是 void：呼叫端要能分辨「本來就沒有」與「收掉了一則」，
   * 那是腳本回報數字的依據。
   */
  async markReadByType(
    userId: string,
    type: string,
    nowMs: number,
  ): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null, type },
      data: { readAt: new Date(nowMs) },
    });
    return result.count;
  }
}

export const notificationRepo = new NotificationRepository();
