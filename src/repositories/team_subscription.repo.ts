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
  const { teamId, planId, billingInterval, orderId, nowMs } = input;
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
    },
    create: {
      teamId,
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      autoRenew: true,
      latestOrderId: orderId,
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
