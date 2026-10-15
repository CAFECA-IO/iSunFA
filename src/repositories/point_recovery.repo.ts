import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import { ORDER_STATUS } from "@/constants/status";
import { TEAM_WALLET_ENTRY_TYPE } from "@/constants/subscription_quota";
import { POINT_LEDGER_ENTRY_TYPE } from "@/constants/point_ledger";

/**
 * Info: (20261015 - Luphia) 點數復原指令的資料讀寫（見 `services/point_recovery.service.ts`）。
 *
 * 只讀「點數可能來自或流向」的來源；計算規則全部在 service 的純函式裡，
 * 這裡不做任何判斷，好讓規則可以被單測逐條釘住。
 */

export interface IRecoveryUserRow {
  id: string;
  pointBalance: bigint;
}

export interface IRecoveryOrderRow {
  id: string;
  userId: string;
  type: string;
  amount: bigint;
  unit: string;
  status: string;
  data: Prisma.JsonValue;
  signature: string | null;
  transactionHash: string | null;
  createdAt: Date;
}

export interface IRecoveryCampaignRow {
  id: string;
  userId: string;
  bonusPoints: number;
  campaignName: string;
}

export interface IRecoveryTeamLedgerRow {
  id: string;
  entryType: string;
  amount: bigint;
  targetUserId: string | null;
  txHash: string | null;
  idempotencyKey: string;
}

export interface IRecoveryExistingEntryRow {
  id: string;
  userId: string;
  amount: bigint;
  sourceRef: string | null;
  idempotencyKey: string;
}

export class PointRecoveryRepository {
  // Info: (20261015 - Luphia) 帳本裡既有的團隊分配分錄（撤銷舊規則誤發用）
  async listExistingTeamAllocationEntries(
    userId?: string,
  ): Promise<IRecoveryExistingEntryRow[]> {
    return prisma.pointLedger.findMany({
      where: {
        entryType: POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION,
        ...(userId ? { userId } : {}),
      },
      select: {
        id: true,
        userId: true,
        amount: true,
        sourceRef: true,
        idempotencyKey: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async listUsers(userId?: string): Promise<IRecoveryUserRow[]> {
    return prisma.user.findMany({
      where: userId ? { id: userId } : undefined,
      select: { id: true, pointBalance: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async listOrders(userId?: string): Promise<IRecoveryOrderRow[]> {
    return prisma.order.findMany({
      where: userId ? { userId } : undefined,
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        unit: true,
        status: true,
        data: true,
        signature: true,
        transactionHash: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async listCampaignRegistrations(
    userId?: string,
  ): Promise<IRecoveryCampaignRow[]> {
    const rows = await prisma.campaignRegistration.findMany({
      where: userId ? { userId } : undefined,
      select: {
        id: true,
        userId: true,
        campaign: { select: { bonusPoints: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      bonusPoints: row.campaign?.bonusPoints ?? 0,
      campaignName: row.campaign?.name ?? "",
    }));
  }

  // Info: (20261015 - Luphia) 團隊分配到個人的分錄與其補償分錄（ALLOCATE / ADJUST）
  async listTeamAllocationLedger(): Promise<IRecoveryTeamLedgerRow[]> {
    return prisma.teamWalletLedger.findMany({
      where: {
        entryType: {
          in: [TEAM_WALLET_ENTRY_TYPE.ALLOCATE, TEAM_WALLET_ENTRY_TYPE.ADJUST],
        },
      },
      select: {
        id: true,
        entryType: true,
        amount: true,
        targetUserId: true,
        txHash: true,
        idempotencyKey: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async sumLedgerByUser(): Promise<Map<string, bigint>> {
    const rows = await prisma.pointLedger.groupBy({
      by: ["userId"],
      _sum: { amount: true },
    });
    return new Map(rows.map((r) => [r.userId, r._sum.amount ?? BigInt(0)]));
  }

  /**
   * Info: (20261015 - Luphia) 已付款未發點的購點訂單：點數已由帳本補發，訂單推進到 COMPLETED。
   * 條件更新只動仍在原狀態的列，重跑不會覆蓋之後被其他流程改過的訂單。
   */
  async settleRestoredPurchase(
    orderId: string,
    fromStatus: string,
    note: string,
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== fromStatus) return false;
      const data = (order.data ?? {}) as Prisma.JsonObject;
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.COMPLETED,
          data: { ...data, pointLedgerRestored: note },
        },
      });
      return true;
    });
  }

  /**
   * Info: (20261015 - Luphia) 鏈上付款仍在途（PAYING）的舊訂單：鏈已損毀、無從確認，
   * 一律視為未扣款並終結為 PAYMENT_FAILED，與復原時「不扣這筆」的處理一致。
   */
  async failLegacyPayingOrder(
    orderId: string,
    reason: string,
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== ORDER_STATUS.PAYING) return false;
      const data = (order.data ?? {}) as Prisma.JsonObject;
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.PAYMENT_FAILED,
          data: { ...data, failureReason: reason },
        },
      });
      return true;
    });
  }

  // Info: (20261015 - Luphia) 以帳本加總覆寫餘額快取（勾稽發現不一致時的修復）
  async overwriteBalanceCache(userId: string, balance: bigint): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pointBalance: balance },
    });
  }
}

export const pointRecoveryRepo = new PointRecoveryRepository();
