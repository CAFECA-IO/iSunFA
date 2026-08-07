import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  QuotaExceededError,
  refundCredits,
  resolveEffectivePlanId,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";
import {
  BILLABLE_FEATURE_CODE,
  SPEND_SOURCE,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";
import { getResetAt5h, getResetAtWeek } from "@/lib/quota/window";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getTeamMember: jest.fn() },
}));
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { getByTeamId: jest.fn() },
}));
jest.mock("@/repositories/team_quota_usage.repo", () => ({
  teamQuotaUsageRepo: {
    findByIdempotencyKey: jest.fn(),
    sumWindowUsage: jest.fn(),
    createUsage: jest.fn(),
  },
}));
jest.mock("@/repositories/team_wallet.repo", () => ({
  teamWalletRepo: {
    findLedgerByIdempotencyKey: jest.fn(),
    consumeAllocation: jest.fn(),
    getAllocation: jest.fn(),
    refundAllocation: jest.fn(),
    refundAllocationPartial: jest.fn(),
  },
}));

/**
 * Info: (20260807 - Luphia) 扣費管線單測（設計書 §5、P1 驗收）。
 * 驗證三層順序、冪等重放、fail-closed 方案解析、402 payload 與錯誤包裝。
 * 併發下的負餘額防線在 repo 層測（team_wallet_repo.test.ts 的條件扣款語意）。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

// Info: (20260807 - Luphia) 2026-08-07 12:00 台北（week 30），P0 測試已驗證此錨定
const NOW_SEC = 1786075200;

const BASE_PARAMS = {
  teamId: "team-1",
  userId: "user-1",
  featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
  cost: BigInt(3),
  idempotencyKey: "faith:msg-1",
  nowSec: NOW_SEC,
};

describe("spendCredits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamRepo.getTeamMember).mockResolvedValue({
      id: "member-1",
    } as unknown);
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue(null);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue(null);
    // Info: (20260807 - Luphia) 有效方案需 ACTIVE + 週期內（fail-closed 防線），mock 需齊備
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: "team",
      status: "ACTIVE",
      currentPeriodEnd: new Date((NOW_SEC + 86400) * 1000),
    } as unknown);
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(0),
    });
    asMock(teamQuotaUsageRepo.createUsage).mockResolvedValue({
      created: true,
      usage: { amount: BigInt(3) },
    } as unknown);
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: { amount: BigInt(-3) },
    } as unknown);
    asMock(teamWalletRepo.getAllocation).mockResolvedValue(null);
  });

  it("fails fast on non-positive cost", async () => {
    await expect(
      spendCredits({ ...BASE_PARAMS, cost: BigInt(0) }),
    ).rejects.toMatchObject({ code: "TW000007" });
    await expect(
      spendCredits({ ...BASE_PARAMS, cost: BigInt(-1) }),
    ).rejects.toMatchObject({ code: "TW000007" });
    expect(teamRepo.getTeamMember).not.toHaveBeenCalled();
  });

  it("rejects non-members before touching any ledger", async () => {
    asMock(teamRepo.getTeamMember).mockResolvedValue(null);
    await expect(spendCredits(BASE_PARAMS)).rejects.toMatchObject({
      code: "TW000008",
    });
    expect(teamQuotaUsageRepo.sumWindowUsage).not.toHaveBeenCalled();
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  it("consumes subscription quota first when both windows can absorb the cost", async () => {
    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.SUBSCRIPTION_QUOTA);
    expect(result.amount).toBe("3");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        amount: BigInt(3),
        idempotencyKey: "faith:msg-1",
      }),
    );
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  it("falls back to team allocation when the 5h window is exhausted", async () => {
    // Info: (20260807 - Luphia) team 方案 per5h = 100：98 + 3 > 100 → 額度層擋下
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(98),
      usedWeek: BigInt(10),
    });
    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.TEAM_ALLOCATION);
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
    expect(teamWalletRepo.consumeAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(3) }),
    );
  });

  it("throws QuotaExceededError with full payload when every source is exhausted", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(98),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.INSUFFICIENT,
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(1),
    } as unknown);

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(QuotaExceededError);
    const quotaError = error as QuotaExceededError;
    expect(quotaError.code).toBe("TW000001");
    expect(quotaError.data.exceeded).toBe("PER_5H");
    expect(quotaError.data.quota5h).toEqual({
      limit: "100",
      used: "98",
      resetAt: getResetAt5h(NOW_SEC),
    });
    expect(quotaError.data.quotaWeek.resetAt).toBe(getResetAtWeek(NOW_SEC));
    expect(quotaError.data.allocationBalance).toBe("1");
    expect(quotaError.data.options).toContain("WAIT_RESET");
  });

  it("reports PER_WEEK when only the weekly window is exhausted", async () => {
    // Info: (20260807 - Luphia) team 方案 perWeek = 750：749 + 3 > 750 但 5h 窗仍可容納
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(749),
    });
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.NO_WALLET,
    });

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(QuotaExceededError);
    expect((error as QuotaExceededError).data.exceeded).toBe("PER_WEEK");
  });

  it("replays idempotently from a previous quota usage without spending again", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      amount: BigInt(3),
    } as unknown);
    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.SUBSCRIPTION_QUOTA);
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  it("replays idempotently from a previous allocation ledger without spending again", async () => {
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-5),
    } as unknown);
    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.TEAM_ALLOCATION);
    expect(result.amount).toBe("5");
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  it("treats a concurrent DUPLICATE outcome as success without double spending", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.DUPLICATE,
      ledger: { amount: BigInt(-3) },
    } as unknown);
    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.TEAM_ALLOCATION);
  });

  it("surfaces a frozen wallet instead of a quota error", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    await expect(spendCredits(BASE_PARAMS)).rejects.toMatchObject({
      code: "TW000005",
    });
  });

  it("fails closed to the free plan when planId is unknown", async () => {
    // Info: (20260807 - Luphia) free 方案 per5h = 10：8 + 3 > 10 → 未知方案不得放大額度
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: "enterprise-typo",
    } as unknown);
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(8),
      usedWeek: BigInt(8),
    });
    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.TEAM_ALLOCATION);
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
  });

  it("wraps unexpected repository errors instead of leaking them", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockRejectedValue(
      new Error("prisma exploded"),
    );
    await expect(spendCredits(BASE_PARAMS)).rejects.toMatchObject({
      code: "TW000009",
    });
  });
});

describe("refundCredits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue(null);
    asMock(teamQuotaUsageRepo.createUsage).mockResolvedValue({
      created: true,
      usage: { amount: BigInt(-3) },
    } as unknown);
    asMock(teamWalletRepo.refundAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.NOT_FOUND,
    });
  });

  it("refunds a quota consumption into the original windows", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(3),
      windowKey5h: 99226,
      windowKeyWeek: 30,
    } as unknown);

    const result = await refundCredits({
      idempotencyKey: "faith:msg-1",
      operatorUserId: "worker",
    });
    expect(result).toEqual({
      refunded: true,
      source: SPEND_SOURCE.SUBSCRIPTION_QUOTA,
    });
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(-3),
        windowKey5h: 99226,
        windowKeyWeek: 30,
        idempotencyKey: "refund:faith:msg-1",
      }),
    );
    expect(teamWalletRepo.refundAllocation).not.toHaveBeenCalled();
  });

  it("refunds an allocation consumption through the wallet repo", async () => {
    asMock(teamWalletRepo.refundAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: { amount: BigInt(3) },
    } as unknown);
    const result = await refundCredits({
      idempotencyKey: "faith:msg-1",
      operatorUserId: "worker",
    });
    expect(result).toEqual({
      refunded: true,
      source: SPEND_SOURCE.TEAM_ALLOCATION,
    });
  });

  it("returns refunded=false when there is nothing to refund", async () => {
    const result = await refundCredits({
      idempotencyKey: "faith:unknown",
      operatorUserId: "worker",
    });
    expect(result).toEqual({ refunded: false, source: null });
  });
});

describe("settleSpend", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue(null);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue(null);
    asMock(teamQuotaUsageRepo.createUsage).mockResolvedValue({
      created: true,
      usage: { amount: BigInt(-2) },
    } as unknown);
    asMock(teamWalletRepo.refundAllocationPartial).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: { amount: BigInt(2) },
    } as unknown);
  });

  it("refunds the quota difference into the original windows", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(6),
      windowKey5h: 99226,
      windowKeyWeek: 30,
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(4),
      operatorUserId: "user-1",
    });
    expect(result).toEqual({
      settled: true,
      source: SPEND_SOURCE.SUBSCRIPTION_QUOTA,
      held: "6",
      charged: "4",
      refunded: "2",
    });
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(-2),
        windowKey5h: 99226,
        windowKeyWeek: 30,
        idempotencyKey: "settle:faith:msg-1",
      }),
    );
  });

  it("does not write a settle entry when actual equals held", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(4),
      windowKey5h: 99226,
      windowKeyWeek: 30,
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(4),
      operatorUserId: "user-1",
    });
    expect(result.refunded).toBe("0");
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
  });

  it("never charges beyond the hold when actual exceeds it", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(4),
      windowKey5h: 99226,
      windowKeyWeek: 30,
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(9),
      operatorUserId: "user-1",
    });
    expect(result.charged).toBe("4");
    expect(result.refunded).toBe("0");
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
  });

  it("refunds the allocation difference through the partial refund path", async () => {
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-6),
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(4),
      operatorUserId: "user-1",
    });
    expect(result).toEqual({
      settled: true,
      source: SPEND_SOURCE.TEAM_ALLOCATION,
      held: "6",
      charged: "4",
      refunded: "2",
    });
    expect(teamWalletRepo.refundAllocationPartial).toHaveBeenCalledWith(
      "faith:msg-1",
      BigInt(2),
      "user-1",
    );
  });

  it("reports settled=false when there is no original spend", async () => {
    const result = await settleSpend({
      idempotencyKey: "faith:unknown",
      actualCost: BigInt(1),
      operatorUserId: "user-1",
    });
    expect(result.settled).toBe(false);
  });
});

describe("resolveEffectivePlanId (fail-closed)", () => {
  const FUTURE = new Date((NOW_SEC + 86400) * 1000);
  const PAST = new Date((NOW_SEC - 86400) * 1000);

  it("returns the plan only when ACTIVE and within the period", () => {
    expect(
      resolveEffectivePlanId(
        { planId: "team", status: "ACTIVE", currentPeriodEnd: FUTURE },
        NOW_SEC,
      ),
    ).toBe("team");
  });

  it("falls back to free when the period has ended", () => {
    expect(
      resolveEffectivePlanId(
        { planId: "business", status: "ACTIVE", currentPeriodEnd: PAST },
        NOW_SEC,
      ),
    ).toBe("free");
  });

  it("falls back to free when the subscription is PAST_DUE or missing", () => {
    expect(
      resolveEffectivePlanId(
        { planId: "team", status: "PAST_DUE", currentPeriodEnd: FUTURE },
        NOW_SEC,
      ),
    ).toBe("free");
    expect(resolveEffectivePlanId(null, NOW_SEC)).toBe("free");
  });

  it("expired subscription grants only free quota in the pipeline", async () => {
    jest.clearAllMocks();
    asMock(teamRepo.getTeamMember).mockResolvedValue({
      id: "member-1",
    } as unknown);
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue(null);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue(null);
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: "team",
      status: "ACTIVE",
      currentPeriodEnd: PAST,
    } as unknown);
    // Info: (20260807 - Luphia) free per5h = 10：8 + 3 > 10 → 過期方案不得再享 team 額度
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(8),
      usedWeek: BigInt(8),
    });
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: { amount: BigInt(-3) },
    } as unknown);

    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.TEAM_ALLOCATION);
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
  });
});
