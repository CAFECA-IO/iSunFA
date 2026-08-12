import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { runFaithBilledChat } from "@/services/faith_chat.service";
import {
  refundCredits,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";
import { DEFAULT_FAITH_BILLING } from "@/constants/llm";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { assertAccountBookMember } from "@/services/account_book_access.guard";
import type { ChatService } from "@/services/chat.service";

jest.mock("@/repositories/faith_billing_setting.repo", () => ({
  faithBillingSettingRepo: { resolveSetting: jest.fn() },
}));
jest.mock("@/services/spend.service", () => ({
  spendCredits: jest.fn(),
  refundCredits: jest.fn(),
  settleSpend: jest.fn(),
}));
jest.mock("@/services/account_book_access.guard", () => ({
  assertAccountBookMember: jest.fn(),
  mapServiceError: jest.fn(() => ({
    code: "NF000001",
    message: "Account book not found",
    status: 404,
  })),
}));

/**
 * Info: (20260808 - Luphia) 費思計費編排單測（設計書 §5.3）。
 * 覆蓋：預扣金額與冪等鍵、成功結算（以 usageMetadata 為準）、
 * LLM 失敗全額退還。ChatService 以注入替身隔離，spend 管線以模組 mock 隔離。
 *
 * Info: (20260812 - Luphia) 新增覆蓋「扣費團隊由帳本推導」（設計書 §5.3「使用前提」）：
 * 帳本驗權不通過即不得呼叫 LLM、不得扣點。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

// Info: (20260808 - Luphia) 2026-08-07 12:00 台北，同既有測試錨點
const NOW_SEC = 1786075200;

function makeChatStub(totalTokens: number, shouldFail = false) {
  return {
    generateFaithResponse: jest.fn(async () => {
      if (shouldFail) throw new Error("LLM exploded");
      return {
        text: "faith reply",
        usage: { inputTokens: 650, outputTokens: 2500, totalTokens },
      };
    }),
  } as unknown as ChatService;
}

const BASE_PARAMS = {
  userId: "user-1",
  accountBookId: "book-1",
  message: "x".repeat(1000),
  tags: [],
  clientMessageId: "msg-9",
  nowSec: NOW_SEC,
};

describe("runFaithBilledChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(assertAccountBookMember).mockResolvedValue({
      id: "book-1",
      teamId: "team-1",
    });
    asMock(spendCredits).mockResolvedValue({
      source: "SUBSCRIPTION_QUOTA",
      amount: "6",
      idempotencyKey: "faith:user-1:msg-9",
    });
    asMock(faithBillingSettingRepo.resolveSetting).mockResolvedValue(
      DEFAULT_FAITH_BILLING,
    );
    asMock(settleSpend).mockResolvedValue({
      settled: true,
      source: "SUBSCRIPTION_QUOTA",
      held: "6",
      charged: "4",
      refunded: "2",
    });
  });

  it("holds the worst-case credits with a deterministic idempotency key", async () => {
    await runFaithBilledChat(BASE_PARAMS, makeChatStub(3150));
    // Info: (20260808 - Luphia) 1000 字元：600 + 334 + 4096 = 5030 tokens → 預扣 6 點
    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        cost: BigInt(6),
        idempotencyKey: "faith:user-1:msg-9",
        nowSec: NOW_SEC,
      }),
    );
  });

  /**
   * Info: (20260812 - Luphia) 扣費團隊來自帳本（設計書 §5.3「使用前提」），
   * 不來自呼叫端參數——這是「計費主體不可由 client 自報」的實作面斷言。
   */
  it("bills the team that owns the account book", async () => {
    await runFaithBilledChat(BASE_PARAMS, makeChatStub(3150));
    expect(assertAccountBookMember).toHaveBeenCalledWith("book-1", "user-1");
    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-1" }),
    );
  });

  it("refuses to spend or call the LLM when the account book check fails", async () => {
    asMock(assertAccountBookMember).mockRejectedValue(
      new Error("NF_ACCOUNT_BOOK"),
    );
    const chatStub = makeChatStub(3150);

    await expect(runFaithBilledChat(BASE_PARAMS, chatStub)).rejects.toThrow(
      "Account book not found",
    );
    expect(spendCredits).not.toHaveBeenCalled();
    expect(chatStub.generateFaithResponse).not.toHaveBeenCalled();
  });

  it("settles by the SDK-reported total tokens and returns the billing detail", async () => {
    const result = await runFaithBilledChat(BASE_PARAMS, makeChatStub(3150));
    // Info: (20260808 - Luphia) 3150 tokens → 實耗 4 點（進位）
    expect(settleSpend).toHaveBeenCalledWith({
      idempotencyKey: "faith:user-1:msg-9",
      actualCost: BigInt(4),
      operatorUserId: "user-1",
    });
    expect(result.reply).toBe("faith reply");
    expect(result.billing).toMatchObject({
      held: "6",
      charged: "4",
      refunded: "2",
      totalTokens: 3150,
      tokensPerCredit: DEFAULT_FAITH_BILLING.tokensPerCredit,
    });
  });

  it("refunds the full hold and rethrows when the LLM call fails", async () => {
    await expect(
      runFaithBilledChat(BASE_PARAMS, makeChatStub(0, true)),
    ).rejects.toThrow("LLM exploded");
    expect(refundCredits).toHaveBeenCalledWith({
      idempotencyKey: "faith:user-1:msg-9",
      operatorUserId: "user-1",
    });
    expect(settleSpend).not.toHaveBeenCalled();
  });

  it("does not call the LLM at all when the hold is rejected", async () => {
    asMock(spendCredits).mockRejectedValue(new Error("quota exceeded"));
    const chatStub = makeChatStub(3150);
    await expect(runFaithBilledChat(BASE_PARAMS, chatStub)).rejects.toThrow(
      "quota exceeded",
    );
    expect(chatStub.generateFaithResponse).not.toHaveBeenCalled();
    expect(refundCredits).not.toHaveBeenCalled();
  });
});
