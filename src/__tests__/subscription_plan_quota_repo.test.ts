import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import {
  DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN,
  TEAM_PLAN,
} from "@/constants/subscription_quota";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscriptionPlanQuota: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

/**
 * Info: (20260809 - Luphia) 額度設定 Repository 單測。
 * 額度是保存於 DB 的系統設定（非 env）；核心不變量為
 * 「查無設定列時 fail-safe 回程式碼預設值，絕不放行無限額度」。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

describe("SubscriptionPlanQuotaRepository.resolveQuota", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the stored setting when a row exists", async () => {
    asMock(prisma.subscriptionPlanQuota.findUnique).mockResolvedValue({
      planId: TEAM_PLAN.TEAM,
      per5h: 250,
      perWeek: 2000,
    } as unknown);
    await expect(
      subscriptionPlanQuotaRepo.resolveQuota(TEAM_PLAN.TEAM),
    ).resolves.toEqual({ per5h: 250, perWeek: 2000 });
  });

  it("falls back to the code default when the setting row is missing", async () => {
    asMock(prisma.subscriptionPlanQuota.findUnique).mockResolvedValue(null);
    await expect(
      subscriptionPlanQuotaRepo.resolveQuota(TEAM_PLAN.BUSINESS),
    ).resolves.toEqual(DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN[TEAM_PLAN.BUSINESS]);
  });
});

describe("SubscriptionPlanQuotaRepository.resolveAllQuotas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fills every plan, mixing stored settings with defaults", async () => {
    asMock(prisma.subscriptionPlanQuota.findMany).mockResolvedValue([
      { planId: TEAM_PLAN.TEAM, per5h: 250, perWeek: 2000 },
    ] as unknown);

    const quotas = await subscriptionPlanQuotaRepo.resolveAllQuotas();
    expect(quotas[TEAM_PLAN.TEAM]).toEqual({ per5h: 250, perWeek: 2000 });
    // Info: (20260809 - Luphia) 未設定的方案補預設值，確保定價頁倍數計算不會除以 undefined
    expect(quotas[TEAM_PLAN.FREE]).toEqual(
      DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN[TEAM_PLAN.FREE],
    );
    expect(quotas[TEAM_PLAN.BUSINESS]).toEqual(
      DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN[TEAM_PLAN.BUSINESS],
    );
  });

  it("returns all defaults when nothing is configured yet", async () => {
    asMock(prisma.subscriptionPlanQuota.findMany).mockResolvedValue([]);
    await expect(subscriptionPlanQuotaRepo.resolveAllQuotas()).resolves.toEqual(
      DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN,
    );
  });
});
