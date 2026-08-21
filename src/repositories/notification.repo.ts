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

  // Info: (20260821 - Luphia) 未讀的事件型通知（新到舊）
  async listUnread(userId: string, limit: number): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Info: (20260821 - Luphia) 未讀計數，**依型別分組**。
   * 摘要的兩個數字不能拿截斷在 20 則的清單去數——那會把「37 個完成通知」
   * 顯示成 20。count 走索引 (userId, readAt)，便宜。
   */
  async countUnreadByType(userId: string): Promise<Map<string, number>> {
    const groups = await prisma.notification.groupBy({
      by: ["type"],
      where: { userId, readAt: null },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.type, group._count._all]));
  }

  /**
   * Info: (20260821 - Luphia) 全部標為已讀。
   * 以 `readAt: null` 為條件而不是逐 id：小鈴鐺打開就是「我看過了」，
   * 逐 id 會讓「清單截斷在 20 則」之外的通知永遠未讀。
   */
  async markAllRead(userId: string, nowMs: number): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(nowMs) },
    });
    return result.count;
  }
}

export const notificationRepo = new NotificationRepository();
