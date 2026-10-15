import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import {
  IOrderWithMission,
  IOrderUpdateTokensParams,
} from "@/interfaces/payment";
import { ORDER_TYPE, ORDER_STATUS } from "@/constants/status";
import type { JSONValue } from "@/validators";

export class OrderRepository {
  async findFirst(args: Prisma.OrderFindFirstArgs) {
    return prisma.order.findFirst(args);
  }

  async findMany(args: Prisma.OrderFindManyArgs) {
    return prisma.order.findMany(args);
  }

  async update(args: Prisma.OrderUpdateArgs) {
    return prisma.order.update(args);
  }
  async count(args?: Prisma.OrderCountArgs) {
    return prisma.order.count(args);
  }
  async countAllOrders(): Promise<number> {
    return prisma.order.count();
  }

  /**
   * Info: (20261015 - Luphia) 已完成、但從未派發任務（mission 為空）的團隊額度分析訂單候選。
   * 只做粗篩（型別、狀態、mission、signature 含 team_quota）；精確判定在
   * `team_quota_redispatch.service` 的純函式裡，好讓規則可以單測。
   */
  async listUndispatchedTeamQuotaCandidates(params: { orderId?: string }) {
    return prisma.order.findMany({
      where: {
        type: ORDER_TYPE.ANALYSIS,
        status: ORDER_STATUS.COMPLETED,
        OR: [{ mission: null }, { mission: "" }, { mission: "[]" }],
        signature: { contains: "team_quota" },
        ...(params.orderId ? { id: params.orderId } : {}),
      },
      select: {
        id: true,
        userId: true,
        data: true,
        signature: true,
        mission: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Info: (20261015 - Luphia) 把未派發的已完成訂單送回 PAID，交給 issue.service 派發。
   * 條件更新：只動仍是 COMPLETED 且 mission 仍為空的列，重跑或與 worker 併發都不會重複派發。
   */
  async requeueUndispatchedOrder(orderId: string): Promise<boolean> {
    const updated = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: ORDER_STATUS.COMPLETED,
        OR: [{ mission: null }, { mission: "" }, { mission: "[]" }],
      },
      data: { status: ORDER_STATUS.PAID },
    });
    return updated.count > 0;
  }

  // Info: (20260511 - Julian) 用於 analysis.service 的方法
  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Info: (20261015 - Luphia) 只在訂單仍是 PENDING 時取消（逾時清理用）。
   * 無條件的 update 會把「讀到 PENDING 之後、寫入之前」剛付掉的訂單蓋回 CANCEL——
   * 點數付款同步完成之後，那個窗口不再是理論值。回傳是否真的取消了。
   */
  async cancelIfPending(id: string): Promise<boolean> {
    const updated = await prisma.order.updateMany({
      where: { id, status: ORDER_STATUS.PENDING },
      data: { status: ORDER_STATUS.CANCEL },
    });
    return updated.count > 0;
  }

  async updateOrderData(id: string, data: JSONValue) {
    return prisma.order.update({
      where: { id },
      data: { data: data as Prisma.InputJsonValue },
    });
  }

  async countCommissionOrders(): Promise<number> {
    return prisma.order.count({
      where: {
        amount: { lt: 0 },
      },
    });
  }

  async getAllOrdersPaginated(skip: number, limit: number) {
    return prisma.order.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        paymentTransactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }

  async getAllCommissionOrdersPaginated(skip: number, limit: number) {
    return prisma.order.findMany({
      where: {
        amount: { lt: 0 },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        paymentTransactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }

  async getOrdersMissingTokens(): Promise<IOrderWithMission[]> {
    const orders = await prisma.order.findMany({
      where: {
        type: ORDER_TYPE.ANALYSIS,
        status: ORDER_STATUS.COMPLETED,
        mission: { not: null },
        OR: [{ tokens: null }, { tokens: 0 }],
      },
      select: {
        id: true,
        mission: true,
        tokens: true,
      },
    });
    return orders;
  }

  async updateOrderTokens(params: IOrderUpdateTokensParams): Promise<void> {
    await prisma.order.update({
      where: { id: params.id },
      data: { tokens: params.tokens },
    });
  }
}

export const orderRepo = new OrderRepository();
