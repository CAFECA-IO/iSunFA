import { prisma } from "@/lib/prisma";
import { Prisma, TeamSubscription } from "@/generated";
import {
  BILLING_INTERVAL,
  BillingInterval,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260807 - Luphia) 團隊訂閱 Repository（設計書 §3.1）。
 * 只做資料存取，方案額度解析與計費邏輯在 Service 層。
 */

export interface IApplyTeamSubscriptionInput {
  teamId: string;
  planId: string;
  billingInterval: BillingInterval;
  orderId: string | null;
  nowMs: number;
  // Info: (20260814 - Luphia) 本期付費席次與單價快照（規範 P2）；缺省維持既有值不動
  seats?: number;
  unitPrice?: number;
}

const DAY_MS = 86_400_000;

/**
 * Info: (20260807 - Luphia) 付款成功後套用訂閱（設計書 §7 PUT /subscription 的履行）。
 * 以 TransactionClient 形式導出，供 processOenPayment 在同一筆付款交易內原子套用；
 * 計費週期：月繳 30 天、年繳 365 天，自付款當下起算。
 */
export async function applyTeamSubscriptionInTx(
  tx: Prisma.TransactionClient,
  input: IApplyTeamSubscriptionInput,
): Promise<TeamSubscription> {
  const { teamId, planId, billingInterval, orderId, nowMs, seats, unitPrice } =
    input;
  const periodDays = billingInterval === BILLING_INTERVAL.YEAR ? 365 : 30;
  const currentPeriodStart = new Date(nowMs);
  const currentPeriodEnd = new Date(nowMs + periodDays * DAY_MS);

  return tx.teamSubscription.upsert({
    where: { teamId },
    update: {
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      autoRenew: true,
      latestOrderId: orderId,
      /**
       * Info: (20260814 - Luphia) 席次與單價缺省時不覆寫：期中加人只動 seats，
       * 續訂或改方案才會連同單價一起換新。用 undefined 讓 Prisma 略過該欄位。
       */
      seats,
      unitPrice,
    },
    create: {
      teamId,
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      autoRenew: true,
      latestOrderId: orderId,
      seats: seats ?? 1,
      unitPrice: unitPrice ?? 0,
    },
  });
}

export class TeamSubscriptionRepository {
  async getByTeamId(teamId: string): Promise<TeamSubscription | null> {
    return prisma.teamSubscription.findUnique({ where: { teamId } });
  }

  async create(
    data: Prisma.TeamSubscriptionUncheckedCreateInput,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.create({ data });
  }

  /**
   * Info: (20260814 - Luphia) 期中增加席次（規範 P3）：只動 seats，不碰週期與單價。
   * 用 increment 而非讀後寫，兩個管理者同時邀請時才不會有人的席次被蓋掉。
   */
  async addSeats(teamId: string, seats: number): Promise<void> {
    if (seats <= 0) return;
    await prisma.teamSubscription.update({
      where: { teamId },
      data: { seats: { increment: seats } },
    });
  }

  async update(
    id: string,
    data: Prisma.TeamSubscriptionUpdateInput,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.update({ where: { id }, data });
  }

  // Info: (20260807 - Luphia) 綁卡直扣（checkout）履行路徑用的獨立交易版本
  async applyTeamSubscription(
    input: IApplyTeamSubscriptionInput,
  ): Promise<TeamSubscription> {
    return prisma.$transaction(async (tx) =>
      applyTeamSubscriptionInTx(tx, input),
    );
  }

  /**
   * Info: (20260807 - Luphia) 續訂 Worker 用：到期未續約的付費方案降級 free（設計書 §9 P4）。
   * status 記 PAST_DUE 保留「曾為付費戶」的稽核線索；扣費側另有 fail-closed 防線
   * （resolveEffectivePlanId），Worker 未跑到期間也不會多放額度。
   */
  async expireOverdue(nowMs: number): Promise<number> {
    const result = await prisma.teamSubscription.updateMany({
      where: {
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        planId: { not: TEAM_PLAN.FREE },
        currentPeriodEnd: { lt: new Date(nowMs) },
        autoRenew: false,
      },
      data: {
        planId: TEAM_PLAN.FREE,
        status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
      },
    });
    return result.count;
  }

  /**
   * Info: (20260807 - Luphia) autoRenew=true 的到期戶不直接降級：標 PAST_DUE 由續訂流程
   * 嘗試扣款（自動扣款續訂為後續 issue；標記後 fail-closed 防線即刻生效，不多放額度）。
   */
  async markOverdueForRenewal(nowMs: number): Promise<number> {
    const result = await prisma.teamSubscription.updateMany({
      where: {
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        planId: { not: TEAM_PLAN.FREE },
        currentPeriodEnd: { lt: new Date(nowMs) },
        autoRenew: true,
      },
      data: { status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE },
    });
    return result.count;
  }

  // Info: (20260807 - Luphia) 續訂 Worker 用：待自動扣款的過期付費訂閱
  async listPastDueAutoRenew(): Promise<TeamSubscription[]> {
    return prisma.teamSubscription.findMany({
      where: {
        status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
        autoRenew: true,
        planId: { not: TEAM_PLAN.FREE },
      },
      orderBy: { currentPeriodEnd: "asc" },
    });
  }

  // Info: (20260807 - Luphia) 免付款的直接降級（PUT planId=free）
  async downgradeToFree(
    teamId: string,
    nowMs: number,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.upsert({
      where: { teamId },
      update: {
        planId: TEAM_PLAN.FREE,
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        autoRenew: false,
      },
      create: {
        teamId,
        planId: TEAM_PLAN.FREE,
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodStart: new Date(nowMs),
        currentPeriodEnd: new Date(nowMs),
        autoRenew: false,
      },
    });
  }
}

export const teamSubscriptionRepo = new TeamSubscriptionRepository();
