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
    getOrderById: jest.fn(),
    getPaymentMethodById: jest.fn(),
    createPaymentTransactionAndUpdateOrder: jest.fn(),
    failPaymentTransactionAndOrder: jest.fn(),
    completePaymentTransactionAndOrder: jest.fn(),
    updateOrderCompleted: jest.fn(),
  },
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
  status: "PAST_DUE",
  autoRenew: true,
  latestOrderId: "order-prev",
  // Info: (20260807 - Luphia) 一天前到期：仍在 3 天寬限期內
  currentPeriodEnd: new Date(NOW_MS - 86_400_000),
};

function mockHappyPath() {
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
        amount: 840,
        data: expect.objectContaining({ teamId: "team-1", renewal: true }),
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
