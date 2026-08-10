import { prisma } from "@/lib/prisma";
import { SubscriptionPlanQuota } from "@/generated";
import {
  DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN,
  ISubscriptionQuota,
  TEAM_PLAN,
  TeamPlanId,
} from "@/constants/subscription_quota";

/**
 * Info: (20260809 - Luphia) 訂閱方案額度 Repository（系統設定，DB 為準）。
 * 額度是營運設定而非部署參數，故存 DB 不用 env；查無設定列時以程式碼預設值
 * fail-safe（絕不因設定缺漏而放行無限額度）。
 */
export class SubscriptionPlanQuotaRepository {
  async listAll(): Promise<SubscriptionPlanQuota[]> {
    return prisma.subscriptionPlanQuota.findMany();
  }

  async getByPlanId(planId: TeamPlanId): Promise<SubscriptionPlanQuota | null> {
    return prisma.subscriptionPlanQuota.findUnique({ where: { planId } });
  }

  /**
   * Info: (20260809 - Luphia) 取單一方案額度：無設定列即回預設值。
   * 額度為計費熱路徑（每次扣費都讀），故只做單列索引查詢，不做聚合。
   */
  async resolveQuota(planId: TeamPlanId): Promise<ISubscriptionQuota> {
    const row = await this.getByPlanId(planId);
    if (!row) return DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN[planId];
    return { per5h: row.per5h, perWeek: row.perWeek };
  }

  // Info: (20260809 - Luphia) 取全方案額度（定價頁計算倍數用），缺列者補預設值
  async resolveAllQuotas(): Promise<Record<TeamPlanId, ISubscriptionQuota>> {
    const rows = await this.listAll();
    const byPlan = new Map(rows.map((r) => [r.planId, r]));
    const resolved = {} as Record<TeamPlanId, ISubscriptionQuota>;
    (Object.values(TEAM_PLAN) as TeamPlanId[]).forEach((planId) => {
      const row = byPlan.get(planId);
      resolved[planId] = row
        ? { per5h: row.per5h, perWeek: row.perWeek }
        : DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN[planId];
    });
    return resolved;
  }

  // Info: (20260809 - Luphia) 後台調整額度用（設定變更留 updatedAt 軌跡）
  async upsertQuota(
    planId: TeamPlanId,
    quota: ISubscriptionQuota,
  ): Promise<SubscriptionPlanQuota> {
    return prisma.subscriptionPlanQuota.upsert({
      where: { planId },
      update: { per5h: quota.per5h, perWeek: quota.perWeek },
      create: { planId, per5h: quota.per5h, perWeek: quota.perWeek },
    });
  }
}

export const subscriptionPlanQuotaRepo = new SubscriptionPlanQuotaRepository();
