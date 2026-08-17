import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { chargeSeatAddition } from "@/services/team_seat.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { generatePaymentOrder } from "@/services/order.service";
import { chargeOrderWithSavedCard } from "@/services/team_billing.service";
import { teamRepo } from "@/repositories/team.repo";
import { resolveFreePlanMaxMembers } from "@/services/team_subscription.service";
import { ORDER_TYPE } from "@/constants/status";
import {
  DEFAULT_FREE_PLAN_MAX_MEMBERS,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260814 - Luphia) 期中加人的席次補收（規範 §4、P3）。
 *
 * 這支服務會**動用戶的信用卡**，所以每條分支都要釘死：免費團隊不能被扣款、
 * 沒有卡時不能默默放人進來、扣款失敗必須 fail-closed（丟錯，讓呼叫端不要建立邀請）。
 */

jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: {
    getByTeamId: jest.fn(),
    addSeats: jest.fn(),
  },
}));

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    getOrderById: jest.fn(),
    getPaymentMethodById: jest.fn(),
    updateOrderCompleted: jest.fn(),
    // Info: (20260814 - Luphia) 單期補收上限與冪等（PR #6652 第二輪 B-2 / B-3）
    sumSeatAdditionAmount: jest.fn(async () => BigInt(0)),
    findOrderByIdempotencyKey: jest.fn(async () => null),
  },
}));

/**
 * Info: (20260814 - Luphia) 免費版人數上限需要團隊人數與設定值（PR #6652 第二輪 B-4）。
 * 不 mock 的話這兩個呼叫會打到真資料庫——測試會因為「本機剛好有 DB 且查無資料」而通過。
 */
jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    countMembers: jest.fn(async () => 2),
    // Info: (20260815 - Luphia) 席次佔用＝成員 + 未失效的 PENDING 邀請（產品拍板 20260815）
    countPendingInvitations: jest.fn(async () => 0),
  },
}));
jest.mock("@/services/team_subscription.service", () => ({
  resolveEffectivePlanId: jest.requireActual<
    typeof import("@/services/spend.service")
  >("@/services/spend.service").resolveEffectivePlanId,
  resolveFreePlanMaxMembers: jest.fn(async () => 5),
}));
jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: { findUserById: jest.fn(async () => ({ name: "Owner" })) },
}));

jest.mock("@/services/order.service", () => ({
  generatePaymentOrder: jest.fn(async () => ({
    orderId: "order-seat-1",
    challenge: "c",
    cost: 0,
  })),
}));

jest.mock("@/services/team_billing.service", () => ({
  chargeOrderWithSavedCard: jest.fn(async () => ({ ok: true })),
}));

function asMock(fn: unknown) {
  return fn as ReturnType<typeof jest.fn>;
}

// Info: (20260814 - Luphia) 期間 2026-08-01 起 30 天，單價 840（團隊版月繳）
const PERIOD_START = new Date(Date.UTC(2026, 7, 1));
const PERIOD_END = new Date(Date.UTC(2026, 7, 31));
const MID_PERIOD = Date.UTC(2026, 7, 16);

const ACTIVE_SUBSCRIPTION = {
  teamId: "team-1",
  planId: TEAM_PLAN.TEAM,
  status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
  currentPeriodStart: PERIOD_START,
  currentPeriodEnd: PERIOD_END,
  seats: 3,
  unitPrice: 840,
  latestOrderId: "order-sub-1",
};

describe("chargeSeatAddition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      ACTIVE_SUBSCRIPTION,
    );
    asMock(paymentRepo.getOrderById).mockResolvedValue({
      id: "order-sub-1",
      userId: "user-owner",
      data: { paymentMethodId: "pm-1" },
    });
    asMock(paymentRepo.getPaymentMethodById).mockResolvedValue({
      id: "pm-1",
      token: "tok-1",
      data: {},
    });
    asMock(chargeOrderWithSavedCard).mockResolvedValue({ ok: true });
    asMock(paymentRepo.sumSeatAdditionAmount).mockResolvedValue(BigInt(0));
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(null);
    asMock(teamRepo.countMembers).mockResolvedValue(2);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(0);
    asMock(resolveFreePlanMaxMembers).mockResolvedValue(5);
  });

  it("charges the remaining period for the new seat and records it", async () => {
    // Info: (20260815 - Luphia) 已付 3 席、已佔滿 3 個位置 → 第 4 個人才需要補收
    asMock(teamRepo.countMembers).mockResolvedValue(3);

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
    });

    // Info: (20260814 - Luphia) 30 天期、剩 15 天：840 × 15/30 = 420
    expect(result).toMatchObject({ charged: true, amount: 420, seats: 1 });
    expect(generatePaymentOrder).toHaveBeenCalledWith(
      "user-owner",
      expect.objectContaining({
        type: ORDER_TYPE.BILLING_SEAT_ADDITION,
        amount: 420,
        teamId: "team-1",
        seats: 1,
        unitPrice: 840,
      }),
    );
    expect(teamSubscriptionRepo.addSeats).toHaveBeenCalledWith("team-1", 1);
    expect(paymentRepo.updateOrderCompleted).toHaveBeenCalledWith(
      "order-seat-1",
    );
  });

  /**
   * Info: (20260815 - Luphia) 「未成功的席次不退費，但可以再用於邀請他人」
   * （產品拍板 20260815）。
   *
   * 席次的佔用者是「成員 + 未失效的 PENDING 邀請」。邀請被拒或逾期時錢不退，
   * 但位置空出來——下一次邀請直接用它。團隊付的是「同時可以有幾個人」，
   * 不是「按了幾次邀請」。
   */
  it("reuses an already-paid seat left by a failed invitation", async () => {
    // Info: (20260815 - Luphia) 已付 3 席、2 位成員、0 個有效邀請 → 還有 1 個空位
    asMock(teamRepo.countMembers).mockResolvedValue(2);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(0);

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
    });

    expect(result).toMatchObject({ charged: false, reusedPaidSeat: true });
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
    // Info: (20260815 - Luphia) 沒有新增席次：那個位置本來就付過了
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
  });

  // Info: (20260815 - Luphia) 尚未失效的邀請仍佔著位置，超出才補收
  it("counts pending invitations as occupied seats", async () => {
    asMock(teamRepo.countMembers).mockResolvedValue(2);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(1);

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
    });

    // Info: (20260815 - Luphia) 2 + 1 已佔滿 3 席，第 4 個位置要付錢
    expect(result).toMatchObject({ charged: true, amount: 420 });
    expect(teamSubscriptionRepo.addSeats).toHaveBeenCalledWith("team-1", 1);
  });

  // Info: (20260815 - Luphia) 一次邀多人時，只為超出已付費席次的部分收費
  it("charges only for the seats beyond what the team already paid for", async () => {
    asMock(teamRepo.countMembers).mockResolvedValue(2);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(0);

    // Info: (20260815 - Luphia) 已付 3 席、佔用 2、一次加 3 人 → 只需補收 2 席
    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
      seats: 3,
    });

    expect(result.charged).toBe(true);
    // Info: (20260815 - Luphia) 840 × 15/30 × 2 席 = 840
    expect(result.amount).toBe(840);
    expect(teamSubscriptionRepo.addSeats).toHaveBeenCalledWith("team-1", 2);
  });

  it("never charges a team without a subscription", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
    });

    expect(result.charged).toBe(false);
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
  });

  // Info: (20260814 - Luphia) 免費方案的人數不影響帳單，加人不該產生任何金流
  it("never charges a free plan", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      planId: TEAM_PLAN.FREE,
      unitPrice: 0,
    });

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
    });

    expect(result.charged).toBe(false);
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 免費版沒有「席次 × 單價」的自然封頂（PR #6652 第二輪 B-4）：
   * 單價 0 乘上任何人數都是 0，而每個成員各自享有一份額度——
   * 20 人的免費團隊就是每週 800 點的模型用量、月費零。人數上限就是它的封頂。
   */
  it("blocks a free team from growing past the member cap", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      planId: TEAM_PLAN.FREE,
      unitPrice: 0,
    });
    asMock(teamRepo.countMembers).mockResolvedValue(5);

    await expect(
      chargeSeatAddition({ teamId: "team-1", nowMs: MID_PERIOD }),
    ).rejects.toMatchObject({ code: "TW000017" });
  });

  /**
   * Info: (20260818 - Luphia) 上限的佔用量要含**尚未接受的邀請**（第三輪 B-1）。
   *
   * 只數成員的話，上限可以整批繞過：只有 OWNER 一人的免費團隊連送 30 封邀請，
   * 每一次檢查都是 `1 + 1 <= 5`，全部通過；30 人接受後團隊有 31 名成員。
   * 上限剛加上就被繞過，而它防的正是「20 人的免費團隊、每週 800 點、月費零」。
   */
  /**
   * Info: (20260818 - Luphia) 免費版上限為 1，即「僅擁有者本人」（產品決定 20260818）。
   *
   * 要加第二個人就代表這是團隊在用，而團隊用量該由席次計費承擔。
   * 這個值同時決定方案頁的標示與加人時的擋門，改它等於改對外的方案定位。
   */
  it("defaults the free plan to the owner alone", () => {
    expect(DEFAULT_FREE_PLAN_MAX_MEMBERS).toBe(1);
  });

  it("counts pending invitations toward the free member cap", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      planId: TEAM_PLAN.FREE,
      unitPrice: 0,
    });
    // Info: (20260818 - Luphia) 1 位成員 + 4 封待接受 = 5，再加一位就超過上限
    asMock(teamRepo.countMembers).mockResolvedValue(1);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(4);

    await expect(
      chargeSeatAddition({ teamId: "team-1", nowMs: MID_PERIOD }),
    ).rejects.toMatchObject({ code: "TW000017" });
  });

  it("still lets a free team invite while under the cap", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      planId: TEAM_PLAN.FREE,
      unitPrice: 0,
    });
    asMock(teamRepo.countMembers).mockResolvedValue(1);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(2);

    await expect(
      chargeSeatAddition({ teamId: "team-1", nowMs: MID_PERIOD }),
    ).resolves.toMatchObject({ charged: false });
  });

  /**
   * Info: (20260814 - Luphia) 訂閱已過期（PAST_DUE / 期末已過）時視同免費方案：
   * 這一期已經沒有在收費，補收沒有依據。
   */
  it("never charges an expired subscription", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
    });

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
    });

    expect(result.charged).toBe(false);
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 期末零頭捨去為 0：席次照加，但不為了 0 元去打金流。
   *
   * 用「距期末 30 分鐘」而非期末當下：後者走的是 `remainingMs <= 0` 那條分支，
   * 測不到零頭捨去（840 × 30min ÷ 30天 = 0.58 → floor 0）。
   * 名字說在測什麼，就要真的走到那條路。
   */
  it("adds the seat without an order when the proration rounds down to zero", async () => {
    // Info: (20260815 - Luphia) 席次已佔滿，這一次才會走到補收路徑
    asMock(teamRepo.countMembers).mockResolvedValue(3);
    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: PERIOD_END.getTime() - 30 * 60 * 1000,
    });

    expect(result).toMatchObject({ charged: false, amount: 0, seats: 1 });
    expect(generatePaymentOrder).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.addSeats).toHaveBeenCalledWith("team-1", 1);
  });

  /**
   * Info: (20260814 - Luphia) 付費方案卻沒有單價＝資料異常，必須拒絕（PR #6652 第二輪 A-3）。
   *
   * `unit_price` 是新欄位、預設 0 且無 migration，部署後既有訂閱一律是 0。
   * 若照「零元零頭」放行，整個計費週期內加人全部免費且完全無聲。
   */
  it("refuses to add a seat when a paid subscription has no unit price", async () => {
    // Info: (20260815 - Luphia) 席次已佔滿，這一次才會走到補收路徑
    asMock(teamRepo.countMembers).mockResolvedValue(3);
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      unitPrice: 0,
    });

    await expect(
      chargeSeatAddition({ teamId: "team-1", nowMs: MID_PERIOD }),
    ).rejects.toMatchObject({ code: "TW000015" });

    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
    expect(generatePaymentOrder).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 沒有可扣款的卡就不能加人：放行等於送出一個免費席次，
   * 而且沒有任何後續流程會回頭補收。
   */
  it("refuses to add a seat when no payment method is on record", async () => {
    // Info: (20260815 - Luphia) 席次已佔滿，這一次才會走到補收路徑
    asMock(teamRepo.countMembers).mockResolvedValue(3);
    asMock(paymentRepo.getPaymentMethodById).mockResolvedValue(null);

    await expect(
      chargeSeatAddition({ teamId: "team-1", nowMs: MID_PERIOD }),
    ).rejects.toMatchObject({ code: "TW000011" });
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 單期補收總額上限（PR #6652 第二輪 B-2）。
   *
   * 邀請開放 OWNER / ADMIN，但補收扣的是訂閱那張卡（持卡人是 OWNER），
   * 且沒有持卡人當下的授權。沒有上限，一位 ADMIN 連續邀請 50 個位址
   * 就是替 OWNER 的卡刷 50 筆。
   */
  it("refuses to charge beyond the period cap", async () => {
    // Info: (20260815 - Luphia) 席次已佔滿，這一次才會走到補收路徑
    asMock(teamRepo.countMembers).mockResolvedValue(3);
    // Info: (20260814 - Luphia) 上限 = 單價 840 × 3 席 × 2 = 5,040；已收 5,000 再收 420 會超過
    asMock(paymentRepo.sumSeatAdditionAmount).mockResolvedValue(BigInt(5000));

    await expect(
      chargeSeatAddition({
        teamId: "team-1",
        nowMs: MID_PERIOD,
        operatorUserId: "user-admin",
      }),
    ).rejects.toMatchObject({ code: "TW000016" });

    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 冪等：同一把鍵已經扣過就不再扣（第二輪 B-3）。
   * 建立邀請失敗後客戶端重試時，這是唯一擋得住重複扣款的東西。
   */
  it("does not charge twice for the same idempotency key", async () => {
    // Info: (20260815 - Luphia) 席次已佔滿，這一次才會走到補收路徑
    asMock(teamRepo.countMembers).mockResolvedValue(3);
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue({
      id: "order-seat-1",
      amount: BigInt(420),
    });

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
      idempotencyKey: "invite:team-1:0xabc",
    });

    // Info: (20260818 - Luphia) 回原本的金額；先前回的是負數（第三輪 D）
    expect(result).toMatchObject({ charged: false, amount: 420 });
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 冪等鍵必須綁計費週期（第三輪 A-2）。
   *
   * 不綁的話，每一個「曾經被收過費的信箱／位址」都是一張**永久免費席次券**：
   * 成員離職移出、半年後再邀請回來，會找到當初那張 COMPLETED 訂單而跳過扣款。
   */
  it("scopes the idempotency key to the billing period", async () => {
    asMock(teamRepo.countMembers).mockResolvedValue(3);

    await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
      idempotencyKey: "invite:team-1:0xabc",
    });

    const lookupKey = asMock(paymentRepo.findOrderByIdempotencyKey).mock
      .calls[0][1];
    expect(lookupKey).toBe(`invite:team-1:0xabc#p${PERIOD_START.getTime()}`);
  });

  // Info: (20260814 - Luphia) 扣款失敗必須丟錯：呼叫端據此不建立邀請（fail-closed）
  it("fails closed when the card is declined", async () => {
    // Info: (20260815 - Luphia) 席次已佔滿，這一次才會走到補收路徑
    asMock(teamRepo.countMembers).mockResolvedValue(3);
    asMock(chargeOrderWithSavedCard).mockResolvedValue({
      ok: false,
      reason: "E1234",
    });

    await expect(
      chargeSeatAddition({ teamId: "team-1", nowMs: MID_PERIOD }),
    ).rejects.toMatchObject({ code: "TW000012" });
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
    expect(paymentRepo.updateOrderCompleted).not.toHaveBeenCalled();
  });
});
