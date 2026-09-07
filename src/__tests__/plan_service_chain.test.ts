import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  getPlanUnitPrice,
  getTeamEntitlement,
  getUserPlan,
  listPlans,
} from "@/services/plan.service";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import {
  BILLING_INTERVAL,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";
import { SUBSCRIPTION_PLAN_PRICE } from "@/constants/price";

/**
 * Info: (20260819 - Luphia) 方案的單一入口 service。
 *
 * Info: (20260821 - Luphia) **方案一律讀 DB、零 RPC**（產品裁定 20260821，
 * 更正 20260819 的「鏈上為準」）：付款完成即視為會員卡有效，鑄卡狀態與
 * 顯示無關。這一支曾經讀鏈上卡片並對帳，代價是每期續訂後、卡片換 URI 之前，
 * 付費戶被顯示成免費版（review #6687 阻擋級）——那一整層已移除，
 * 這裡釘住的不變式因此變成：**getUserPlan 與 getTeamEntitlement 都不打任何 RPC**。
 */

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { listOwnedTeamsWithSubscription: jest.fn(async () => []) },
}));

jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { getByTeamId: jest.fn(async () => null) },
}));

jest.mock("@/repositories/subscription_plan_quota.repo", () => ({
  subscriptionPlanQuotaRepo: {
    resolveQuota: jest.fn(async () => ({ per5h: 10, perWeek: 100 })),
  },
}));

/**
 * Info: (20260821 - Luphia) viem 整包 mock 成炸彈：方案讀取若打任何 RPC，
 * 測試當場紅。這不是防禦性寫法——「請求路徑零 RPC」正是這次裁定的內容，
 * 值得一個會爆炸的斷言，而不是靠 reviewer 記得。
 */
jest.mock("@/lib/viem", () => ({
  publicClient: new Proxy(
    {},
    {
      get: (_target, property) => () => {
        throw new Error(
          `plan display must not touch RPC (${String(property)})`,
        );
      },
    },
  ),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_SEC = 1_760_000_000;

function ownedTeam(planId: string, overrides: Record<string, unknown> = {}) {
  return {
    teamId: `team-${planId}`,
    subscription: {
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date((NOW_SEC + 86_400) * 1000),
      ...overrides,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([]);
  asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
});

describe("getUserPlan：純 DB", () => {
  it("沒有擁有任何團隊時回免費版", async () => {
    const snapshot = await getUserPlan({ userId: "user-1", nowSec: NOW_SEC });

    expect(snapshot).toEqual({ plan: TEAM_PLAN.FREE, ownedPlans: [] });
  });

  it("擁有訂閱中的團隊時回該方案", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.TEAM),
    ]);

    const snapshot = await getUserPlan({ userId: "user-1", nowSec: NOW_SEC });

    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
    expect(snapshot.ownedPlans).toEqual([TEAM_PLAN.TEAM]);
  });

  it("多個團隊：徽章取最高，逐團事實一併回傳", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.FREE),
      ownedTeam(TEAM_PLAN.BUSINESS),
    ]);

    const snapshot = await getUserPlan({ userId: "user-1", nowSec: NOW_SEC });

    expect(snapshot.plan).toBe(TEAM_PLAN.BUSINESS);
    expect(snapshot.ownedPlans).toEqual([TEAM_PLAN.FREE, TEAM_PLAN.BUSINESS]);
  });

  /**
   * Info: (20260821 - Luphia) 過期與 PAST_DUE 折算為 free，與扣費側同判準：
   * 畫面說團隊版而額度按免費版扣，比顯示免費版更糟。
   */
  it("已過期的付費訂閱顯示免費版", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.TEAM, {
        currentPeriodEnd: new Date((NOW_SEC - 1) * 1000),
      }),
    ]);

    const snapshot = await getUserPlan({ userId: "user-1", nowSec: NOW_SEC });

    expect(snapshot.plan).toBe(TEAM_PLAN.FREE);
  });

  /**
   * Info: (20260821 - Luphia) 產品裁定的核心：**付款落地（DB）即有效**，
   * 卡片鑄不鑄得出來與顯示無關。這一條的存在是為了擋「改回讀鏈上」的重構
   * ——viem 的炸彈 mock 會讓那種改動立刻紅。
   */
  it("不打任何 RPC", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.BUSINESS),
    ]);

    await expect(
      getUserPlan({ userId: "user-1", nowSec: NOW_SEC }),
    ).resolves.toBeDefined();
  });
});

describe("getTeamEntitlement：權益只看 DB", () => {
  it("不打任何 RPC，且照常折算", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: TEAM_PLAN.BUSINESS,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date((NOW_SEC + 10) * 1000),
    });

    const plan = await getTeamEntitlement({
      teamId: "team-1",
      nowSec: NOW_SEC,
    });

    expect(plan).toBe(TEAM_PLAN.BUSINESS);
  });

  it("查無訂閱列 → free（fail-closed）", async () => {
    expect(
      await getTeamEntitlement({ teamId: "team-1", nowSec: NOW_SEC }),
    ).toBe(TEAM_PLAN.FREE);
  });

  it("過期的付費訂閱 → free", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: TEAM_PLAN.TEAM,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date((NOW_SEC - 1) * 1000),
    });

    expect(
      await getTeamEntitlement({ teamId: "team-1", nowSec: NOW_SEC }),
    ).toBe(TEAM_PLAN.FREE);
  });
});

describe("方案目錄", () => {
  it("列出三個方案，含價格、月配點、儲存與額度", async () => {
    const plans = await listPlans();

    expect(plans.map((plan) => plan.id)).toEqual([
      TEAM_PLAN.FREE,
      TEAM_PLAN.TEAM,
      TEAM_PLAN.BUSINESS,
    ]);
    const team = plans.find((plan) => plan.id === TEAM_PLAN.TEAM);
    expect(team).toEqual(
      expect.objectContaining({
        isPaid: true,
        monthlyPrice: SUBSCRIPTION_PLAN_PRICE.team.monthly,
        yearlyPrice: SUBSCRIPTION_PLAN_PRICE.team.yearly,
        quota: { per5h: 10, perWeek: 100 },
      }),
    );
    expect(plans.find((plan) => plan.id === TEAM_PLAN.FREE)?.isPaid).toBe(
      false,
    );
  });

  it("單價出口與價格表一致（月/年）", () => {
    expect(getPlanUnitPrice(TEAM_PLAN.TEAM, BILLING_INTERVAL.MONTH)).toBe(
      SUBSCRIPTION_PLAN_PRICE.team.monthly,
    );
    expect(getPlanUnitPrice(TEAM_PLAN.TEAM, BILLING_INTERVAL.YEAR)).toBe(
      SUBSCRIPTION_PLAN_PRICE.team.yearly,
    );
    expect(getPlanUnitPrice(TEAM_PLAN.FREE, BILLING_INTERVAL.MONTH)).toBe(0);
  });
});
