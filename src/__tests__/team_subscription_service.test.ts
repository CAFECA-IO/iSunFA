import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  changeTeamSubscription,
  fulfillTeamSubscriptionOrder,
  getTeamSubscriptionView,
} from "@/services/team_subscription.service";
import { BILLING_INTERVAL, TEAM_PLAN } from "@/constants/subscription_quota";
import { DEFAULT_FAITH_BILLING } from "@/constants/llm";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { ORDER_TYPE } from "@/constants/status";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { generatePaymentOrder } from "@/services/order.service";
import type { Order } from "@/generated";

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getTeamMember: jest.fn(), countMembers: jest.fn() },
}));
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: {
    getByTeamId: jest.fn(),
    downgradeToFree: jest.fn(),
    applyTeamSubscription: jest.fn(),
  },
}));
jest.mock("@/repositories/subscription_plan_quota.repo", () => ({
  subscriptionPlanQuotaRepo: { resolveQuota: jest.fn() },
}));
jest.mock("@/repositories/team_quota_usage.repo", () => ({
  teamQuotaUsageRepo: {
    sumWindowUsage: jest.fn(),
    sumTeamWindowUsage: jest.fn(),
  },
}));
jest.mock("@/repositories/faith_billing_setting.repo", () => ({
  faithBillingSettingRepo: { resolveSetting: jest.fn() },
}));
jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: { updateOrderCompleted: jest.fn() },
}));
jest.mock("@/services/order.service", () => ({
  generatePaymentOrder: jest.fn(),
}));

/**
 * Info: (20260807 - Luphia) 團隊訂閱 Service 單測（設計書 §7、P3 驗收）。
 * 覆蓋：額度視圖（fail-closed 預設 free、費思費率揭露）、OWNER 專屬變更、
 * free 免付款降級、付費方案訂單建立、checkout 履行。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

// Info: (20260807 - Luphia) 2026-08-07 12:00 台北（week 30）
const NOW_SEC = 1786075200;
const NOW_MS = NOW_SEC * 1000;

function mockMembers(roles: Record<string, string | null>) {
  asMock(teamRepo.getTeamMember).mockImplementation(async (userId: unknown) => {
    const role = roles[userId as string];
    if (!role) return null;
    return { id: `member-${userId}`, role };
  });
  // Info: (20260814 - Luphia) 席次數預設 5 人，驗證金額確實乘上人數（規範 P2）
  asMock(teamRepo.countMembers).mockResolvedValue(5);
}

describe("getTeamSubscriptionView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembers({ "user-1": "VIEWER" });
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
    // Info: (20260809 - Luphia) 額度改由 DB 設定表提供
    asMock(subscriptionPlanQuotaRepo.resolveQuota).mockImplementation(
      async (planId: unknown) =>
        planId === "business"
          ? { per5h: 1000, perWeek: 7500 }
          : { per5h: 10, perWeek: 40 },
    );
    asMock(faithBillingSettingRepo.resolveSetting).mockResolvedValue(
      DEFAULT_FAITH_BILLING,
    );
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(3),
      usedWeek: BigInt(12),
    });
    // Info: (20260817 - Luphia) 全隊合計（第二輪 C-1）：五個人加起來的用量
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(31),
      usedWeek: BigInt(150),
    });
  });

  /**
   * Info: (20260817 - Luphia) 全隊合計（PR #6652 第二輪 C-1）。
   *
   * 額度改成一人一池之後，付費者在這個頁面只看得到自己的進度條，
   * 而團隊實際消耗多少，系統中沒有任何介面說得出來。
   * 合計的分母是「每人上限 × 人數」——寫成每人上限就會讓 5 人團隊看到 310%。
   */
  /**
   * Info: (20260818 - Luphia) 全隊合計僅 OWNER 可見（產品決定 20260818）。
   * 這個數字回答的是「我付的錢被用掉多少」，而付錢的是 OWNER；
   * 對其他成員它沒有對應的問題，卻能加上人數推估同事的平均用量。
   */
  describe("team totals", () => {
    beforeEach(() => {
      mockMembers({ "user-1": "OWNER" });
    });

    it("multiplies the per-member limit by the member count", async () => {
      const view = await getTeamSubscriptionView({
        userId: "user-1",
        teamId: "team-1",
        nowSec: NOW_SEC,
      });

      expect(view.teamTotals!.memberCount).toBe(5);
      // Info: (20260817 - Luphia) free 方案每人 10 / 40，五個人即 50 / 200
      expect(view.teamTotals!.quota5h).toMatchObject({
        limit: "50",
        used: "31",
      });
      expect(view.teamTotals!.quotaWeek).toMatchObject({
        limit: "200",
        used: "150",
      });
    });

    // Info: (20260817 - Luphia) 合計用的是全隊查詢，不是把個人用量拿來充數
    it("reads the team-wide aggregate rather than the viewer's own usage", async () => {
      const view = await getTeamSubscriptionView({
        userId: "user-1",
        teamId: "team-1",
        nowSec: NOW_SEC,
      });

      expect(asMock(teamQuotaUsageRepo.sumTeamWindowUsage)).toHaveBeenCalled();
      expect(view.teamTotals!.quota5h.used).not.toBe(view.quota.quota5h.used);
    });

    it("非 OWNER 看不到全隊合計，也不會去查", async () => {
      mockMembers({ "user-1": "ADMIN" });

      const view = await getTeamSubscriptionView({
        userId: "user-1",
        teamId: "team-1",
        nowSec: NOW_SEC,
      });

      expect(view.teamTotals).toBeUndefined();
      /**
       * Info: (20260818 - Luphia) 不是「查了再丟掉」：查了再丟掉的版本，
       * 下一個人在別處重用這個函式時就會把它一起回出去。
       */
      expect(
        asMock(teamQuotaUsageRepo.sumTeamWindowUsage),
      ).not.toHaveBeenCalled();
    });

    // Info: (20260818 - Luphia) 個人額度不受影響，每個成員都看得到自己的
    it("非 OWNER 仍看得到自己的額度", async () => {
      mockMembers({ "user-1": "VIEWER" });

      const view = await getTeamSubscriptionView({
        userId: "user-1",
        teamId: "team-1",
        nowSec: NOW_SEC,
      });

      expect(view.quota.quota5h).toMatchObject({ limit: "10", used: "3" });
    });

    /**
     * Info: (20260817 - Luphia) 人數 0（資料異常）時分母不能是 0，
     * 否則進度條會拿到 NaN，畫面比沒有數字更難懂。
     */
    it("never divides by zero when the team has no members", async () => {
      asMock(teamRepo.countMembers).mockResolvedValue(0);

      const view = await getTeamSubscriptionView({
        userId: "user-1",
        teamId: "team-1",
        nowSec: NOW_SEC,
      });

      expect(view.teamTotals!.memberCount).toBe(0);
      expect(view.teamTotals!.quota5h.limit).toBe("10");
    });
  });

  it("defaults to the free plan with quota status and the faith rate", async () => {
    const view = await getTeamSubscriptionView({
      userId: "user-1",
      teamId: "team-1",
      nowSec: NOW_SEC,
    });
    expect(view.planId).toBe(TEAM_PLAN.FREE);
    expect(view.quota.quota5h).toMatchObject({ limit: "10", used: "3" });
    expect(view.quota.quotaWeek).toMatchObject({ limit: "40", used: "12" });
    expect(view.quota.quota5h.resetAt).toBeGreaterThan(NOW_SEC);
    expect(view.faithTokensPerCredit).toBe(
      DEFAULT_FAITH_BILLING.tokensPerCredit,
    );
  });

  it("rejects non-members", async () => {
    mockMembers({});
    await expect(
      getTeamSubscriptionView({
        userId: "user-x",
        teamId: "team-1",
        nowSec: NOW_SEC,
      }),
    ).rejects.toMatchObject({ code: "TW000008" });
  });

  it("reflects the subscribed plan limits", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: TEAM_PLAN.BUSINESS,
      status: "ACTIVE",
      currentPeriodStart: new Date(NOW_MS),
      currentPeriodEnd: new Date(NOW_MS + 30 * 86_400_000),
      autoRenew: true,
    } as unknown);
    const view = await getTeamSubscriptionView({
      userId: "user-1",
      teamId: "team-1",
      nowSec: NOW_SEC,
    });
    expect(view.planId).toBe(TEAM_PLAN.BUSINESS);
    expect(view.quota.quota5h.limit).toBe("1000");
    expect(view.currentPeriodStart).toBe(NOW_SEC);
  });
});

describe("changeTeamSubscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembers({ "user-owner": "OWNER", "user-admin": "ADMIN" });
    asMock(generatePaymentOrder).mockResolvedValue({
      orderId: "order-1",
      challenge: "c",
      cost: 840,
    });
  });

  it("is owner-only (even ADMIN is rejected)", async () => {
    await expect(
      changeTeamSubscription({
        userId: "user-admin",
        teamId: "team-1",
        planId: TEAM_PLAN.TEAM,
        billingInterval: BILLING_INTERVAL.MONTH,
        paymentMethodId: "pm-1",
        nowMs: NOW_MS,
      }),
    ).rejects.toMatchObject({ code: "TW000004" });
  });

  it("downgrades to free without payment", async () => {
    const result = await changeTeamSubscription({
      userId: "user-owner",
      teamId: "team-1",
      planId: TEAM_PLAN.FREE,
      billingInterval: BILLING_INTERVAL.MONTH,
      nowMs: NOW_MS,
    });
    expect(result).toEqual({ orderId: null, planId: TEAM_PLAN.FREE });
    expect(teamSubscriptionRepo.downgradeToFree).toHaveBeenCalledWith(
      "team-1",
      NOW_MS,
    );
    expect(generatePaymentOrder).not.toHaveBeenCalled();
  });

  it("creates a BILLING_SUBSCRIBE order with teamId for paid plans", async () => {
    await changeTeamSubscription({
      userId: "user-owner",
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.YEAR,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });
    expect(generatePaymentOrder).toHaveBeenCalledWith(
      "user-owner",
      expect.objectContaining({
        type: ORDER_TYPE.BILLING_SUBSCRIBE,
        // Info: (20260814 - Luphia) 5 人團隊、年繳單價 8,400 → 實收 42,000（規範 P2 席次乘算）
        amount: 42000,
        seats: 5,
        unitPrice: 8400,
        teamId: "team-1",
        planId: TEAM_PLAN.TEAM,
        billingInterval: BILLING_INTERVAL.YEAR,
      }),
    );
  });

  it("requires a payment method for paid plans", async () => {
    await expect(
      changeTeamSubscription({
        userId: "user-owner",
        teamId: "team-1",
        planId: TEAM_PLAN.TEAM,
        billingInterval: BILLING_INTERVAL.MONTH,
        nowMs: NOW_MS,
      }),
    ).rejects.toMatchObject({ code: expect.any(String) });
    expect(generatePaymentOrder).not.toHaveBeenCalled();
  });
});

describe("fulfillTeamSubscriptionOrder", () => {
  const ORDER = {
    id: "order-1",
    type: ORDER_TYPE.BILLING_SUBSCRIBE,
    data: {
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.MONTH,
    },
  } as unknown as Order;

  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamSubscriptionRepo.applyTeamSubscription).mockResolvedValue(
      {} as unknown,
    );
  });

  it("applies the plan and completes the order", async () => {
    await fulfillTeamSubscriptionOrder(ORDER, NOW_MS);
    expect(teamSubscriptionRepo.applyTeamSubscription).toHaveBeenCalledWith({
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.MONTH,
      orderId: "order-1",
      nowMs: NOW_MS,
    });
    expect(paymentRepo.updateOrderCompleted).toHaveBeenCalledWith("order-1");
  });

  it("rejects orders without team context", async () => {
    await expect(
      fulfillTeamSubscriptionOrder(
        { ...ORDER, data: {} } as unknown as Order,
        NOW_MS,
      ),
    ).rejects.toMatchObject({ code: "TW000009" });
    expect(paymentRepo.updateOrderCompleted).not.toHaveBeenCalled();
  });
});
