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
   * Info: (20260817 - Luphia) 任務短期記憶（第一輪 C-2）。
   *
   * 條款 §3.7 與方案頁都寫著「所有方案皆具備任務短期記憶」，
   * 而在此之前 `generateFaithResponse` 根本不收歷史參數，費思是 one-shot。
   */
  describe("short-term memory", () => {
    const HISTORY = [
      { role: "user" as const, content: "折舊怎麼算" },
      { role: "model" as const, content: "直線法" },
    ];

    it("passes the conversation history to the model", async () => {
      const chatStub = makeChatStub(3150);
      await runFaithBilledChat({ ...BASE_PARAMS, history: HISTORY }, chatStub);

      const args = asMock(chatStub.generateFaithResponse).mock.calls[0];
      expect(args[5]).toEqual(HISTORY);
    });

    /**
     * Info: (20260817 - Luphia) 注入的前文必須計入預扣：hold 一旦不是成本上界，
     * settleSpend 的「只退不補」就會變成系統默默吸收差額。
     */
    it("charges for the injected history", async () => {
      await runFaithBilledChat(
        // Info: (20260817 - Luphia) 3,000 字元前文 ≈ 1,000 tokens ≈ 多 1 點
        {
          ...BASE_PARAMS,
          history: [{ role: "user", content: "x".repeat(3000) }],
        },
        makeChatStub(3150),
      );

      expect(spendCredits).toHaveBeenCalledWith(
        expect.objectContaining({ cost: BigInt(7) }),
      );
    });

    /**
     * Info: (20260817 - Luphia) 歷史是呼叫端自報的，因此上界由 server 決定：
     * 送一份超長的歷史不該讓預扣跟著無限膨脹（也不該讓請求失敗）。
     */
    it("caps what an over-long history can cost", async () => {
      await runFaithBilledChat(
        {
          ...BASE_PARAMS,
          history: Array.from({ length: 50 }, () => ({
            role: "user" as const,
            content: "y".repeat(1000),
          })),
        },
        makeChatStub(3150),
      );

      /**
       * Info: (20260817 - Luphia) 50,000 字元的歷史若照單全收約 16,667 tokens，
       * 預扣會膨脹到 22 點；截到上界 4,000 字元（1,334 tokens）後是 7 點。
       */
      expect(spendCredits).toHaveBeenCalledWith(
        expect.objectContaining({ cost: BigInt(7) }),
      );
    });

    it("still works with no history at all", async () => {
      const chatStub = makeChatStub(3150);
      await runFaithBilledChat(BASE_PARAMS, chatStub);

      expect(asMock(chatStub.generateFaithResponse).mock.calls[0][5]).toEqual(
        [],
      );
      expect(spendCredits).toHaveBeenCalledWith(
        expect.objectContaining({ cost: BigInt(6) }),
      );
    });
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
    /**
     * Info: (20260813 - Luphia) nowSec 與 context 為追補差額所需（設計書 §5.4）：
     * 純錢包預扣沒有額度用量列可沿用視窗與 teamId，缺這兩者就記不了封頂造成的差額。
     */
    expect(settleSpend).toHaveBeenCalledWith({
      idempotencyKey: "faith:user-1:msg-9",
      actualCost: BigInt(4),
      operatorUserId: "user-1",
      nowSec: NOW_SEC,
      /**
       * Info: (20260815 - Luphia) 追補要記進結算當下的視窗（PR #6652 第二輪 C-7），
       * 因此結算時間另外注入；長訊息跨過 5 小時邊界時，寫回請求開始的視窗
       * 等於寫進一個已經過期的桶。
       */
      settledAtSec: expect.any(Number),
      context: {
        teamId: "team-1",
        userId: "user-1",
        featureCode: "FAITH_CHAT",
      },
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
