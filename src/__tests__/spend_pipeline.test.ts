import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  buildQuotaExceededOptions,
  QuotaExceededError,
  refundCredits,
  resolvePayingTeamId,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";
import { resolveEffectivePlanId } from "@/lib/subscription/plan_rules";
import {
  BILLABLE_FEATURE_CODE,
  SPEND_SOURCE,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";
import {
  getResetAt5h,
  getResetAtWeek,
  getWindowKey5h,
  getWindowKeyWeek,
} from "@/lib/quota/window";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import {
  chargeChainCredits,
  isChainCreditSpendable,
  readChainCredits,
} from "@/lib/quota/personal_chain_credits";

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
    /**
     * Info: (20260815 - Luphia) 額度讀寫改為在 advisory lock 的交易內進行
     * （PR #6652 第二輪 C-6）。替身直接執行 operation，交易語意由 repo 測試涵蓋。
     */
    withMemberQuotaLock: jest.fn(
      async (
        _teamId: unknown,
        _userId: unknown,
        operation: (tx: unknown) => Promise<unknown>,
      ) => operation({}),
    ),
    sumWindowUsageInTx: jest.fn(),
    /**
     * Info: (20260819 - Luphia) 免費方案改為全隊共用一份額度（產品決定 20260819）：
     * 鎖的粒度變成團隊、用量聚合整個團隊。替身要有這兩支，否則走到免費方案的
     * 測試會以「不是函式」失敗——而那不是被測行為錯，是替身沒有照實模擬（§1.8）。
     */
    withTeamQuotaLock: jest.fn(
      async (_teamId: unknown, operation: (tx: unknown) => Promise<unknown>) =>
        operation({}),
    ),
    sumTeamWindowUsageInTx: jest.fn(),
    createUsageInTx: jest.fn(),
  },
}));
jest.mock("@/repositories/subscription_plan_quota.repo", () => ({
  subscriptionPlanQuotaRepo: { resolveQuota: jest.fn() },
}));
/**
 * Info: (20260814 - Luphia) 成員位址與鏈上餘額都要替身（PR #6652 第二輪 A-1）。
 * 少了這兩個 mock，`findUserById` 會打到真資料庫——查無此人剛好回 null、
 * 於是鏈上餘額算成 0 而測試「碰巧」通過。那是靠環境蒙對，不是驗證。
 */
jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserById: jest.fn(async () => ({ address: "0xmember" })),
  },
}));
jest.mock("@/lib/quota/personal_chain_credits", () => ({
  readChainCredits: jest.fn(async () => BigInt(0)),
  chargeChainCredits: jest.fn(async () => ({ charged: false })),
  /**
   * Info: (20260818 - Luphia) 預設 false，與實作一致（第三輪）：
   * 合約沒有可由平台呼叫的 burn，這一層目前扣不動。
   */
  isChainCreditSpendable: jest.fn(() => false),
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
    // Info: (20260814 - Luphia) 預設成員沒有鏈上點數，個別測試再覆寫
    asMock(readChainCredits).mockResolvedValue(BigInt(0));
    /**
     * Info: (20260818 - Luphia) 預設不可扣款，與實作一致（第三輪）。
     * `clearAllMocks` 不會還原 `mockReturnValue`，所以每一輪都要重設——
     * 否則把它打開的那條測試會滲進後面的案例。
     */
    asMock(isChainCreditSpendable).mockReturnValue(false);
    asMock(chargeChainCredits).mockResolvedValue({ charged: false });
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
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(0),
    });
    // Info: (20260819 - Luphia) 免費方案走全隊聚合（見上方 mock 說明）
    asMock(teamQuotaUsageRepo.sumTeamWindowUsageInTx).mockResolvedValue({
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
    // Info: (20260815 - Luphia) 非成員連鎖都不該拿到，遑論讀寫用量
    expect(teamQuotaUsageRepo.withMemberQuotaLock).not.toHaveBeenCalled();
    expect(teamQuotaUsageRepo.sumWindowUsageInTx).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 鎖的粒度要跟著額度的範圍換（產品決定 20260819）。
   *
   * 免費方案改為全隊共用一份額度之後，若聚合換成全隊而鎖還是 (團隊, 成員)，
   * 兩位成員的併發請求會各持自己的鎖、同時讀到同一個 used、各自放行——
   * 超額幅度變成併發數 × 單筆，而 §5.1 容許的是一筆。
   *
   * 這一條是**確定性**的接線斷言（哪一把鎖被拿）；併發下的實際結果另有一支
   * 對真資料庫的 e2e（`free_plan_shared_quota_concurrency.e2e.test.ts`）。
   * 兩者缺一：只有 e2e 會偶爾漏抓（兩個請求剛好錯開就都對），
   * 只有這一條則證明不了鎖真的有序列化的效果。
   */
  it.each([
    ["免費方案", null, "withTeamQuotaLock", "withMemberQuotaLock"],
    [
      "付費方案",
      { planId: "team", status: "ACTIVE" },
      "withMemberQuotaLock",
      "withTeamQuotaLock",
    ],
  ])("%s 拿的是 %s，不是 %s", async (_label, sub, expected, notExpected) => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(
      sub
        ? { ...sub, currentPeriodEnd: new Date((NOW_SEC + 86400) * 1000) }
        : null,
    );

    await spendCredits(BASE_PARAMS);

    const repo = teamQuotaUsageRepo as unknown as Record<string, unknown>;
    expect(asMock(repo[expected])).toHaveBeenCalled();
    expect(asMock(repo[notExpected])).not.toHaveBeenCalled();
  });

  it("consumes subscription quota first when both windows can absorb the cost", async () => {
    const result = await spendCredits(BASE_PARAMS);
    expect(result.source).toBe(SPEND_SOURCE.SUBSCRIPTION_QUOTA);
    expect(result.amount).toBe("3");
    expect(teamQuotaUsageRepo.createUsageInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        teamId: "team-1",
        amount: BigInt(3),
        idempotencyKey: "faith:msg-1",
      }),
    );
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) 「有點數就能用」（設計書 §5.4）：可用餘額不足全額時
   * 預扣封頂，而不是整筆擋下。這是本次改動的核心——舊行為讓剩 1 點的用戶完全無法送出訊息。
   */
  it("caps the hold at the available balance instead of blocking", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
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
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(99),
      usedWeek: BigInt(10),
    });

    const error = await spendCredits({
      ...BASE_PARAMS,
      allowPartial: false,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuotaExceededError);
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  // Info: (20260813 - Luphia) 餘額足夠時 allowPartial: false 不改變任何行為
  it("pays fixed-price orders in full when the balance covers them", async () => {
    const result = await spendCredits({ ...BASE_PARAMS, allowPartial: false });
    expect(result.amount).toBe("3");
  });

  /**
   * Info: (20260813 - Luphia) 402 的門檻改為「訂閱額度與分配點數同時見底」（設計書 §5.4）。
   * 只要還有 1 點就會放行，因此本測試把兩邊都設為 0。
   */
  it("throws QuotaExceededError with full payload when every source is exhausted", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
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
    /**
     * Info: (20260818 - Luphia) 整組比對，含**順序**（第五輪 T-2）。
     *
     * 原本是兩條 `toContain` / `not.toContain`，於是把 payload 的 options
     * 反轉（`[...].reverse()`）不會被任何測試發現——而前端依序呈現這些出路，
     * 順序就是引導順序。第四輪特地保留了兩種情境各自的排法，卻沒有在
     * payload 這一側釘住它。
     *
     * 同時涵蓋「第二層停用期間不得列 USE_PERSONAL_WALLET」（第四輪 B-1）：
     * `allocationBalance` 已誠實讀成 0，選項留著就是 API 契約在說謊。
     */
    expect(quotaError.data.options).toEqual(["WAIT_RESET"]);
  });

  /**
   * Info: (20260818 - Luphia) 出路清單的單一判斷點（第四輪 B-1）。
   *
   * 直接測 `buildQuotaExceededOptions`：它是「哪些出路真的存在」的唯一答案處，
   * 而恢復（把這一層改接持有人簽章的兩段式訂單）只需要翻 `isChainCreditSpendable()`。
   */
  describe("buildQuotaExceededOptions", () => {
    /**
     * Info: (20260818 - Luphia) 順序要與停用前一致（第四輪自審）。
     *
     * 兩種情境的第一順位刻意不同：單筆超過視窗上限時「等重置」不會好，
     * 最該先講的是自己的點數；一般的額度用罄則以「等一下就好」為主。
     * 抽成函式時若順手把兩者統一，會靜悄悄改掉一般情境的引導順序。
     */
    it("第二層可用時列出個人點數，且維持原本的順序", () => {
      asMock(isChainCreditSpendable).mockReturnValue(true);
      expect(buildQuotaExceededOptions(false)).toEqual([
        "WAIT_RESET",
        "USE_PERSONAL_WALLET",
      ]);
      expect(buildQuotaExceededOptions(true)).toEqual([
        "USE_PERSONAL_WALLET",
        "UPGRADE_PLAN",
      ]);
    });

    it("第二層停用時只留真的存在的出路", () => {
      asMock(isChainCreditSpendable).mockReturnValue(false);
      expect(buildQuotaExceededOptions(false)).toEqual(["WAIT_RESET"]);
      // Info: (20260818 - Luphia) 單筆超過視窗上限時等重置不會好，只有升級有用
      expect(buildQuotaExceededOptions(true)).toEqual(["UPGRADE_PLAN"]);
    });
  });

  /**
   * Info: (20260818 - Luphia) 第二層可用時，payload 的 options **順序**要與 builder 一致
   * （第五輪 T-2）。
   *
   * 停用期間每個分支都只有一個選項，因此把陣列反轉在 payload 上看不出差別——
   * 那條 mutation 今天無害，但第二層恢復的當下就會靜悄悄改掉前端的引導順序。
   * 這裡把旗標打開來測，讓那個性質現在就被釘住。
   */
  it("第二層可用時 payload 保留 builder 的出路順序", async () => {
    asMock(isChainCreditSpendable).mockReturnValue(true);
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(0),
    } as unknown);
    // Info: (20260818 - Luphia) 鏈上餘額仍為 0，否則請求會被放行而不是回 402
    asMock(readChainCredits).mockResolvedValue(BigInt(0));

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);
    const quotaError = error as QuotaExceededError;

    expect(quotaError.data.options).toEqual([
      "WAIT_RESET",
      "USE_PERSONAL_WALLET",
    ]);
  });

  /**
   * Info: (20260813 - Luphia) exceeded 取「剩餘較少」的視窗：週額度歸零而 5h 尚有餘裕時
   * 要報 PER_WEEK，否則用戶等 5 小時後回來仍然被擋。
   */
  it("reports PER_WEEK when the weekly window is the binding one", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
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
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
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
   * Info: (20260814 - Luphia) 第二層改讀成員的鏈上點數（PR #6652 第二輪 A-1）。
   *
   * 分配改為鑄到成員錢包後，離鏈的 allocation 對新資料永遠是 0。若第二層仍讀它，
   * 會出現「成員手上有 1,000 點、系統說他有 0 點並叫他去買」——
   * 這條測試釘住的就是那個判斷有沒有看向正確的地方。
   */
  /**
   * Info: (20260818 - Luphia) 鏈上點數目前扣不動，因此**不得**用來放行（第三輪 fail-open）。
   *
   * 先前把它加進 `available`，而扣款必定失敗、餘額永遠不減少——
   * 一個持有 ≥1 點的成員可以無上限消費，成本全部追補到**團隊額度**上。
   * 「因為他有點數所以放行，然後叫團隊付」。
   *
   * 這條原本斷言的是相反的行為（`lets the member's own chain credits keep
   * the request flowing`），連同它的註解一起改掉——那個行為現在是 bug。
   */
  it("does not admit a request on chain credits that cannot be charged", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(readChainCredits).mockResolvedValue(BigInt(50));

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuotaExceededError);
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 402 的第二層餘額也要是 0：那個欄位驅動的是
   * 「可改用個人點數繼續」的提示，顯示一個用不了的餘額，
   * 等於叫使用者去按一顆不會有反應的按鈕。
   */
  it("does not advertise unusable chain credits in the 402 payload", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(readChainCredits).mockResolvedValue(BigInt(50));

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);
    expect((error as QuotaExceededError).data.allocationBalance).toBe("0");
  });

  /**
   * Info: (20260818 - Luphia) 若有人重新讓第二層參與放行，**必須當場炸開**（第三輪 A-1(c)）。
   *
   * 這是 fail-closed 之下唯一測得到那道不變式檢查的方法：把 `isChainCreditSpendable`
   * 打開，讓額度為 0 的請求靠鏈上餘額通過——那正是先前會安靜失去冪等的情境
   * （不寫用量列 → `held = 0` → 重放偵測永不觸發 → 同一則訊息重送 N 次扣 N 次）。
   *
   * 現在它會丟錯而不是放行。恢復第二層之前得先把 A-1 做完（分錄 + 冪等），
   * 而這條測試就是那個提醒。
   */
  it("refuses to admit a spend it cannot record, even if the second layer is re-enabled", async () => {
    asMock(isChainCreditSpendable).mockReturnValue(true);
    asMock(readChainCredits).mockResolvedValue(BigInt(50));
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });

    await expect(spendCredits(BASE_PARAMS)).rejects.toThrow();
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 放行必定留下一筆用量列（第三輪 A-1(c) 的根因）。
   *
   * 重放偵測的判準是 `records.held > 0`；先前鏈上餘額能讓
   * `quotaAvailable = 0` 的請求通過，於是不寫任何用量列 → `held = 0` →
   * 同一個 clientMessageId 重送 N 次就扣 N 次。改為 fail-closed 之後，
   * 能放行就代表 `quotaAvailable > 0`，用量列一定寫得下去。
   */
  it("always records a usage row when the spend is admitted", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(0),
    });

    const result = await spendCredits(BASE_PARAMS);

    expect(BigInt(result.quotaAmount)).toBeGreaterThan(BigInt(0));
    expect(teamQuotaUsageRepo.createUsageInTx).toHaveBeenCalled();
  });

  // Info: (20260814 - Luphia) 額度與鏈上點數同時見底才是真的用盡
  it("throws when both the quota and the member credits are empty", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(readChainCredits).mockResolvedValue(BigInt(0));

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(QuotaExceededError);
    // Info: (20260814 - Luphia) 402 的第二層餘額要報鏈上點數，否則畫面又會說謊
    expect((error as QuotaExceededError).data.allocationBalance).toBe("0");
  });

  it("reports the member's chain balance in the 402 payload", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(10),
    });
    asMock(readChainCredits).mockResolvedValue(BigInt(0));
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(999),
    } as unknown);

    const error = await spendCredits(BASE_PARAMS).catch((e: unknown) => e);
    /**
     * Info: (20260814 - Luphia) 就算離鏈 allocation 還留著舊數字，也不能拿它當第二層餘額——
     * 那份餘額在遷移後不再是可用點數。
     */
    expect((error as QuotaExceededError).data.allocationBalance).toBe("0");
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

    expect(teamQuotaUsageRepo.sumWindowUsageInTx).toHaveBeenCalledWith(
      expect.anything(),
      "team-1",
      "user-1",
      expect.any(Number),
      expect.any(Number),
    );
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
    expect(teamQuotaUsageRepo.createUsageInTx).toHaveBeenCalledWith(
      expect.anything(),
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
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
    expect(teamWalletRepo.consumeAllocation).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) 未知方案 fail-closed 到 free（per5h = 10）：已用 8 時
   * 只剩 2 點可扣，若誤用 team 方案的 100 就會放行整筆 3 點。斷言拆帳金額即可證明額度上限。
   */
  it("fails closed to the free plan when planId is unknown", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: "enterprise-typo",
    } as unknown);
    /**
     * Info: (20260819 - Luphia) fail-closed 之後是**免費方案**，而免費方案的額度改為
     * 全隊共用（產品決定 20260819）——因此用量要安排在**全隊**聚合上，
     * 不是逐成員那一支。安排錯邊的症狀是「以為擋住了、其實讀到 0」。
     */
    asMock(teamQuotaUsageRepo.sumTeamWindowUsageInTx).mockResolvedValue({
      used5h: BigInt(8),
      usedWeek: BigInt(8),
    });
    const result = await spendCredits(BASE_PARAMS);
    expect(result.quotaAmount).toBe("2");
    expect(teamQuotaUsageRepo.createUsageInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ amount: BigInt(2) }),
    );
  });

  it("wraps unexpected repository errors instead of leaking them", async () => {
    asMock(teamQuotaUsageRepo.sumWindowUsageInTx).mockRejectedValue(
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
    // Info: (20260814 - Luphia) 預設成員沒有鏈上點數，個別測試再覆寫
    asMock(readChainCredits).mockResolvedValue(BigInt(0));
    asMock(chargeChainCredits).mockResolvedValue({ charged: false });
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
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
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
    // Info: (20260814 - Luphia) 預設成員沒有鏈上點數，個別測試再覆寫
    asMock(readChainCredits).mockResolvedValue(BigInt(0));
    asMock(chargeChainCredits).mockResolvedValue({ charged: false });
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

  /**
   * Info: (20260815 - Luphia) 追補要記進**結算當下**的視窗（PR #6652 第二輪 C-7）。
   *
   * 匯入單章實測 87 秒、結構圖近 90 秒，跨過 5 小時視窗邊界是常態。
   * 沿用預扣時的視窗 key 等於把追補寫進一個已經過期的桶——`sumWindowUsage`
   * 只看當前視窗，那筆超額於是完全不影響後續額度，追補的防濫用作用歸零。
   */
  it("records the top-up in the window the settlement happens in", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(2),
      // Info: (20260815 - Luphia) 預扣落在上一個 5 小時視窗
      windowKey5h: getWindowKey5h(NOW_SEC),
      windowKeyWeek: getWindowKeyWeek(NOW_SEC),
    } as unknown);
    asMock(chargeChainCredits).mockResolvedValue({ charged: false });

    // Info: (20260815 - Luphia) 結算發生在 5 小時之後——已經是下一個視窗
    const settledAtSec = NOW_SEC + 5 * 60 * 60;

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(6),
      operatorUserId: "worker",
      nowSec: NOW_SEC,
      settledAtSec,
    });

    expect(result.toppedUp).toBe("4");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "topup:faith:msg-1",
        windowKey5h: getWindowKey5h(settledAtSec),
        windowKeyWeek: getWindowKeyWeek(settledAtSec),
      }),
    );
    // Info: (20260815 - Luphia) 確認真的換了視窗，否則這條測試等於沒測
    expect(getWindowKey5h(settledAtSec)).not.toBe(getWindowKey5h(NOW_SEC));
  });

  /**
   * Info: (20260818 - Luphia) 鏈上扣款目前一律不嘗試（第三輪）。
   *
   * 這條原本斷言「差額優先向成員的鏈上點數收取」並且**成功**——那從來沒發生過：
   * 合約沒有可由平台呼叫的 `burn(address, uint256)`，而 `receipt.status` 當時
   * 也沒被檢查，所以 revert 被回報成成功。測試綠是因為 `chargeChainCredits`
   * 被 mock 成 `{ charged: true }`，那是一個現實中不存在的回傳值。
   *
   * 現在放行側已經不把鏈上餘額算進 `available`，因此走到這裡的差額只會來自
   * 「額度封頂」那條路——而那條路的差額本來就該追補到訂閱額度（條款 §3.3）。
   */
  it("does not attempt a chain charge, and tops up the quota instead", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(2),
      windowKey5h: 1,
      windowKeyWeek: 1,
    } as unknown);

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(6),
      operatorUserId: "worker",
      nowSec: NOW_SEC,
    });

    expect(chargeChainCredits).not.toHaveBeenCalled();
    expect(result.chainCharged).toBeUndefined();
    // Info: (20260818 - Luphia) 差額追補到訂閱額度，該期額度呈現超用
    expect(result.toppedUp).toBe("4");
  });

  /**
   * Info: (20260814 - Luphia) 鏈上扣不到（餘額不足 / RPC 失敗）就退回追補訂閱額度：
   * 少收比服務中斷好，而追補是防濫用的關鍵——不記這筆，用戶就能靠「只剩 1 點」
   * 無限發長訊息。
   */
  it("falls back to topping up the quota when the chain charge fails", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(2),
      windowKey5h: 1,
      windowKeyWeek: 1,
    } as unknown);
    asMock(chargeChainCredits).mockResolvedValue({
      charged: false,
      reason: "insufficient",
    });

    const result = await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(6),
      operatorUserId: "worker",
      nowSec: NOW_SEC,
    });

    expect(result.toppedUp).toBe("4");
    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(4),
        idempotencyKey: "topup:faith:msg-1",
      }),
    );
  });

  /**
   * Info: (20260815 - Luphia) 退款與追補的方向相反（PR #6652 第二輪 C-7）：
   * 退款是把當初多扣的還回去，記在**原視窗**才能讓該視窗的 SUM 與實際用量一致。
   */
  it("keeps refunds in the window the hold was recorded in", async () => {
    asMock(teamQuotaUsageRepo.findByIdempotencyKey).mockResolvedValue({
      teamId: "team-1",
      userId: "user-1",
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      amount: BigInt(6),
      windowKey5h: 111,
      windowKeyWeek: 222,
    } as unknown);

    await settleSpend({
      idempotencyKey: "faith:msg-1",
      actualCost: BigInt(4),
      operatorUserId: "worker",
      nowSec: NOW_SEC,
      settledAtSec: NOW_SEC + 5 * 60 * 60,
    });

    expect(teamQuotaUsageRepo.createUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "settle:faith:msg-1",
        windowKey5h: 111,
        windowKeyWeek: 222,
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
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
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
    expect(teamQuotaUsageRepo.createUsageInTx).not.toHaveBeenCalled();
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
    // Info: (20260814 - Luphia) 預設成員沒有鏈上點數，個別測試再覆寫
    asMock(readChainCredits).mockResolvedValue(BigInt(0));
    asMock(chargeChainCredits).mockResolvedValue({ charged: false });
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
    /**
     * Info: (20260807 - Luphia) free per5h = 10：8 + 3 > 10 → 過期方案不得再享 team 額度。
     * Info: (20260819 - Luphia) 過期即免費方案，而免費方案的額度是全隊共用的，
     * 因此用量安排在全隊聚合上。
     */
    asMock(teamQuotaUsageRepo.sumTeamWindowUsageInTx).mockResolvedValue({
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
    expect(teamQuotaUsageRepo.createUsageInTx).toHaveBeenCalledWith(
      expect.anything(),
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
