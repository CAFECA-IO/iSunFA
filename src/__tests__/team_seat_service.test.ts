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
  teamRepo: { countMembers: jest.fn(async () => 2) },
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
    asMock(resolveFreePlanMaxMembers).mockResolvedValue(5);
  });

  it("charges the remaining period for the new seat and records it", async () => {
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
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue({
      id: "order-seat-1",
      amount: BigInt(-420),
    });

    const result = await chargeSeatAddition({
      teamId: "team-1",
      nowMs: MID_PERIOD,
      idempotencyKey: "invite:team-1:0xabc",
    });

    expect(result).toMatchObject({ charged: false, amount: 420 });
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
  });

  // Info: (20260814 - Luphia) 扣款失敗必須丟錯：呼叫端據此不建立邀請（fail-closed）
  it("fails closed when the card is declined", async () => {
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
