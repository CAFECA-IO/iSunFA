import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  QuotaExceededError,
  refundCredits,
  resolveEffectivePlanId,
  resolvePayingTeamId,
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
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getTeamMember: jest.fn(), listMemberTeam: jest.fn() },
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
jest.mock("@/repositories/subscription_plan_quota.repo", () => ({
  subscriptionPlanQuotaRepo: { resolveQuota: jest.fn() },
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
  // Info: (20260813 - Luphia) 基準情境沿用費思（計量型）：允許封頂預扣
  allowPartial: true,
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
    // Info: (20260809 - Luphia) 額度改由 DB 設定表提供，mock 依方案回傳既有測試預期值
    asMock(subscriptionPlanQuotaRepo.resolveQuota).mockImplementation(
      async (planId: unknown) =>
        planId === "free"
          ? { per5h: 10, perWeek: 40 }
          : { per5h: 100, perWeek: 750 },
    );
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

  /**
   * Info: (20260813 - Luphia) 拆帳（設計書 §5.4）：額度剩 2 點、本次要 3 點時，
   * 不再整筆改扣錢包，而是「額度用光 2 點 + 錢包補 1 點」。
   * 舊行為會讓那 2 點額度到期作廢，用戶卻多付了 3 點錢包點數。
   */
  it("splits the spend across quota and wallet when the quota is nearly out", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(98),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(10),
    } as unknown);
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: { amount: BigInt(-1) },
    } as unknown);

    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.MIXED);
    expect(result.amount).toBe("3");
    expect(result.quotaAmount).toBe("2");
    expect(result.allocationAmount).toBe("1");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(2) }),
    );
    expect(teamWalletRepo.consumeAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(1) }),
    );
  });

  /**
   * Info: (20260813 - Luphia) 「有點數就能用」（設計書 §5.4）：可用餘額不足全額時
   * 預扣封頂，而不是整筆擋下。這是本次改動的核心——舊行為讓剩 1 點的用戶完全無法送出訊息。
   */
  it("caps the hold at the available balance instead of blocking", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(99),
      usedWeek: BigInt(10),
    });

    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.SUBSCRIPTION_QUOTA);
    expect(result.amount).toBe("1");
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) 固定價格的消費（分析報告、物流查詢等訂單）不能封頂：
   * 它們沒有結算步驟，一旦以 1 點成交，剩下的 2 點就沒有任何流程會回頭補收——
   * 那是帳務上的漏，不是體貼。因此 allowPartial: false 時餘額不足即整筆擋下。
   */
  it("rejects a capped hold when the caller forbids partial payment", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(99),
      usedWeek: BigInt(10),
    });

    const error = await spendCredits({
      ...BASE_PARAMS,
      allowPartial: false,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuotaExceededError);
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  // Info: (20260813 - Luphia) 餘額足夠時 allowPartial: false 不改變任何行為
  it("pays fixed-price orders in full when the balance covers them", async () => {
    const result = await spendCredits({ ...BASE_PARAMS, allowPartial: false });
    expect(result.amount).toBe("3");
  });

  it("uses the wallet alone once the quota is fully consumed", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(10),
    } as unknown);

    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.TEAM_ALLOCATION);
    expect(result.allocationAmount).toBe("3");
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) 402 的門檻改為「訂閱額度與分配點數同時見底」（設計書 §5.4）。
   * 只要還有 1 點就會放行，因此本測試把兩邊都設為 0。
   */
  it("throws QuotaExceededError with full payload when every source is exhausted", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(0),
    } as unknown);

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(QuotaExceededError);
    const quotaError = error as QuotaExceededError;
    expect(quotaError.code).toBe("TW000001");
    expect(quotaError.data.exceeded).toBe("PER_5H");
    expect(quotaError.data.quota5h).toEqual({
      limit: "100",
      used: "100",
      resetAt: getResetAt5h(NOW_SEC),
    });
    expect(quotaError.data.quotaWeek.resetAt).toBe(getResetAtWeek(NOW_SEC));
    expect(quotaError.data.allocationBalance).toBe("0");
    expect(quotaError.data.options).toContain("WAIT_RESET");
  });

  /**
   * Info: (20260813 - Luphia) exceeded 取「剩餘較少」的視窗：週額度歸零而 5h 尚有餘裕時
   * 要報 PER_WEEK，否則用戶等 5 小時後回來仍然被擋。
   */
  it("reports PER_WEEK when the weekly window is the binding one", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(750),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue(null);

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

  /**
   * Info: (20260814 - Luphia) 額度是**一人一池**（產品拍板 20260814）。
   *
   * 聚合條件少了 userId 就會退回「全隊共用」：一個人能在一個視窗內用光整隊的額度，
   * 而其他成員直到重置前一律 402。那個 mutation 不會讓任何行為測試變紅，
   * 因此這裡直接釘住呼叫參數。
   */
  it("counts quota usage per member, not per team", async () => {
    await spendCredits(BASE_PARAMS);

    expect(teamQuotaUsageRepo.sumWindowUsage).toHaveBeenCalledWith(
      "team-1",
      "user-1",
      expect.any(Number),
      expect.any(Number),
    );
  });

  /**
   * Info: (20260814 - Luphia) 逐功能扣款順序的**接線**測試（PR #6652 review B-5 #3）。
   *
   * `splitSpend` 的 priority 參數有預設值 `QUOTA_FIRST`，因此把 `resolveSpendPriority(featureCode)`
   * 這個引數整個刪掉，純函式測試與本檔其餘案例都不會紅——但物流碳足跡會改回吃 5 小時
   * 視窗額度，正是產品拍板要避免的（幾筆查詢就把同團隊的對話擠掉）。
   */
  it("wires the per-feature spend order so logistics spends allocation first", async () => {
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(10),
    } as unknown);

    const result = await spendCredits({
      ...BASE_PARAMS,
      featureCode: BILLABLE_FEATURE_CODE.LOGISTICS_CARBON,
      idempotencyKey: "logistics:order-1",
    });

    // Info: (20260814 - Luphia) 額度尚有餘裕，但物流一律先吃分配點數
    expect(result.allocationAmount).toBe("3");
    expect(result.quotaAmount).toBe("0");
    expect(teamWalletRepo.consumeAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(3) }),
    );
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 重放必須是**呼叫端看得見的狀態**（PR #6652 review A-2）。
   *
   * 冪等鍵保護的是扣款，不是工作：早退只回傳成功、呼叫端照常跑 LLM，
   * 同一把鍵重送 N 次就是 1 次扣款 + N 次模型呼叫，額度系統在這條路徑上等於不存在。
   */
  it("marks a replay so the caller can refuse to redo the work", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockImplementation(
      async (key: unknown) =>
        key === "faith:msg-1" ? ({ amount: BigInt(3) } as unknown) : null,
    );

    const result = await spendCredits(BASE_PARAMS);

    expect(result.replayed).toBe(true);
    expect(result.idempotencyKey).toBe("faith:msg-1");
  });

  // Info: (20260814 - Luphia) 正常扣款不是重放，呼叫端才不會把首次請求誤判成重送
  it("does not mark a fresh spend as a replay", async () => {
    const result = await spendCredits(BASE_PARAMS);
    expect(result.replayed).toBe(false);
  });

  /**
   * Info: (20260814 - Luphia) 前一次已全額退還＝重試，不是重放（PR #6652 review A-2）。
   *
   * 沿用原鍵會撞上 createUsage 的 unique 衝突而被默默吞掉——變成不扣款卻照跑 LLM。
   * 因此改用衍生鍵重新扣一次，並把鍵回傳給呼叫端結算用。
   */
  it("charges again under a retry key when the previous attempt was fully refunded", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockImplementation(
      async (key: unknown) => {
        if (key === "faith:msg-1") return { amount: BigInt(3) } as unknown;
        if (key === "refund:faith:msg-1")
          return { amount: BigInt(-3) } as unknown;
        return null;
      },
    );

    const result = await spendCredits(BASE_PARAMS);

    expect(result.replayed).toBe(false);
    expect(result.idempotencyKey).toBe("faith:msg-1#retry1");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "faith:msg-1#retry1" }),
    );
  });

  /**
   * Info: (20260813 - Luphia) 拆帳後的重放必須把兩邊加總回傳：只認其中一筆就早退，
   * 會讓呼叫端把「已扣的錢包點數」當成沒扣過，結算時少退一半。
   */
  it("replays a split spend by summing both legs", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      amount: BigInt(2),
    } as unknown);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-1),
    } as unknown);

    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.MIXED);
    expect(result.amount).toBe("3");
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  it("treats a concurrent DUPLICATE outcome as success without double spending", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(10),
    } as unknown);
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
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(10),
    } as unknown);
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    await expect(spendCredits(BASE_PARAMS)).rejects.toMatchObject({
      code: "TW000005",
    });
  });

  /**
   * Info: (20260813 - Luphia) 未知方案 fail-closed 到 free（per5h = 10）：已用 8 時
   * 只剩 2 點可扣，若誤用 team 方案的 100 就會放行整筆 3 點。斷言拆帳金額即可證明額度上限。
   */
  it("fails closed to the free plan when planId is unknown", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: "enterprise-typo",
    } as unknown);
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(8),
      usedWeek: BigInt(8),
    });
    const result = await spendCredits(BASE_PARAMS);
    expect(result.quotaAmount).toBe("2");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(2) }),
    );
  });

  /**
   * Info: (20260813 - Luphia) 錢包扣款失敗（併發下餘額被扣走）時不得寫入額度用量：
   * 先扣錢包、後寫額度的順序，就是為了讓這條路徑「什麼都還沒動」而不需要補償。
   */
  it("writes no quota usage when the wallet leg fails", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(98),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(10),
    } as unknown);
    asMock(teamWalletRepo.consumeAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.INSUFFICIENT,
    });

    await expect(spendCredits(BASE_PARAMS)).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
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
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue(null);
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
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-3),
    } as unknown);
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

  /**
   * Info: (20260813 - Luphia) 拆帳後的失敗補償要沖銷兩邊（設計書 §5.4）：
   * 只沖額度會留下「錢包扣了但功能失敗」的懸帳，而那一半是用戶花錢買的。
   */
  it("reverses both legs of a split spend", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(2),
      windowKey5h: 99226,
      windowKeyWeek: 30,
    } as unknown);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-1),
    } as unknown);
    asMock(teamWalletRepo.refundAllocation).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: { amount: BigInt(1) },
    } as unknown);

    const result = await refundCredits({
      idempotencyKey: "faith:msg-1",
      operatorUserId: "worker",
    });
    expect(result).toEqual({ refunded: true, source: SPEND_SOURCE.MIXED });
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(-2),
        idempotencyKey: "refund:faith:msg-1",
      }),
    );
    // Info: (20260814 - Luphia) 退款守恆：明確帶入「尚未退還的金額」，不再默認退全額
    expect(teamWalletRepo.refundAllocation).toHaveBeenCalledWith(
      "faith:msg-1",
      "worker",
      BigInt(1),
    );
  });

  it("returns refunded=false when there is nothing to refund", async () => {
    const result = await refundCredits({
      idempotencyKey: "faith:unknown",
      operatorUserId: "worker",
    });
    expect(result).toEqual({ refunded: false, source: null });
  });
});

/**
 * Info: (20260814 - Luphia) 退款守恆（PR #6652 review A-3）：
 * 結算退差額用 `settle:`、失敗補償用 `refund:`，兩把不同的鍵各自只擋自己重複。
 * 只比對原始預扣的話，「先部分退、再全額退」兩次都會通過，額度會憑空多出一筆。
 */
describe("refund conservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamQuotaUsageRepo.createUsage).mockResolvedValue({});
    asMock(teamWalletRepo.refundAllocation).mockResolvedValue({
      outcome: "OK",
    });
  });

  it("only refunds the part that has not been refunded yet", async () => {
    // Info: (20260814 - Luphia) 預扣 6、結算已退 2 → 補償只能再退 4
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockImplementation(
      async (key: unknown) => {
        if (key === "faith:msg-1")
          return {
            amount: BigInt(6),
            teamId: "team-1",
            userId: "user-1",
            featureCode: "FAITH_CHAT",
            windowKey5h: 1,
            windowKeyWeek: 1,
          } as unknown;
        if (key === "settle:faith:msg-1")
          return { amount: BigInt(-2) } as unknown;
        return null;
      },
    );

    const result = await refundCredits({
      idempotencyKey: "faith:msg-1",
      operatorUserId: "worker",
    });

    expect(result.refunded).toBe(true);
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(-4) }),
    );
  });

  it("refuses to refund anything once the spend is fully refunded", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockImplementation(
      async (key: unknown) => {
        if (key === "faith:msg-1")
          return {
            amount: BigInt(6),
            teamId: "team-1",
            userId: "user-1",
            featureCode: "FAITH_CHAT",
            windowKey5h: 1,
            windowKeyWeek: 1,
          } as unknown;
        if (key === "settle:faith:msg-1")
          return { amount: BigInt(-6) } as unknown;
        return null;
      },
    );

    const result = await refundCredits({
      idempotencyKey: "faith:msg-1",
      operatorUserId: "worker",
    });

    expect(result.refunded).toBe(false);
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
    expect(teamWalletRepo.refundAllocation).not.toHaveBeenCalled();
  });

  // Info: (20260814 - Luphia) 錢包側同理：退款金額明確帶入，不由 repo 預設退全額
  it("passes the outstanding wallet amount instead of defaulting to the full hold", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue(null);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockImplementation(
      async (key: unknown) => {
        if (key === "faith:msg-1")
          return {
            amount: BigInt(-5),
            targetUserId: "user-1",
            featureCode: "FAITH_CHAT",
          } as unknown;
        if (key === "settle:faith:msg-1")
          return { amount: BigInt(2) } as unknown;
        return null;
      },
    );

    await refundCredits({
      idempotencyKey: "faith:msg-1",
      operatorUserId: "worker",
    });

    expect(teamWalletRepo.refundAllocation).toHaveBeenCalledWith(
      "faith:msg-1",
      "worker",
      BigInt(3),
    );
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

  /**
   * Info: (20260814 - Luphia) 純錢包預扣的追補 fallback 測試（PR #6652 review B-5 #2）。
   *
   * 額度見底後的預扣完全走錢包，沒有額度用量列可沿用視窗與 teamId，
   * 全靠呼叫端注入的 `nowSec` / `context`。把那些 `?? context?.` fallback 刪掉，
   * 差額會永遠走到 console.error 早退、`toppedUp` 恆為 "0"——
   * 也就是「只剩 1 點的人可以無限發長訊息」，而原本沒有任何測試覆蓋這條。
   */
  it("tops up the shortfall of a wallet-only hold using the injected context", async () => {
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-1),
      targetUserId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(4),
      operatorUserId: "worker",
      nowSec: NOW_SEC,
      context: {
        teamId: "team-1",
        userId: "user-1",
        featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      },
    });

    expect(result.toppedUp).toBe("3");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(3),
        teamId: "team-1",
        idempotencyKey: "topup:faith:msg-1",
      }),
    );
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
      toppedUp: "0",
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

  /**
   * Info: (20260813 - Luphia) 預扣可能被可用餘額封頂，因此 actual > held 是**預期情形**
   * 而非估算異常（設計書 §5.4）。差額追補到訂閱額度（軟限制，允許最後一筆超額），
   * 絕不追扣錢包——錢包零容忍負餘額。不記這筆，用戶就能靠「只剩 1 點」無限發長訊息。
   */
  it("tops up the shortfall into the quota window when actual exceeds the capped hold", async () => {
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
    expect(result.charged).toBe("9");
    expect(result.refunded).toBe("0");
    expect(result.toppedUp).toBe("5");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(5),
        windowKey5h: 99226,
        windowKeyWeek: 30,
        idempotencyKey: "topup:faith:msg-1",
      }),
    );
    expect(teamWalletRepo.refundAllocationPartial).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) 拆帳的差額**先退錢包**：分配點數是買來的資產，
   * 訂閱額度到期即歸零，退回額度對用戶幾乎沒有價值。
   */
  it("refunds a split settlement to the wallet before the quota", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(2),
      windowKey5h: 99226,
      windowKeyWeek: 30,
    } as unknown);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-4),
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(3),
      operatorUserId: "user-1",
    });
    expect(result.source).toBe(SPEND_SOURCE.MIXED);
    expect(result.held).toBe("6");
    expect(result.refunded).toBe("3");
    // Info: (20260813 - Luphia) 退 3 點：錢包扣了 4 點，故全額由錢包退回，額度不動
    expect(teamWalletRepo.refundAllocationPartial).toHaveBeenCalledWith(
      "faith:msg-1",
      BigInt(3),
      "user-1",
    );
    expect(teamQuotaUsageRepo.createUsage).not.toHaveBeenCalled();
  });

  it("spills the remainder of a refund into the quota once the wallet leg is fully returned", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(4),
      windowKey5h: 99226,
      windowKeyWeek: 30,
    } as unknown);
    asMock(teamWalletRepo.findLedgerByIdempotencyKey).mockResolvedValue({
      amount: BigInt(-2),
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(1),
      operatorUserId: "user-1",
    });
    expect(result.refunded).toBe("5");
    expect(teamWalletRepo.refundAllocationPartial).toHaveBeenCalledWith(
      "faith:msg-1",
      BigInt(2),
      "user-1",
    );
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(-3),
        idempotencyKey: "settle:faith:msg-1",
      }),
    );
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
      toppedUp: "0",
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
    asMock(subscriptionPlanQuotaRepo.resolveQuota).mockImplementation(
      async (planId: unknown) =>
        planId === "free"
          ? { per5h: 10, perWeek: 40 }
          : { per5h: 100, perWeek: 750 },
    );
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

    asMock(teamWalletRepo.getAllocation).mockResolvedValue(null);

    const result = await spendCredits(BASE_PARAMS);
    // Info: (20260813 - Luphia) free per5h = 10、已用 8 → 只剩 2 點；若誤享 team 額度會放行整筆 3 點
    expect(result.amount).toBe("2");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(2) }),
    );
  });
});

/**
 * Info: (20260813 - Luphia) 無帳本情境的付款團隊解析（設計書 §5.6）。
 *
 * AI 分析與物流查詢的訂單不帶帳本，付款團隊只能來自用戶。多團隊時猜錯的後果是
 * 某個團隊莫名其妙被扣額度，因此寧可要求明示。
 */
describe("resolvePayingTeamId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("honours an explicitly requested team", async () => {
    await expect(resolvePayingTeamId("user-1", "team-9")).resolves.toBe(
      "team-9",
    );
    expect(teamRepo.listMemberTeam).not.toHaveBeenCalled();
  });

  it("resolves silently when the user belongs to exactly one team", async () => {
    asMock(teamRepo.listMemberTeam).mockResolvedValue([{ id: "team-1" }]);
    await expect(resolvePayingTeamId("user-1")).resolves.toBe("team-1");
  });

  it("refuses to guess when the user belongs to several teams", async () => {
    asMock(teamRepo.listMemberTeam).mockResolvedValue([
      { id: "team-1" },
      { id: "team-2" },
    ]);
    await expect(resolvePayingTeamId("user-1")).rejects.toMatchObject({
      code: "TW000011",
    });
  });

  it("reports a non-member rather than an ambiguity when there is no team at all", async () => {
    asMock(teamRepo.listMemberTeam).mockResolvedValue([]);
    await expect(resolvePayingTeamId("user-1")).rejects.toMatchObject({
      code: "TW000008",
    });
  });
});
