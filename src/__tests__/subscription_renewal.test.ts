import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { processSubscriptionRenewals } from "@/services/cron/subscription_renewal.cron";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { generatePaymentOrder } from "@/services/order.service";

jest.mock("@/lib/utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: {
    listPastDueAutoRenew: jest.fn(),
    downgradeToFree: jest.fn(),
    applyTeamSubscription: jest.fn(),
  },
}));
jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    /**
     * Info: (20260820 - Luphia) 續訂改為帶冪等鍵（同一期只扣一次）。
     * 這一支不 mock 的話會是 undefined，而 renewOne 在建單前就會丟 TypeError——
     * 症狀是「一筆都沒續訂」而看起來與扣款邏輯有關（checklist §1.8）。
     */
    findOrderByIdempotencyKey: jest.fn(async () => null),
    /**
     * Info: (20260820 - Luphia) 扣款失敗後要放掉冪等鍵（唯一欄位）。
     * 不 mock 會是 undefined，而失敗分支就會丟 TypeError——症狀變成
     * 「續訂拋錯」而不是「扣款失敗」（checklist §1.8）。
     */
    releaseIdempotencyKey: jest.fn(async () => undefined),
    getOrderById: jest.fn(),
    getPaymentMethodById: jest.fn(),
    createPaymentTransactionAndUpdateOrder: jest.fn(),
    failPaymentTransactionAndOrder: jest.fn(),
    completePaymentTransactionAndOrder: jest.fn(),
    updateOrderCompleted: jest.fn(),
  },
}));
/**
 * Info: (20260814 - Luphia) 續訂依「當下人數」重算席次（PR #6652 第二輪 B-5 #2）。
 *
 * 先前這支測試沒有 mock team.repo，`countMembers` 會走到真 prisma：
 * 無 DB 時 query reject 被 catch 吞掉、有 DB 時回 0 再靠 MIN_SEATS 兜回 840——
 * 兩種都是「靠 fallback 蒙對」，而把 `countMembers` 換成常數 1 不會讓任何測試變紅。
 */
jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { countMembers: jest.fn(async () => 8) },
}));
jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: { findUserById: jest.fn() },
}));
jest.mock("@/services/order.service", () => ({
  generatePaymentOrder: jest.fn(),
}));

/**
 * Info: (20260807 - Luphia) 自動續訂 Worker 單測（設計書 §9 P4 待辦）。
 * 覆蓋：成功續訂（扣款 → 套用新週期 → COMPLETED）、扣款失敗留 PAST_DUE 重試、
 * 逾寬限期降級 free、缺綁卡資訊 no-op。OEN 以 global.fetch mock。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_MS = 1786075200 * 1000;

const PAST_DUE_SUB = {
  teamId: "team-1",
  planId: "team",
  // Info: (20260820 - Luphia) 沒有排程中的降級（真實列一定有這一欄，null 是常態）
  pendingPlanId: null,
  status: "PAST_DUE",
  autoRenew: true,
  latestOrderId: "order-prev",
  /**
   * Info: (20260820 - Luphia) 期初：續訂的冪等鍵綁它（同一期只扣一次）。
   * 少了這一欄，`renewalIdempotencyKey` 會對 undefined 呼叫 `getTime()`——
   * 而症狀是「一筆都沒續訂」，看起來像扣款邏輯壞了（checklist §1.4 fixture 形狀）。
   */
  currentPeriodStart: new Date(NOW_MS - 31 * 86_400_000),
  // Info: (20260807 - Luphia) 一天前到期：仍在 3 天寬限期內
  currentPeriodEnd: new Date(NOW_MS - 86_400_000),
};

function mockHappyPath() {
  // Info: (20260820 - Luphia) 每個案例重設：clearAllMocks 不會還原 factory 裡的實作
  asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue(null);
  asMock(paymentRepo.releaseIdempotencyKey).mockResolvedValue(undefined);
  asMock(teamSubscriptionRepo.listPastDueAutoRenew).mockResolvedValue([
    PAST_DUE_SUB,
  ]);
  asMock(paymentRepo.getOrderById).mockResolvedValue({
    id: "order-prev",
    userId: "user-owner",
    data: { paymentMethodId: "pm-1", billingInterval: "month" },
  } as unknown);
  asMock(paymentRepo.getPaymentMethodById).mockResolvedValue({
    id: "pm-1",
    token: "oen-token",
    data: {},
  } as unknown);
  asMock(webAuthnRepo.findUserById).mockResolvedValue({
    id: "user-owner",
    name: "Owner",
  } as unknown);
  asMock(generatePaymentOrder).mockResolvedValue({
    orderId: "order-renewal",
    challenge: "c",
    cost: 840,
  });
  asMock(paymentRepo.createPaymentTransactionAndUpdateOrder).mockResolvedValue({
    id: "ptx-1",
  } as unknown);
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ code: "S0000" }),
  })) as unknown as typeof fetch;
}

/**
 * Info: (20260820 - Luphia) 排程中的降級**在週期邊界兌現**（修正 20260820）。
 *
 * 降級不期中生效（退款政策 §2.1），所以它必須在某個地方落地——就是這裡：
 * 續訂依 `pendingPlanId` 計價、建單、套用，而 `applyTeamSubscription` 隨即清掉排程。
 *
 * 少了這一段，排程會是一張永遠不兌現的空頭承諾：使用者按了降級、期末照原方案
 * 全額續訂，而畫面上那行「將於 X 起改為團隊版」永遠不會實現。
 */
describe("排程降級在期末兌現", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHappyPath();
  });

  it("依 pendingPlanId 計價與套用（企業版 → 團隊版）", async () => {
    asMock(teamSubscriptionRepo.listPastDueAutoRenew).mockResolvedValue([
      { ...PAST_DUE_SUB, planId: "business", pendingPlanId: "team" },
    ]);

    const result = await processSubscriptionRenewals(NOW_MS);

    expect(result.renewed).toBe(1);
    expect(generatePaymentOrder).toHaveBeenCalledWith(
      "user-owner",
      expect.objectContaining({
        planId: "team",
        // Info: (20260820 - Luphia) 8 人 × 團隊版月費 840 = 6,720（不是企業版的 2,940）
        unitPrice: 840,
        amount: 6720,
      }),
    );
    expect(teamSubscriptionRepo.applyTeamSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ planId: "team" }),
    );
  });

  /**
   * Info: (20260820 - Luphia) 排程降到 free 的列不該被收費。
   *
   * 那種列的 `autoRenew` 已關閉，正常情況下 `listPastDueAutoRenew` 撈不到它；
   * 但「排程 free 卻仍自動續訂」這種不該存在的組合若真的出現，
   * 也不能變成一張免費方案的收費訂單。
   */
  it("排程降到 free 時不建單、不扣款", async () => {
    asMock(teamSubscriptionRepo.listPastDueAutoRenew).mockResolvedValue([
      { ...PAST_DUE_SUB, planId: "business", pendingPlanId: "free" },
    ]);

    const result = await processSubscriptionRenewals(NOW_MS);

    expect(result.skipped).toBe(1);
    expect(generatePaymentOrder).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.applyTeamSubscription).not.toHaveBeenCalled();
  });
});

describe("processSubscriptionRenewals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHappyPath();
  });

  it("charges the saved card and applies a new period on success", async () => {
    const result = await processSubscriptionRenewals(NOW_MS);
    expect(result.renewed).toBe(1);
    expect(generatePaymentOrder).toHaveBeenCalledWith(
      "user-owner",
      expect.objectContaining({
        // Info: (20260814 - Luphia) 8 人團隊、月繳單價 840 → 實收 6,720（席次乘算）
        amount: 6720,
        seats: 8,
        unitPrice: 840,
        // Info: (20260814 - Luphia) teamId 必須在頂層，履行端才讀得到（見 team_order_payload 測試）
        teamId: "team-1",
        data: expect.objectContaining({ renewal: true }),
      }),
    );
    expect(paymentRepo.completePaymentTransactionAndOrder).toHaveBeenCalled();
    expect(teamSubscriptionRepo.applyTeamSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        planId: "team",
        orderId: "order-renewal",
      }),
    );
    expect(paymentRepo.updateOrderCompleted).toHaveBeenCalledWith(
      "order-renewal",
    );
    expect(teamSubscriptionRepo.downgradeToFree).not.toHaveBeenCalled();
  });

  it("keeps PAST_DUE for retry when the charge fails", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({ code: "E0001" }),
    })) as unknown as typeof fetch;

    const result = await processSubscriptionRenewals(NOW_MS);
    expect(result.failed).toBe(1);
    expect(paymentRepo.failPaymentTransactionAndOrder).toHaveBeenCalled();
    expect(teamSubscriptionRepo.applyTeamSubscription).not.toHaveBeenCalled();
    expect(teamSubscriptionRepo.downgradeToFree).not.toHaveBeenCalled();
  });

  it("downgrades to free after the grace period without charging the card", async () => {
    asMock(teamSubscriptionRepo.listPastDueAutoRenew).mockResolvedValue([
      {
        ...PAST_DUE_SUB,
        // Info: (20260807 - Luphia) 四天前到期：超過 3 天寬限期
        currentPeriodEnd: new Date(NOW_MS - 4 * 86_400_000),
      },
    ]);
    const result = await processSubscriptionRenewals(NOW_MS);
    expect(result.downgraded).toBe(1);
    expect(teamSubscriptionRepo.downgradeToFree).toHaveBeenCalledWith(
      "team-1",
      NOW_MS,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("skips (without charging) when there is no payment method on record", async () => {
    asMock(paymentRepo.getOrderById).mockResolvedValue({
      id: "order-prev",
      userId: "user-owner",
      data: {},
    } as unknown);
    const result = await processSubscriptionRenewals(NOW_MS);
    expect(result.skipped).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("counts an unexpected error as failed and keeps processing", async () => {
    asMock(
      paymentRepo.createPaymentTransactionAndUpdateOrder,
    ).mockRejectedValue(new Error("db down"));
    const result = await processSubscriptionRenewals(NOW_MS);
    expect(result.failed).toBe(1);
  });
});

/**
 * Info: (20260820 - Luphia) 續訂的冪等（self-review B-6）。
 *
 * 原本完全沒有鍵：扣款成功而 `applyTeamSubscription` 失敗時，訂閱仍是
 * PAST_DUE + autoRenew，於是**下一小時再建一張新單、再扣一次款**。
 */
describe("續訂冪等", () => {
  beforeEach(() => {
    /**
     * Info: (20260820 - Luphia) 這一檔沒有全域的 `clearAllMocks`（每個案例自己呼叫
     * `mockHappyPath`），因此呼叫紀錄會跨案例累積——`not.toHaveBeenCalled()` 會
     * 撈到前一條案例的呼叫。這一段自己清。
     */
    jest.clearAllMocks();
    mockHappyPath();
  });

  it("建單時帶上綁定當期的冪等鍵", async () => {
    await processSubscriptionRenewals(NOW_MS);

    expect(asMock(generatePaymentOrder)).toHaveBeenCalledWith(
      "user-owner",
      expect.objectContaining({
        idempotencyKey: `renew:team-1:p${PAST_DUE_SUB.currentPeriodStart.getTime()}`,
      }),
    );
  });

  /**
   * Info: (20260820 - Luphia) 已完成的訂單＝錢收了而權益沒給（否則這一列不會還在
   * PAST_DUE 名單裡）。補套用，**不再扣款**。
   */
  it("這一期已有 COMPLETED 訂單 → 補套用，不再建單扣款", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue({
      id: "order-charged",
      status: "COMPLETED",
    });

    const result = await processSubscriptionRenewals(NOW_MS);

    expect(result.renewed).toBe(1);
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(
      asMock(teamSubscriptionRepo.applyTeamSubscription),
    ).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-charged" }),
    );
  });

  /**
   * Info: (20260820 - Luphia) 還沒定案的訂單（PAYING / PAID）→ 這一輪跳過。
   * 再送一次請款等於重複扣款，而金流商那邊可能正在處理。
   */
  it("這一期已有請款中的訂單 → 跳過，不重複扣款", async () => {
    asMock(paymentRepo.findOrderByIdempotencyKey).mockResolvedValue({
      id: "order-paying",
      status: "PAYING",
    });

    const result = await processSubscriptionRenewals(NOW_MS);

    expect(result.skipped).toBe(1);
    expect(asMock(generatePaymentOrder)).not.toHaveBeenCalled();
    expect(
      asMock(teamSubscriptionRepo.applyTeamSubscription),
    ).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260820 - Luphia) 扣款失敗後那把冪等鍵必須放掉（self-review 第二輪，中）。
 *
 * `order.idempotency_key` 是唯一欄位。不放掉的話下一輪查不到那張失敗的訂單
 *（刻意不認失敗狀態），去建新單就撞 P2002——每小時噴一次錯，永遠續不上，
 * 直到寬限期用盡降級為免費版。
 */
describe("扣款失敗後釋放冪等鍵", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHappyPath();
  });

  it("扣款失敗時放掉鍵，讓下一輪能真的重試", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ code: "E9999" }),
    })) as unknown as typeof fetch;

    const result = await processSubscriptionRenewals(NOW_MS);

    expect(result.failed).toBe(1);
    expect(asMock(paymentRepo.releaseIdempotencyKey)).toHaveBeenCalledWith(
      "order-renewal",
    );
  });

  // Info: (20260820 - Luphia) 成功時**不放**：那把鍵正是「這一期已經收過錢」的證據
  it("扣款成功時不放掉鍵", async () => {
    const result = await processSubscriptionRenewals(NOW_MS);

    expect(result.renewed).toBe(1);
    expect(asMock(paymentRepo.releaseIdempotencyKey)).not.toHaveBeenCalled();
  });
});
