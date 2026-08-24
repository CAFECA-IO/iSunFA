import { describe, it, expect, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  changeTeamSubscription,
  SUBSCRIPTION_CHANGE_KIND,
} from "@/services/team_subscription.service";
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
import {
  LEAVING_PLAN,
  resolveLeavingPlan,
} from "@/lib/subscription/plan_rules";
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
    // Info: (20260821 - Luphia) 「不再付錢」與「收回」各自一支（裁定 20260821）
    cancelAutoRenew: jest.fn(async () => undefined),
    resumeSubscription: jest.fn(async () => undefined),
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
    // Info: (20260820 - Luphia) 同方案同週期的未付訂單（沿用而不是再建一張）
    findInFlightSubscriptionOrder: jest.fn(async () => null),
    // Info: (20260820 - Luphia) 金額已過期的舊單要被取消，否則它仍是可付的
    cancelOrder: jest.fn(async () => undefined),
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
    /**
     * Info: (20260821 - Luphia) 換方案的路徑會讀這一欄（折抵要用舊日單價），
     * 缺了它會被建單前的守門擋下（`TW_SEAT_BILLING_INTERVAL_MISSING`）。
     */
    billingInterval: BILLING_INTERVAL.MONTH,
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
  asMock(teamSubscriptionRepo.cancelAutoRenew).mockResolvedValue(undefined);
  asMock(teamSubscriptionRepo.resumeSubscription).mockResolvedValue(undefined);
  asMock(generatePaymentOrder).mockResolvedValue({
    orderId: "order-1",
    challenge: "c",
    cost: 2520,
  });
  asMock(paymentRepo.getOrderById).mockResolvedValue({
    id: "order-0",
    data: { billingInterval: BILLING_INTERVAL.MONTH },
  });
  asMock(paymentRepo.findInFlightSubscriptionOrder).mockResolvedValue(null);
  asMock(paymentRepo.cancelOrder).mockResolvedValue(undefined);
});

describe("降級：排程到當期屆滿", () => {
  it("企業版 → 團隊版：只排程，不建單、不扣款、不動當期方案", async () => {
    const result = await change(TEAM_PLAN.TEAM);

    /**
     * Info: (20260821 - Luphia) 降到較低的**付費**方案才排程（裁定 20260821）：
     * 那是「下一期改付較少」，期末要用新方案計價續訂，因此維持自動續訂。
     * `autoRenew` 已不是參數（那一支現在只服務降轉）。
     */
    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).toHaveBeenCalledWith({
      teamId: "team-1",
      pendingPlanId: TEAM_PLAN.TEAM,
    });
    expect(asMock(teamSubscriptionRepo.cancelAutoRenew)).not.toHaveBeenCalled();
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(asMock(teamSubscriptionRepo.downgradeToFree)).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
      // Info: (20260820 - Luphia) 回**當期**方案：權益沒有變，畫面不該顯示新方案
      planId: TEAM_PLAN.BUSINESS,
      pendingPlanId: TEAM_PLAN.TEAM,
      // Info: (20260821 - Luphia) 降轉仍會續訂，只是下一期換方案
      autoRenew: true,
      effectiveAt: Math.floor(PERIOD_END_MS / 1000),
    });
  });

  /**
   * Info: (20260820 - Luphia) 這一條就是修正的核心：改為免費版**不再**當場降級。
   *
   * `downgradeToFree` 會把 `planId` 改成 free 並歸零單價——那支仍然存在
   *（寬限期用盡時由續訂 worker 呼叫），但**使用者主動降級不得走它**。
   *
   * Info: (20260821 - Luphia) 而它也**不再排程**（產品裁定 20260821：
   * 降級是時間到不付錢的自然結果）：只關自動續訂，期末由 `expireOverdue`
   * 落地為 free。回應不回 `pendingPlanId: free`——DB 裡不存那個值，
   * 回它會讓 `PUT` 與 `GET /subscription` 對同一件事給出兩個答案。
   */
  it("付費 → 免費版：只關閉自動續訂，不排程也不呼叫 downgradeToFree", async () => {
    const result = await change(TEAM_PLAN.FREE);

    expect(asMock(teamSubscriptionRepo.cancelAutoRenew)).toHaveBeenCalledWith(
      "team-1",
    );
    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).not.toHaveBeenCalled();
    expect(asMock(teamSubscriptionRepo.downgradeToFree)).not.toHaveBeenCalled();
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
        planId: TEAM_PLAN.BUSINESS,
        pendingPlanId: null,
        // Info: (20260821 - Luphia) 畫面靠這一欄說「期末到期後轉為免費版」
        autoRenew: false,
      }),
    );
  });

  // Info: (20260820 - Luphia) 生效時點就是當期屆滿，不是「三十天後」之類的另算
  it("生效時點等於當期屆滿", async () => {
    const result = await change(TEAM_PLAN.FREE);

    expect(result).toEqual(
      expect.objectContaining({
        effectiveAt: Math.floor(PERIOD_END_MS / 1000),
      }),
    );
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
      asMock(teamSubscriptionRepo.resumeSubscription),
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
  it("排程中又選回當期方案（不帶付款方式）：取消排程，不建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.FREE, autoRenew: false }),
    );

    /**
     * Info: (20260820 - Luphia) 取消排程是**不帶付款方式**的呼叫（新契約）：
     * 帶了就是「我要買」，會取消排程並建單（延長）。
     */
    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamSubscriptionRepo.resumeSubscription),
    ).toHaveBeenCalledWith("team-1");
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
      planId: TEAM_PLAN.BUSINESS,
      pendingPlanId: null,
      // Info: (20260821 - Luphia) 收回＝恢復自動續訂，期末照原方案續訂
      autoRenew: true,
      effectiveAt: Math.floor(NOW_MS / 1000),
    });
  });

  /**
   * Info: (20260821 - Luphia) **已關閉自動續訂（沒有排程）時也要收得回來**
   *（四輪 self-review 的變異驗證發現這條沒有守門）。
   *
   * 「降到免費版」改成只關 `autoRenew` 之後，那種狀態的 `pendingPlanId` 是 null——
   * 收回分支若只認 `pendingPlanId`，使用者按了「不再付錢」就再也回不來：
   * 服務條款 §3.6 承諾的「生效前可隨時改回原方案」對這種狀態不成立，
   * 而唯一的替代路徑是再付一期（剩餘超過 30 天時連那條都被閘門擋住）。
   */
  it("已關閉自動續訂（無排程）時選回當期方案：恢復續訂，不建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: null, autoRenew: false }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamSubscriptionRepo.resumeSubscription),
    ).toHaveBeenCalledWith("team-1");
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
        pendingPlanId: null,
        autoRenew: true,
      }),
    );
  });

  /**
   * Info: (20260820 - Luphia) 排程中改成更低的方案：仍然不收費。
   *
   * Info: (20260821 - Luphia) 改成 free 之後走的是**關閉自動續訂**（裁定 20260821），
   * 而舊的降轉排程必須一併清掉——留著它，期末的續訂 cron 會讀到
   * `pendingPlanId` 而**照那個方案繼續扣款**，等於使用者按了「不再付錢」
   * 卻仍然被收費。這一條就是釘住那件事。
   */
  it("排程降轉中又改成免費版：關閉續訂並清掉舊排程", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.TEAM }),
    );

    await change(TEAM_PLAN.FREE);

    expect(asMock(teamSubscriptionRepo.cancelAutoRenew)).toHaveBeenCalledWith(
      "team-1",
    );
    expect(
      asMock(teamSubscriptionRepo.schedulePlanChange),
    ).not.toHaveBeenCalled();
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
  /**
   * Info: (20260820 - Luphia) 「取消降級」與「延長期間」用**有沒有帶付款方式**分辨：
   * 兩者的方案與週期完全一樣（都是當期的）。不帶＝單純取消排程。
   */
  it("同方案同週期且不帶付款方式 → 只取消排程，不建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.FREE, autoRenew: false }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamSubscriptionRepo.resumeSubscription),
    ).toHaveBeenCalledWith("team-1");
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
        pendingPlanId: null,
      }),
    );
  });

  /**
   * Info: (20260821 - Luphia) 購買路徑**不就地取消排程**（review #6687 二輪
   * 阻擋-3）：那筆訂單可能沒付掉（關掉付款畫面、卡被拒），先取消等於排程
   * 消失、autoRenew 被重開而沒有任何補償。排程由履行在付款成功時清掉
   * （`applyTeamSubscriptionInTx` 的 `pendingPlanId: null`），與升級同一條規則。
   */
  it("同方案但改成年繳 → 建單，排程留給履行清", async () => {
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
      asMock(teamSubscriptionRepo.resumeSubscription),
    ).not.toHaveBeenCalled();
    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
  });

  // Info: (20260820 - Luphia) 讀不到訂單時退為月繳（保守側：只會多走一次建單）
  it("查不到最後一張訂單時，同方案月繳且不帶付款方式仍視為取消排程", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ pendingPlanId: TEAM_PLAN.FREE, latestOrderId: null }),
    );

    await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      nowMs: NOW_MS,
    });

    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260820 - Luphia) 帶付款方式＝「我要買」：建單（延長）。
   *
   * 這條擋的是一條**壞掉的流程**，不只是少一句提示：方案卡改為可按之後，
   * 「延長方案」送進來的方案與週期就是當期的，先前會走進取消分支並回
   * `orderId: null`，而付款畫面拿著 null 繼續往下走。
   *
   * Info: (20260821 - Luphia) 建單**不就地取消排程**（review #6687 二輪阻擋-3）：
   * 訂單沒付掉時排程必須還在。排程由履行清；回應以 `supersedesPendingPlanId`
   * 揭露「本次購買完成後，該降級將取消」——現在式，與文案一致。
   */
  it("同方案同週期但帶付款方式 → 建單且排程原封不動（延長）", async () => {
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
      asMock(teamSubscriptionRepo.resumeSubscription),
    ).not.toHaveBeenCalled();
    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        kind: SUBSCRIPTION_CHANGE_KIND.ORDER,
        orderId: "order-1",
        supersedesPendingPlanId: TEAM_PLAN.FREE,
      }),
    );
  });

  /**
   * Info: (20260820 - Luphia) 升級時排程還沒被清掉（那是履行時的事），
   * 因此回應要說「這筆付款會取代哪一個排程」——現在式，不是「已取消」。
   */
  it("升級時回報這次購買會取代的排程", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.TEAM,
        unitPrice: 840,
        pendingPlanId: TEAM_PLAN.FREE,
      }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(result).toEqual(
      expect.objectContaining({ supersedesPendingPlanId: TEAM_PLAN.FREE }),
    );
  });

  it("沒有排程時不回報取代", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ planId: TEAM_PLAN.TEAM, unitPrice: 840 }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(result).toEqual(
      expect.objectContaining({ supersedesPendingPlanId: null }),
    );
  });
});

/**
 * Info: (20260820 - Luphia) 重複點擊不得變成兩張可付的單（self-review B-4）。
 *
 * 訂閱建單原本沒有任何冪等保護。兩張單就是兩筆扣款，而在「展延」之前那兩筆
 * 還只換到一期權益。
 */
describe("未付訂單沿用，不再建第二張", () => {
  it("同方案同週期已有未付訂單 → 回同一張，不建新單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ planId: TEAM_PLAN.TEAM, unitPrice: 840 }),
    );
    /**
     * Info: (20260820 - Luphia) 金額要與**現在**算出來的一致才會沿用
     *（self-review 第二輪，小）：3 席 × 企業版月費 2,940 = 8,820。
     * 不一致代表席次變動過，那張單會被取消並改建新單。
     */
    asMock(paymentRepo.findInFlightSubscriptionOrder).mockResolvedValue({
      id: "order-inflight",
      challenge: "challenge-inflight",
      amount: BigInt(8820),
    });

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        orderId: "order-inflight",
        challenge: "challenge-inflight",
        cost: 8820,
      }),
    );
  });

  /**
   * Info: (20260820 - Luphia) 金額已變（席次變動）→ 不沿用、取消舊單、建新單。
   *
   * 不取消的話那張舊單仍是可付的：從另一個分頁或訂單列表付掉就以舊金額成交。
   */
  it("金額已不同 → 取消舊單並建新單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ planId: TEAM_PLAN.TEAM, unitPrice: 840 }),
    );
    asMock(paymentRepo.findInFlightSubscriptionOrder).mockResolvedValue({
      id: "order-stale",
      challenge: "challenge-stale",
      amount: BigInt(2940),
    });

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(asMock(paymentRepo.cancelOrder)).toHaveBeenCalledWith(
      "order-stale",
      expect.stringContaining("superseded"),
    );
    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ orderId: "order-1" }));
  });

  // Info: (20260820 - Luphia) 沒有未付訂單就照常建單（否則「一律沿用」也會通過上面那條）
  it("沒有未付訂單時照常建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ planId: TEAM_PLAN.TEAM, unitPrice: 840 }),
    );
    asMock(paymentRepo.findInFlightSubscriptionOrder).mockResolvedValue(null);
    asMock(paymentRepo.cancelOrder).mockResolvedValue(undefined);

    await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(asMock(generatePaymentOrder)).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260820 - Luphia) 查詢條件必須帶方案與週期：只帶 teamId 的話，
   * 「月繳團隊版的未付單」會讓「年繳企業版」也被沿用——付到錯的東西。
   */
  it("查詢帶上團隊、方案與計費週期", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({ planId: TEAM_PLAN.TEAM, unitPrice: 840 }),
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
      asMock(paymentRepo.findInFlightSubscriptionOrder),
    ).toHaveBeenCalledWith({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.YEAR,
    });
  });
});

describe("展延閘門：同方案延長限剩餘 30 天內（升級不受限）", () => {
  /**
   * Info: (20260821 - Luphia) 展延語意（新期疊在舊期末之後、planId 立即換新）
   * 對「換方案」是一個漏洞：年繳團隊版第 1 天買月繳企業版 → 剩餘 364 天全部
   * 免費升級再加一個月，約四折。閘門把免費升級的剩餘天數壓到最多 30 天。
   */
  it("同方案剩餘 31 天 → 拒絕延長，不建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.BUSINESS,
        currentPeriodEnd: new Date(NOW_MS + 31 * 86_400_000),
      }),
    );

    await expect(
      changeTeamSubscription({
        userId: "user-1",
        teamId: "team-1",
        planId: TEAM_PLAN.BUSINESS,
        billingInterval: BILLING_INTERVAL.MONTH,
        paymentMethodId: "pm-1",
        nowMs: NOW_MS,
      }),
    ).rejects.toMatchObject({ code: "TW000028" });
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
  });

  it("同方案剩餘恰好 30 天 → 放行建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.BUSINESS,
        currentPeriodEnd: new Date(NOW_MS + 30 * 86_400_000),
      }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(result).toEqual(
      expect.objectContaining({ kind: SUBSCRIPTION_CHANGE_KIND.ORDER }),
    );
  });

  /**
   * Info: (20260821 - Luphia) **升級不受閘門限制**（產品裁定 20260821，
   * review #6687 三輪）。閘門原本兩者都擋，副作用是年繳戶在前 335 天完全
   * 不能升級——而升級是客戶主動要多付錢的操作。換方案的公平性由履行端的
   * 折抵處理（`resolveNextPeriod`），不需要時間閘門。
   */
  it("升級不受閘門限制：年繳剩 364 天仍可升級", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.TEAM,
        unitPrice: 8400,
        billingInterval: BILLING_INTERVAL.YEAR,
        currentPeriodStart: new Date(NOW_MS - 86_400_000),
        currentPeriodEnd: new Date(NOW_MS + 364 * 86_400_000),
      }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.YEAR,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(result).toEqual(
      expect.objectContaining({ kind: SUBSCRIPTION_CHANGE_KIND.ORDER }),
    );
  });

  /**
   * Info: (20260821 - Luphia) 換方案但舊列的週期尚未回填 → 在**建單前**擋下
   *（review #6687 三輪）。履行端的退路是「剩餘期間 1:1 沿用」，那對使用者
   * 不會更差、但平台白送一段高階服務；錢還沒收就擋下是第三條路。
   */
  it("換方案時週期未回填 → 建單前擋下", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.TEAM,
        unitPrice: 840,
        billingInterval: null,
      }),
    );

    await expect(
      changeTeamSubscription({
        userId: "user-1",
        teamId: "team-1",
        planId: TEAM_PLAN.BUSINESS,
        billingInterval: BILLING_INTERVAL.MONTH,
        paymentMethodId: "pm-1",
        nowMs: NOW_MS,
      }),
    ).rejects.toMatchObject({ code: "TW000029" });
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
  });

  // Info: (20260821 - Luphia) 同方案延長不讀舊週期（不折抵），NULL 不該擋下
  it("同方案延長時週期未回填 → 照常建單", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.BUSINESS,
        billingInterval: null,
        currentPeriodEnd: new Date(NOW_MS + 10 * 86_400_000),
      }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(result).toEqual(
      expect.objectContaining({ kind: SUBSCRIPTION_CHANGE_KIND.ORDER }),
    );
  });

  /**
   * Info: (20260821 - Luphia) 閘門用**折算後**的有效方案判斷：過期或 PAST_DUE
   * 是重新訂閱，不是展延——不受閘門影響（否則過期戶永遠買不回來）。
   */
  it("已過期的訂閱不受閘門影響（重新訂閱）", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.TEAM,
        currentPeriodEnd: new Date(NOW_MS - 1000),
      }),
    );

    const result = await changeTeamSubscription({
      userId: "user-1",
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.MONTH,
      paymentMethodId: "pm-1",
      nowMs: NOW_MS,
    });

    expect(result).toEqual(
      expect.objectContaining({ kind: SUBSCRIPTION_CHANGE_KIND.ORDER }),
    );
  });
});

describe("寬限期（PAST_DUE）按降級為免費版（review #6687 二輪高-2）", () => {
  /**
   * Info: (20260821 - Luphia) 原本這條路徑用折算後的 free 判斷，於是「什麼都
   * 沒做」卻回報成功，而 `listPastDueAutoRenew` 的三個條件全都還成立——
   * 使用者按了降級，續訂 worker 下一小時照樣拿他的卡扣款。
   * 產品裁定 20260821：寬限期的降級**立即生效**（那時本來就沒有付費權益）。
   */
  it("寬限期選 free → 立即 downgradeToFree（autoRenew 隨之關閉）", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.TEAM,
        status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
        currentPeriodEnd: new Date(NOW_MS - 86_400_000),
      }),
    );

    const result = await change(TEAM_PLAN.FREE);

    expect(asMock(teamSubscriptionRepo.downgradeToFree)).toHaveBeenCalledWith(
      "team-1",
      NOW_MS,
    );
    expect(result).toEqual(
      expect.objectContaining({
        kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
        planId: TEAM_PLAN.FREE,
      }),
    );
  });

  /**
   * Info: (20260821 - Luphia) 同成因的變化型：寬限期內已有排程時再送 free，
   * 原本會撞上「取消排程」分支——他按的是「降級」，效果卻是重新打開自動續訂。
   */
  it("寬限期已有排程時選 free → 仍是降級，不是取消排程", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.TEAM,
        status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
        currentPeriodEnd: new Date(NOW_MS - 86_400_000),
        pendingPlanId: TEAM_PLAN.FREE,
      }),
    );

    await change(TEAM_PLAN.FREE);

    expect(
      asMock(teamSubscriptionRepo.resumeSubscription),
    ).not.toHaveBeenCalled();
    expect(asMock(teamSubscriptionRepo.downgradeToFree)).toHaveBeenCalled();
  });

  // Info: (20260821 - Luphia) DB 也是 free 時維持原狀：真的沒有東西要做
  it("本來就是 free → 不動 DB", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      subscriptionRow({
        planId: TEAM_PLAN.FREE,
        currentPeriodEnd: new Date(NOW_MS - 86_400_000),
      }),
    );

    await change(TEAM_PLAN.FREE);

    expect(asMock(teamSubscriptionRepo.downgradeToFree)).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260821 - Luphia) 「維持目前方案」在 UI 上走得到（四輪 self-review）。
 *
 * 這一組守的是一件掃描才擋得住的事：server 端用「有沒有帶 `paymentMethodId`」
 * 分辨「維持目前方案」與「我要買」，而在此之前**全站唯一的 PUT 呼叫點**在購買
 * 流程裡、參數必填——於是服務條款 §3.6 承諾的「生效前可隨時改回原方案」
 * 一次都走不到，使用者只能再付一期來取消（剩餘超過 30 天時連那條路都被閘門擋住）。
 *
 * 單元測試看不到這件事：service 的取消分支自己是綠的。只有掃前端原始碼
 * 才問得出「有沒有一個不帶付款方式的呼叫點」。
 */
describe("維持目前方案的入口（前端接線）", () => {
  const panel = readFileSync(
    join(process.cwd(), "src", "components", "team", "team_wallet_panel.tsx"),
    "utf8",
  );

  it("錢包面板送出不帶 paymentMethodId 的 PUT", () => {
    const start = panel.indexOf("const resumeSubscription");
    expect(start).toBeGreaterThan(-1);
    const scope = panel.slice(start, start + 1200);

    expect(scope).toContain('method: "PUT"');
    expect(scope).toContain("subscription");
    // Info: (20260821 - Luphia) 帶了付款方式就會變成「我要買」——那是另一條路
    expect(scope).not.toContain("paymentMethodId");
  });

  /**
   * Info: (20260821 - Luphia) 兩種「將要離開目前方案」的狀態都要看得見，
   * 否則使用者按過之後唯一的回饋是「什麼都沒變」，於是他會再按一次
   * ——而那一次會被當成購買（建單、收整期的錢）。
   *
   * Info: (20260824 - Luphia) **判斷本身改由 `resolveLeavingPlan` 逐條測**
   *（見下一個 describe，review #6687 四輪高-1）。這裡只確認面板接上了那支
   * 函式與兩句文案——先前這條斷言的是「`!subscription.autoRenew` 這個字串
   * 在檔案裡」，而**那個字串本身就是缺陷**：免費團隊的 `autoRenew` 是
   * `?? false` 的預設值，於是每個沒訂閱過的團隊都被說成「將轉為免費版」。
   * 掃描測試對那種缺陷永遠是綠的——它能回答的問題就只到「有沒有接線」。
   */
  it("面板用 resolveLeavingPlan 判斷，並備妥兩句文案", () => {
    expect(panel).toContain("resolveLeavingPlan(subscription)");
    expect(panel).toContain("LEAVING_PLAN.DOWNGRADE");
    expect(panel).toContain("wallet.pending_downgrade");
    expect(panel).toContain("wallet.pending_expire");
    // Info: (20260824 - Luphia) 不准再回到「自己看兩個欄位」那條路
    expect(panel).not.toContain("!subscription.autoRenew");
  });

  // Info: (20260821 - Luphia) 變更訂閱狀態是 OWNER 專屬（server 端同判準），ADMIN 按了只會拿到 403
  it("按鈕只給 OWNER", () => {
    const start = panel.indexOf("wallet.keep_current_plan");
    expect(start).toBeGreaterThan(-1);
    expect(panel.slice(Math.max(0, start - 800), start)).toContain("isOwner");
  });

  it("五個語言檔都有面板那三句文案", () => {
    for (const locale of ["zh_tw", "en", "zh_cn", "ja", "ko"]) {
      const file = readFileSync(
        join(
          process.cwd(),
          "src",
          "i18n",
          "locales",
          locale,
          "team_management.ts",
        ),
        "utf8",
      );
      for (const key of [
        "pending_downgrade:",
        "pending_expire:",
        "keep_current_plan:",
      ]) {
        expect(file).toContain(key);
      }
    }
  });
});

/**
 * Info: (20260824 - Luphia) 「將要離開目前付費狀態」的判斷（review #6687 四輪高-1）。
 *
 * 這一組是那條掃描測試學到的教訓：判斷留在 JSX 裡時，唯一擋得住它的東西是
 * 「字串在不在檔案裡」，而錯的答案本身就是那個字串。搬進純函式之後，
 * 免費團隊那個案例是一條會紅的斷言。
 *
 * 缺陷的實際形狀：`GET /subscription` 對**沒有訂閱列**的團隊回
 * `autoRenew: false`（沒有訂閱就談不上自動續訂——那是對的預設）與
 * `currentPeriodEnd: 0`。畫面若只看 `!autoRenew`，每個從未訂閱過的團隊都會
 * 看到「當期到 1970/1/1 後轉為免費版」，而旁邊那顆「維持目前方案」按下去
 * 什麼都不會發生（server 對免費列不寫任何資料）——死路的按鈕比沒有按鈕更糟。
 */
describe("將要離開目前付費狀態的判斷", () => {
  it("沒有訂閱過的團隊（free + autoRenew false）→ 什麼都不說", () => {
    expect(
      resolveLeavingPlan({
        planId: TEAM_PLAN.FREE,
        pendingPlanId: null,
        autoRenew: false,
      }),
    ).toBeNull();
  });

  /**
   * Info: (20260824 - Luphia) 同一個成因的第二種：曾經降級到免費版的列
   *（`downgradeToFree` 寫 `autoRenew: false`，而 `currentPeriodEnd` 留著舊值）
   * 會顯示一個**過去的日期**——「當期到 2026/7/3 後轉為免費版」，
   * 而它三週前就已經是免費版了。
   */
  it("已經降級成免費版的列 → 什麼都不說（不會顯示過去的日期）", () => {
    expect(
      resolveLeavingPlan({
        planId: TEAM_PLAN.FREE,
        pendingPlanId: null,
        autoRenew: false,
      }),
    ).toBeNull();
  });

  it("付費且已關閉自動續訂 → 期末轉免費版", () => {
    expect(
      resolveLeavingPlan({
        planId: TEAM_PLAN.TEAM,
        pendingPlanId: null,
        autoRenew: false,
      }),
    ).toBe(LEAVING_PLAN.EXPIRE);
  });

  it("付費且已排定期末降轉 → 降轉（優先於續訂狀態）", () => {
    expect(
      resolveLeavingPlan({
        planId: TEAM_PLAN.BUSINESS,
        pendingPlanId: TEAM_PLAN.TEAM,
        autoRenew: true,
      }),
    ).toBe(LEAVING_PLAN.DOWNGRADE);
  });

  it("付費、續訂中、沒有排程 → 什麼都不說", () => {
    expect(
      resolveLeavingPlan({
        planId: TEAM_PLAN.TEAM,
        pendingPlanId: null,
        autoRenew: true,
      }),
    ).toBeNull();
  });

  // Info: (20260824 - Luphia) 認不出來的方案代號當免費版處理：寧可不說，也不要說錯
  it("方案代號認不出來 → 什麼都不說", () => {
    expect(
      resolveLeavingPlan({
        planId: "enterprise_x",
        pendingPlanId: null,
        autoRenew: false,
      }),
    ).toBeNull();
  });
});

/**
 * Info: (20260824 - Luphia) 「買一期會把關掉的自動續訂重新打開」要在付款前說
 *（review #6687 四輪中-1）。
 *
 * 履行（`applyTeamSubscriptionInTx`）一律寫 `autoRenew: true` 並清
 * `pendingPlanId`。狀態機收斂之前，「期末轉免費版」是 `pendingPlanId = 'free'`，
 * 所以它會觸發「本次購買完成後，該降級將取消」那句；收斂之後那個狀態改由
 * `autoRenew = false` 表達，而那句揭露只看 `pendingPlanId`——於是降轉還會說，
 * 期末轉免費版不再說。兩種在產品上是同一件事。
 */
describe("購買會取代什麼：兩種狀態都要揭露", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_purchase_target.tsx"),
    "utf8",
  );
  const selector = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "pricing",
      "purchase_target_selector.tsx",
    ),
    "utf8",
  );

  it("hook 把「已關閉自動續訂」也算進要揭露的狀態", () => {
    expect(hook).toContain("willResumeAutoRenew");
    expect(hook).toContain("response.payload?.autoRenew === false");
    /**
     * Info: (20260824 - Luphia) 且必須先過「當期還在、當期是付費方案」那道守門
     * ——免費團隊的 autoRenew 是預設值 false，不是使用者關掉的（高-1 同一個坑）。
     */
    expect(hook).toContain("note !== null && response.payload?.autoRenew");
  });

  it("selector 對兩種狀態各說一句", () => {
    expect(selector).toContain("purchase_target.pending_downgrade_note");
    expect(selector).toContain("purchase_target.resume_autorenew_note");
  });

  it("五個語言檔都有恢復自動續訂那句", () => {
    for (const locale of ["zh_tw", "en", "zh_cn", "ja", "ko"]) {
      const file = readFileSync(
        join(
          process.cwd(),
          "src",
          "i18n",
          "locales",
          locale,
          "purchase_target.ts",
        ),
        "utf8",
      );
      expect(file).toContain("resume_autorenew_note:");
      // Info: (20260824 - Luphia) 純 <p> 渲染不了 markdown（我第三次寫回去了）
      expect(file).not.toContain("**");
    }
  });

  // Info: (20260824 - Luphia) 低-1：維持目前方案要帶回真的週期，不能寫死月繳
  it("面板的維持目前方案帶真實的計費週期", () => {
    const walletPanel = readFileSync(
      join(process.cwd(), "src", "components", "team", "team_wallet_panel.tsx"),
      "utf8",
    );

    expect(walletPanel).toContain(
      "billingInterval: subscription.billingInterval",
    );
    expect(walletPanel).not.toContain('billingInterval: "month"');
  });
});
