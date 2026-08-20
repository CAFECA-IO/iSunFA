import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { prisma } from "@/lib/prisma";
import { BILLING_INTERVAL, TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260820 - Luphia) 排程降級**實際寫進資料庫的欄位**。
 *
 * 上一層（service）測的是「有呼叫 schedulePlanChange」，而那擋不到這一層寫錯欄位——
 * 若這支順手把 `planId` 或 `currentPeriodEnd` 一起改了，當期權益就在期中被收回，
 * 而 service 的測試仍然全綠。承諾（退款政策 §2.1）是「當期不受影響」，
 * 所以這裡逐欄位斷言 `data` 的**完整內容**，不是只看有沒有那兩個鍵。
 *
 * 同一個理由適用於期末落地那兩支：它們必須清掉排程，否則下一期會再降一次。
 */

jest.mock("@/lib/prisma", () => {
  const teamSubscription = {
    update: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({ count: 1 })),
    upsert: jest.fn(async () => ({})),
    /**
     * Info: (20260820 - Luphia) 套用新週期前會先讀當期（展延判斷，產品決定 20260820）：
     * 當期還沒結束就把期末往後加，不從現在重算。回 null＝沒有既有訂閱（首購）。
     */
    findUnique: jest.fn(async () => null),
    /**
     * Info: (20260820 - Luphia) 重複履行同一張訂單時直接回既有列（不動任何欄位）。
     * 不 mock 會是 undefined，而那條守門一走就丟 TypeError（checklist §1.8）。
     */
    findUniqueOrThrow: jest.fn(async () => ({ teamId: "team-1" })),
  };
  /**
   * Info: (20260820 - Luphia) `$transaction` 把**同一個** client 交給 callback。
   *
   * `applyTeamSubscription` 走的是交易版本，而交易內用的是 `tx`——若這裡回一個
   * 另外的空物件，那支就會對著一個沒有 mock 的 client 呼叫，錯誤訊息會指向
   * 「upsert is not a function」，與被測的欄位內容完全無關。
   */
  const client = {
    teamSubscription,
    $transaction: jest.fn(
      async (
        fn: (tx: { teamSubscription: typeof teamSubscription }) => unknown,
      ) => fn({ teamSubscription }),
    ),
  };
  return { prisma: client };
});

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_MS = 1_760_000_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  asMock(prisma.teamSubscription.update).mockResolvedValue({});
  asMock(prisma.teamSubscription.updateMany).mockResolvedValue({ count: 1 });
  asMock(prisma.teamSubscription.upsert).mockResolvedValue({});
  asMock(prisma.teamSubscription.findUnique).mockResolvedValue(null);
  asMock(prisma.teamSubscription.findUniqueOrThrow).mockResolvedValue({
    teamId: "team-1",
  });
});

describe("schedulePlanChange", () => {
  it("只寫 pendingPlanId 與 autoRenew，當期資料一個都不動", async () => {
    await teamSubscriptionRepo.schedulePlanChange({
      teamId: "team-1",
      pendingPlanId: TEAM_PLAN.TEAM,
      autoRenew: true,
    });

    expect(asMock(prisma.teamSubscription.update)).toHaveBeenCalledWith({
      where: { teamId: "team-1" },
      // Info: (20260820 - Luphia) 完整比對：多寫任何一個欄位都會紅
      data: { pendingPlanId: TEAM_PLAN.TEAM, autoRenew: true },
    });
  });

  it("降到 free 時關閉自動續訂", async () => {
    await teamSubscriptionRepo.schedulePlanChange({
      teamId: "team-1",
      pendingPlanId: TEAM_PLAN.FREE,
      autoRenew: false,
    });

    const call = asMock(prisma.teamSubscription.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data).toEqual({
      pendingPlanId: TEAM_PLAN.FREE,
      autoRenew: false,
    });
  });
});

describe("cancelPendingPlanChange", () => {
  /**
   * Info: (20260820 - Luphia) 取消排程要**一併恢復自動續訂**。
   *
   * 只清 `pendingPlanId` 會留下「方案沒變，但期末會停掉」——那是使用者按下
   * 「取消降級」之後最不預期的結果，而且要到期末才會發現。
   */
  it("清掉排程並恢復自動續訂", async () => {
    await teamSubscriptionRepo.cancelPendingPlanChange("team-1");

    expect(asMock(prisma.teamSubscription.update)).toHaveBeenCalledWith({
      where: { teamId: "team-1" },
      data: { pendingPlanId: null, autoRenew: true },
    });
  });
});

describe("期末落地時清掉排程", () => {
  it("expireOverdue：降為 free、清排程、單價歸零", async () => {
    await teamSubscriptionRepo.expireOverdue(NOW_MS);

    const call = asMock(prisma.teamSubscription.updateMany).mock
      .calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.planId).toBe(TEAM_PLAN.FREE);
    expect(call.data.pendingPlanId).toBeNull();
    expect(call.data.unitPrice).toBe(0);
  });

  // Info: (20260820 - Luphia) 寬限期用盡的降級（續訂 worker 呼叫）同樣清排程
  it("downgradeToFree：清排程", async () => {
    await teamSubscriptionRepo.downgradeToFree("team-1", NOW_MS);

    const call = asMock(prisma.teamSubscription.upsert).mock.calls[0][0] as {
      update: Record<string, unknown>;
    };
    expect(call.update.pendingPlanId).toBeNull();
    expect(call.update.planId).toBe(TEAM_PLAN.FREE);
  });

  /**
   * Info: (20260820 - Luphia) 套用新週期（續訂／升級）也要清排程：
   * 排程已經兌現，或被升級取代。留著的話下一期會再降一次，而使用者早就改變主意了。
   */
  it("applyTeamSubscription：新週期清掉排程", async () => {
    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: "month",
      orderId: "order-1",
      nowMs: NOW_MS,
      seats: 3,
      unitPrice: 840,
    });

    const call = asMock(prisma.teamSubscription.upsert).mock.calls[0][0] as {
      update: Record<string, unknown>;
    };
    expect(call.update.pendingPlanId).toBeNull();
  });
});

/**
 * Info: (20260820 - Luphia) 付款履行改為**展延**（產品決定 20260820，self-review B-5）。
 *
 * 原本一律 `now → now + 週期`，而 `upsert` 讓第二次付款覆寫第一次：第 20 天再買
 * 一期，期末變成「今天 +30 天」，**前 10 天付過的錢消失**；雙擊付兩次則是兩筆
 * 扣款、一期權益。而退款政策原則不退，那些天數沒有補救路徑。
 */
describe("套用訂閱：當期未結束時展延", () => {
  const PERIOD_START = new Date(NOW_MS - 20 * 86_400_000);
  const PERIOD_END = new Date(NOW_MS + 10 * 86_400_000);

  function upsertArg() {
    return asMock(prisma.teamSubscription.upsert).mock.calls[0][0] as {
      update: { currentPeriodStart?: Date; currentPeriodEnd?: Date };
      create: { currentPeriodStart: Date; currentPeriodEnd: Date };
    };
  }

  it("當期還有 10 天：期末往後加一期，期初不動", async () => {
    asMock(prisma.teamSubscription.findUnique).mockResolvedValue({
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
    });

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.MONTH,
      orderId: "order-1",
      nowMs: NOW_MS,
    });

    const arg = upsertArg();
    // Info: (20260820 - Luphia) 10 天剩餘 + 30 天 = 從現在起算 40 天
    expect(arg.update.currentPeriodEnd?.getTime()).toBe(
      PERIOD_END.getTime() + 30 * 86_400_000,
    );
    /**
     * Info: (20260820 - Luphia) 期初不動：期中加席次的比例計價讀
     * `periodStart`/`periodEnd`，把期初改成今天會讓分母縮水，
     * 於是同一天加人要付更多。展延只該讓分母變大。
     */
    expect(arg.update.currentPeriodStart?.getTime()).toBe(
      PERIOD_START.getTime(),
    );
  });

  it("當期已結束（續訂）：從現在起算一期", async () => {
    asMock(prisma.teamSubscription.findUnique).mockResolvedValue({
      currentPeriodStart: new Date(NOW_MS - 40 * 86_400_000),
      currentPeriodEnd: new Date(NOW_MS - 86_400_000),
    });

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.MONTH,
      orderId: "order-1",
      nowMs: NOW_MS,
    });

    const arg = upsertArg();
    expect(arg.update.currentPeriodStart?.getTime()).toBe(NOW_MS);
    expect(arg.update.currentPeriodEnd?.getTime()).toBe(
      NOW_MS + 30 * 86_400_000,
    );
  });

  it("首次訂閱（沒有既有列）：從現在起算一期", async () => {
    asMock(prisma.teamSubscription.findUnique).mockResolvedValue(null);

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.YEAR,
      orderId: "order-1",
      nowMs: NOW_MS,
    });

    const arg = upsertArg();
    expect(arg.create.currentPeriodStart.getTime()).toBe(NOW_MS);
    expect(arg.create.currentPeriodEnd.getTime()).toBe(
      NOW_MS + 365 * 86_400_000,
    );
  });

  // Info: (20260820 - Luphia) 年繳的展延也是加 365 天，不是換算成月
  it("年繳展延：期末加 365 天", async () => {
    asMock(prisma.teamSubscription.findUnique).mockResolvedValue({
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
    });

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: "team-1",
      planId: TEAM_PLAN.BUSINESS,
      billingInterval: BILLING_INTERVAL.YEAR,
      orderId: "order-1",
      nowMs: NOW_MS,
    });

    expect(upsertArg().update.currentPeriodEnd?.getTime()).toBe(
      PERIOD_END.getTime() + 365 * 86_400_000,
    );
  });
});

/**
 * Info: (20260820 - Luphia) 同一張訂單只履行一次（self-review 第三輪）。
 *
 * 展延之前重複履行是無害的（兩次都算成 `now → now + 週期`），改成展延之後
 * 同一件事變成「多送一期」。上游目前擋得住（webhook 的 PENDING 閘、checkout
 * 的狀態檢查、續訂的冪等鍵），這一層是最後一道。
 */
describe("重複履行同一張訂單", () => {
  it("latestOrderId 相同 → 不再展延，直接回既有列", async () => {
    asMock(prisma.teamSubscription.findUnique).mockResolvedValue({
      currentPeriodStart: new Date(NOW_MS - 86_400_000),
      currentPeriodEnd: new Date(NOW_MS + 86_400_000),
      latestOrderId: "order-1",
    });
    asMock(prisma.teamSubscription.findUniqueOrThrow).mockResolvedValue({
      teamId: "team-1",
    });

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.MONTH,
      orderId: "order-1",
      nowMs: NOW_MS,
    });

    expect(asMock(prisma.teamSubscription.upsert)).not.toHaveBeenCalled();
  });

  // Info: (20260820 - Luphia) 另一半：不同訂單就是「再買一期」，必須照常展延
  it("不同訂單 → 照常展延", async () => {
    asMock(prisma.teamSubscription.findUnique).mockResolvedValue({
      currentPeriodStart: new Date(NOW_MS - 86_400_000),
      currentPeriodEnd: new Date(NOW_MS + 86_400_000),
      latestOrderId: "order-old",
    });

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: "team-1",
      planId: TEAM_PLAN.TEAM,
      billingInterval: BILLING_INTERVAL.MONTH,
      orderId: "order-new",
      nowMs: NOW_MS,
    });

    expect(asMock(prisma.teamSubscription.upsert)).toHaveBeenCalledTimes(1);
  });
});
