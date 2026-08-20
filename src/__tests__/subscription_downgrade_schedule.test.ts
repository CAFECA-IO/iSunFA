import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import { changeTeamSubscription } from "@/services/team_subscription.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { generatePaymentOrder } from "@/services/order.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { assertTeamMember } from "@/services/team_wallet_access.guard";
import {
  BILLING_INTERVAL,
  isPlanDowngrade,
  PLAN_RANK,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";
import { TeamRole } from "@/constants/team";

/**
 * Info: (20260820 - Luphia) **降級不得期中生效**（修正 20260820）。
 *
 * 這一支釘住的是程式與對外承諾的一致性，而不是一個內部設計偏好：
 * 《退款政策》§2.1 寫的是「一旦取消或降級，您的變更將於當前結算週期結束後自動生效」，
 * 並明言不按比例退費。先前的程式對 free 是**當場**改 `planId`——收了整期的錢、
 * 當場收回權益。兩者不能並存。
 *
 * 因此每一條都是「當期權益不得被動到」的具體形式：
 *
 * - 降級只寫 `pendingPlanId`，`planId` / 週期 / 單價一個都不准動
 * - 降級**不建單、不扣款**（付費→付費的降級先前會再收一整期）
 * - 回傳的 `planId` 是**當期**方案，畫面不該顯示還沒生效的新方案
 * - 升級維持立即生效（付更多錢拿更多，沒有承諾問題）
 */

jest.mock("@/services/team_wallet_access.guard", () => ({
  assertTeamMember: jest.fn(async () => ({ role: "OWNER" })),
}));

jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: {
    getByTeamId: jest.fn(async () => null),
    schedulePlanChange: jest.fn(async () => undefined),
    cancelPendingPlanChange: jest.fn(async () => undefined),
    downgradeToFree: jest.fn(async () => undefined),
  },
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { countMembers: jest.fn(async () => 3) },
}));

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    // Info: (20260820 - Luphia) 當期的計費週期只存在最後一張訂單的 data 裡
    getOrderById: jest.fn(async () => ({
      id: "order-0",
      data: { billingInterval: "month" },
    })),
  },
}));

jest.mock("@/services/order.service", () => ({
  generatePaymentOrder: jest.fn(async () => ({
    orderId: "order-1",
    challenge: "c",
    cost: 2520,
  })),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_MS = 1_760_000_000_000;
const PERIOD_END_MS = NOW_MS + 15 * 86_400_000;

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    teamId: "team-1",
    planId: TEAM_PLAN.BUSINESS,
    status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart: new Date(NOW_MS - 15 * 86_400_000),
    currentPeriodEnd: new Date(PERIOD_END_MS),
    autoRenew: true,
    latestOrderId: "order-0",
    seats: 3,
    unitPrice: 2940,
    pendingPlanId: null,
    createdAt: new Date(NOW_MS),
    updatedAt: new Date(NOW_MS),
    ...overrides,
  };
}

function change(planId: string) {
  return changeTeamSubscription({
    userId: "user-1",
    teamId: "team-1",
    planId: planId as typeof TEAM_PLAN.TEAM,
    billingInterval: BILLING_INTERVAL.MONTH,
    paymentMethodId: "pm-1",
    nowMs: NOW_MS,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(assertTeamMember).mockResolvedValue({ role: TeamRole.OWNER });
  asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(subscriptionRow());
  asMock(teamSubscriptionRepo.schedulePlanChange).mockResolvedValue(undefined);
  asMock(teamSubscriptionRepo.cancelPendingPlanChange).mockResolvedValue(
    undefined,
  );
  asMock(generatePaymentOrder).mockResolvedValue({
    orderId: "order-1",
    challenge: "c",
    cost: 2520,
  });
  asMock(paymentRepo.getOrderById).mockResolvedValue({
    id: "order-0",
    data: { billingInterval: BILLING_INTERVAL.MONTH },
  });
});

describe("降級：排程到當期屆滿", () => {
  it("企業版 → 團隊版：只排程，不建單、不扣款、不動當期方案", async () => {
    const result = await change(TEAM_PLAN.TEAM);

    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).toHaveBeenCalledWith({
      teamId: "team-1",
      pendingPlanId: TEAM_PLAN.TEAM,
      // Info: (20260820 - Luphia) 降到較低的付費方案仍要續訂（期末以新方案計價）
      autoRenew: true,
    });
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(asMock(teamSubscriptionRepo.downgradeToFree)).not.toHaveBeenCalled();
    expect(result).toEqual({
      orderId: null,
      // Info: (20260820 - Luphia) 回**當期**方案：權益沒有變，畫面不該顯示新方案
      planId: TEAM_PLAN.BUSINESS,
      pendingPlanId: TEAM_PLAN.TEAM,
      effectiveAt: Math.floor(PERIOD_END_MS / 1000),
    });
  });

  /**
   * Info: (20260820 - Luphia) 這一條就是修正的核心：改為免費版**不再**當場降級。
   *
   * `downgradeToFree` 會把 `planId` 改成 free 並歸零單價——那支仍然存在
   *（寬限期用盡時由續訂 worker 呼叫），但**使用者主動降級不得走它**。
   */
  it("付費 → 免費版：只排程並關閉自動續訂，不呼叫 downgradeToFree", async () => {
    const result = await change(TEAM_PLAN.FREE);

    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).toHaveBeenCalledWith({
      teamId: "team-1",
      pendingPlanId: TEAM_PLAN.FREE,
      // Info: (20260820 - Luphia) 降到 free＝期末終止，關掉續訂讓 expireOverdue 落地
      autoRenew: false,
    });
    expect(asMock(teamSubscriptionRepo.downgradeToFree)).not.toHaveBeenCalled();
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result.planId).toBe(TEAM_PLAN.BUSINESS);
    expect(result.pendingPlanId).toBe(TEAM_PLAN.FREE);
  });

  // Info: (20260820 - Luphia) 生效時點就是當期屆滿，不是「三十天後」之類的另算
  it("生效時點等於當期屆滿", async () => {
    const result = await change(TEAM_PLAN.FREE);

    expect(result.effectiveAt).toBe(Math.floor(PERIOD_END_MS / 1000));
  });

  /**
   * Info: (20260820 - Luphia) 已過期的付費訂閱（有效方案已是 free）不算降級。
   *
   * 那種列走的是正常的購買路徑——否則使用者會被排程到一個早就過去的期末，
   * 而畫面顯示「將於某個過去的日期生效」。
   */
  it("有效方案已是 free 時，選 free 不排程也不建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ currentPeriodEnd: new Date(NOW_MS - 1000) }),
    );

    const result = await change(TEAM_PLAN.FREE);

    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).not.toHaveBeenCalled();
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result.planId).toBe(TEAM_PLAN.FREE);
  });
});

describe("升級：立即生效", () => {
  it("團隊版 → 企業版：照常建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ planId: TEAM_PLAN.TEAM, unitPrice: 840 }),
    );

    await change(TEAM_PLAN.BUSINESS);

    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).not.toHaveBeenCalled();
  });

  // Info: (20260820 - Luphia) 免費戶購買付費方案是升級，不受排程影響
  it("免費版 → 團隊版：照常建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ planId: TEAM_PLAN.FREE, unitPrice: 0 }),
    );

    await change(TEAM_PLAN.TEAM);

    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260820 - Luphia) 同方案再購買（或改計費週期）走升級路徑，
   * 而**沒有排程中的降級**時它就只是一次續購。
   */
  it("同方案且無排程：照常建單", async () => {
    await change(TEAM_PLAN.BUSINESS);

    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
    expect(
      asMock(teamSubscriptionRepo.cancelPendingPlanChange),
    ).not.toHaveBeenCalled();
  });
});

describe("取消排程", () => {
  /**
   * Info: (20260820 - Luphia) 沒有這條，排程降級之後就沒有回頭路。
   *
   * 畫面上他的方案還是企業版（正確），於是再按一次企業版會走升級路徑——
   * 建一張新單、再收一整期的錢。
   */
  it("排程中又選回當期方案：取消排程，不建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.FREE, autoRenew: false }),
    );

    const result = await change(TEAM_PLAN.BUSINESS);

    expect(
      asMock(teamSubscriptionRepo.cancelPendingPlanChange),
    ).toHaveBeenCalledWith("team-1");
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result).toEqual({
      orderId: null,
      planId: TEAM_PLAN.BUSINESS,
      pendingPlanId: null,
      effectiveAt: Math.floor(NOW_MS / 1000),
    });
  });

  // Info: (20260820 - Luphia) 排程中改成另一個更低的方案：改排程，仍然不收費
  it("排程中改選另一個降級目標：重新排程", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.TEAM }),
    );

    await change(TEAM_PLAN.FREE);

    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).toHaveBeenCalledWith(
      expect.objectContaining({ pendingPlanId: TEAM_PLAN.FREE }),
    );
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
  });
});

describe("升降級的判準", () => {
  it("business > team > free", () => {
    expect(PLAN_RANK[TEAM_PLAN.BUSINESS]).toBeGreaterThan(
      PLAN_RANK[TEAM_PLAN.TEAM],
    );
    expect(PLAN_RANK[TEAM_PLAN.TEAM]).toBeGreaterThan(
      PLAN_RANK[TEAM_PLAN.FREE],
    );
  });

  it("只有往低的方向算降級，同方案不算", () => {
    expect(isPlanDowngrade(TEAM_PLAN.BUSINESS, TEAM_PLAN.TEAM)).toBe(true);
    expect(isPlanDowngrade(TEAM_PLAN.TEAM, TEAM_PLAN.FREE)).toBe(true);
    expect(isPlanDowngrade(TEAM_PLAN.FREE, TEAM_PLAN.BUSINESS)).toBe(false);
    expect(isPlanDowngrade(TEAM_PLAN.TEAM, TEAM_PLAN.TEAM)).toBe(false);
  });
});

describe("權限", () => {
  // Info: (20260820 - Luphia) 排程仍是 OWNER 專屬：它決定下一期要付多少錢
  it("非 OWNER 不能排程降級", async () => {
    asMock(assertTeamMember).mockResolvedValue({ role: TeamRole.EDITOR });

    await expect(change(TEAM_PLAN.FREE)).rejects.toBeDefined();
    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).not.toHaveBeenCalled();
  });
});

describe("取消排程與改計費週期要分得開（self-review 小項）", () => {
  /**
   * Info: (20260820 - Luphia) `TeamSubscription` 沒有 `billingInterval` 欄位，
   * 當期週期只存在最後一張訂單的 data 裡。原本只比方案代號，於是
   * 「排程降級中的月繳戶想改成年繳」會被當成取消降級——排程清掉了、年繳沒生效，
   * 而畫面沒有任何訊息（靜默的 no-op）。
   */
  it("同方案同週期 → 只取消排程，不建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.FREE, autoRenew: false }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamSubscriptionRepo.cancelPendingPlanChange),
    ).toHaveBeenCalledWith("team-1");
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result.pendingPlanId).toBeNull();
  });

  it("同方案但改成年繳 → 取消排程**並**建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.FREE, autoRenew: false }),
    );

    await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.YEAR,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamSubscriptionRepo.cancelPendingPlanChange),
    ).toHaveBeenCalledWith("team-1");
    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
  });

  // Info: (20260820 - Luphia) 讀不到訂單時退為月繳（保守側：只會多走一次建單）
  it("查不到最後一張訂單時，同方案月繳仍視為取消排程", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.FREE, latestOrderId: null }),
    );

    await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
  });
});
