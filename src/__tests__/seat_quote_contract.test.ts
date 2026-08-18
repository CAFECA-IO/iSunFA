import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync } from "fs";
import { join } from "path";
import {
  chargeSeatAddition,
  quoteSeatAddition,
  SEAT_QUOTE_KIND,
} from "@/services/team_seat.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { generatePaymentOrder } from "@/services/order.service";
import { chargeOrderWithSavedCard } from "@/services/team_billing.service";
import { teamRepo } from "@/repositories/team.repo";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260818 - Luphia) 加席費用的**事前試算**（產品回報 20260818）。
 *
 * 在此之前，補收金額只在扣款之後才存在：管理員按下「邀請」的那一刻，系統就以
 * merchant-initiated 交易刷了訂閱那張卡，而畫面事前沒有揭露任何金額。
 * 使用者的原話是「我在邀請時完全不知道會被加收多少錢」。
 *
 * 這一組守的是**試算與實扣不可分岔**。分岔的代價不是顯示錯字，是「畫面說 420、
 * 卡被刷 840」——而那種缺陷在兩支各自的單元測試裡都會是綠的（review checklist §1.10）。
 * 因此這裡每一條都**同時**呼叫 `quoteSeatAddition` 與 `chargeSeatAddition`，
 * 比對兩者的金額；另有一條掃原始碼，確認扣款端沒有自己再算一次比例。
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
    sumSeatAdditionAmount: jest.fn(async () => BigInt(0)),
    findOrderByIdempotencyKey: jest.fn(async () => null),
  },
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    countMembers: jest.fn(async () => 3),
    countPendingInvitations: jest.fn(async () => 0),
  },
}));

jest.mock("@/services/team_subscription.service", () => ({
  resolveEffectivePlanId: jest.requireActual<
    typeof import("@/services/spend.service")
  >("@/services/spend.service").resolveEffectivePlanId,
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

jest.mock("@/lib/utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function asMock(fn: unknown) {
  return fn as ReturnType<typeof jest.fn>;
}

// Info: (20260818 - Luphia) 期間 2026-08-01 起 30 天、單價 840（與 team_seat_service.test 同一組）
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

const PARAMS = { teamId: "team-1", nowMs: MID_PERIOD };

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
  asMock(teamRepo.countMembers).mockResolvedValue(3);
  asMock(teamRepo.countPendingInvitations).mockResolvedValue(0);
});

describe("quoteSeatAddition", () => {
  it("試算是唯讀的：不建單、不扣款、不改席次", async () => {
    const quote = await quoteSeatAddition(PARAMS);

    expect(quote.kind).toBe(SEAT_QUOTE_KIND.CHARGE);
    expect(generatePaymentOrder).not.toHaveBeenCalled();
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.addSeats).not.toHaveBeenCalled();
    expect(paymentRepo.updateOrderCompleted).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 事前顯示的金額 = 事後真正扣的金額。
   *
   * 這是本檔的核心。刻意在同一個狀態下先試算再扣款，比對兩個數字——
   * 任何一邊改了比例算法、席次差額或上限判斷，這條就紅。
   */
  it("試算的金額與實際扣款的金額相同", async () => {
    const quote = await quoteSeatAddition(PARAMS);
    const charged = await chargeSeatAddition(PARAMS);

    // Info: (20260818 - Luphia) 30 天期、剩 15 天：840 × 15/30 = 420
    expect(quote.amount).toBe(420);
    expect(charged.amount).toBe(quote.amount);
    expect(charged.charged).toBe(true);
    expect(generatePaymentOrder).toHaveBeenCalledWith(
      "user-owner",
      expect.objectContaining({ amount: quote.amount }),
    );
  });

  it("試算帶出計價依據：席次差額與本期剩餘天數", async () => {
    const quote = await quoteSeatAddition(PARAMS);

    expect(quote.seatsToCharge).toBe(1);
    expect(quote.occupied).toBe(3);
    expect(quote.paidSeats).toBe(3);
    // Info: (20260818 - Luphia) 8/16 → 8/31，剩 15 天
    expect(quote.remainingDays).toBe(15);
    expect(quote.unitPrice).toBe(840);
  });

  /**
   * Info: (20260818 - Luphia) 有空席時要說「不收費」，而不是報一個金額。
   * 前端據此顯示「使用已付費的空席」——這條與實扣的 `reusedPaidSeat` 必須一致。
   */
  it("已付席次還有空位時試算為不收費，實扣也不收費", async () => {
    asMock(teamRepo.countMembers).mockResolvedValue(2);

    const quote = await quoteSeatAddition(PARAMS);
    const charged = await chargeSeatAddition(PARAMS);

    expect(quote.kind).toBe(SEAT_QUOTE_KIND.REUSE_PAID_SEAT);
    expect(quote.amount).toBe(0);
    expect(charged).toMatchObject({ charged: false, reusedPaidSeat: true });
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 免費方案一律不收費、**也不再有人數上限**
   * （上限於同日移除，額度改為全隊共用一份）。因此這裡刻意把人數設得很多：
   * 舊行為會回 BLOCKED（TW000017），現在必須是 FREE_PLAN。
   */
  it("免費方案試算為不收費，人數再多也不擋", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
    asMock(teamRepo.countMembers).mockResolvedValue(50);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(30);
  
    const quote = await quoteSeatAddition(PARAMS);

    expect(quote.kind).toBe(SEAT_QUOTE_KIND.FREE_PLAN);
    expect(quote.amount).toBe(0);
  });

  /**
   * Info: (20260818 - Luphia) 擋下的原因要在**送出前**就講得出來。
   *
   * 每一條 BLOCKED 都要對回 `chargeSeatAddition` 實際會丟的錯誤碼。漏一條，
   * 使用者就會在畫面上看到「可以邀請」、按下去才拿到錯誤——那是這次要修的形狀。
   */
  it.each([
    [
      "沒有可扣款的卡",
      () => asMock(paymentRepo.getPaymentMethodById).mockResolvedValue(null),
      API_ERRORS.TW_SEAT_PAYMENT_METHOD_MISSING.code,
    ],
    [
      "付費方案卻沒有單價",
      () =>
        asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
          ...ACTIVE_SUBSCRIPTION,
          unitPrice: 0,
        }),
      API_ERRORS.TW_SEAT_PRICE_MISSING.code,
    ],
    [
      "當期補收已達上限",
      () =>
        asMock(paymentRepo.sumSeatAdditionAmount).mockResolvedValue(
          BigInt(840 * 3 * 2),
        ),
      API_ERRORS.TW_SEAT_CHARGE_CAP_EXCEEDED.code,
    ],
  ])("%s：試算擋下，且與實扣丟的錯誤碼一致", async (_label, arrange, code) => {
    arrange();

    const quote = await quoteSeatAddition(PARAMS);
    expect(quote.kind).toBe(SEAT_QUOTE_KIND.BLOCKED);
    expect(quote.blocked?.code).toBe(code);

    await expect(chargeSeatAddition(PARAMS)).rejects.toMatchObject({ code });
    // Info: (20260818 - Luphia) 擋下就不能有任何扣款動作
    expect(chargeOrderWithSavedCard).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 扣款端**不得自己再算一次**比例。
   *
   * 上面那些行為斷言證明「目前兩邊一致」，但擋不住有人日後在扣款端補一行
   * `resolveSeatProration(...)`「以防萬一」——那正是分岔的起點，而分岔那天
   * 行為測試不一定抓得到（同一組 fixture 下兩邊算出來會一樣）。
   * 因此這條掃原始碼：比例計價只能出現在試算裡。
   */
  it("扣款端沒有第二份比例計價", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "services", "team_seat.service.ts"),
      "utf8",
    );
    const chargeBody = source.slice(
      source.indexOf("export async function chargeSeatAddition("),
    );

    expect(chargeBody).not.toMatch(/resolveSeatProration\(/);
    // Info: (20260818 - Luphia) 而且它要真的用試算的結果
    expect(chargeBody).toMatch(/await quoteSeatAddition\(/);
    expect(chargeBody).toMatch(/quote\.amount/);
  });
});
