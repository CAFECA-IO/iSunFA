import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { runBilledCarbonTask } from "@/services/carbon_billing.service";
import {
  refundCredits,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { assertAccountBookMember } from "@/services/account_book_access.guard";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { DEFAULT_FAITH_BILLING } from "@/constants/llm";
import { recordLlmUsage } from "@/lib/llm/usage_scope";
import { ensurePersonalCreditCharge } from "@/services/personal_credit.service";

jest.mock("@/repositories/faith_billing_setting.repo", () => ({
  faithBillingSettingRepo: { resolveSetting: jest.fn() },
}));
jest.mock("@/repositories/chatroom.repo", () => ({
  chatroomRepo: { findAccountBookIdByChannel: jest.fn() },
}));
jest.mock("@/services/spend.service", () => ({
  spendCredits: jest.fn(),
  refundCredits: jest.fn(),
  settleSpend: jest.fn(),
}));
jest.mock("@/services/personal_credit.service", () => {
  // Info: (20260813 - Luphia) 替身需與真實簽名一致：(errorDef, data)
  class FakePersonalPaymentRequiredError extends Error {
    public data: { orderId: string; cost: number };
    public code: string;
    constructor(
      def: { code: string; message: string },
      data: { orderId: string; cost: number },
    ) {
      super(def.message);
      this.code = def.code;
      this.data = data;
    }
  }
  return {
    ensurePersonalCreditCharge: jest.fn(),
    PersonalPaymentRequiredError: FakePersonalPaymentRequiredError,
  };
});
jest.mock("@/services/account_book_access.guard", () => ({
  assertAccountBookMember: jest.fn(),
  mapServiceError: jest.fn(() => ({
    code: "NF000001",
    message: "Account book not found",
    status: 404,
  })),
}));

/**
 * Info: (20260813 - Luphia) 碳盤查計費編排單測（設計書 §5.5）。
 * 重點：額度不足時不得呼叫 LLM、工作失敗要全額退還、無帳本的舊會話放行但不計費。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;
const NOW_SEC = 1786075200;

const BASE_PARAMS = {
  userId: "user-1",
  channel: "carbon-chat-0xabc-1",
  idempotencyKey: "carbon-chat:user-1:msg-1",
  inputChars: 300,
  hasAttachment: false,
  nowSec: NOW_SEC,
};

describe("runBilledCarbonTask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(chatroomRepo.findAccountBookIdByChannel).mockResolvedValue("book-1");
    asMock(assertAccountBookMember).mockResolvedValue({
      id: "book-1",
      teamId: "team-1",
    });
    asMock(faithBillingSettingRepo.resolveSetting).mockResolvedValue(
      DEFAULT_FAITH_BILLING,
    );
    asMock(spendCredits).mockResolvedValue({
      source: "SUBSCRIPTION_QUOTA",
      amount: "5",
      quotaAmount: "5",
      allocationAmount: "0",
      idempotencyKey: BASE_PARAMS.idempotencyKey,
    });
    asMock(settleSpend).mockResolvedValue({
      settled: true,
      source: "SUBSCRIPTION_QUOTA",
      held: "5",
      charged: "3",
      refunded: "2",
      toppedUp: "0",
    });
  });

  /**
   * Info: (20260813 - Luphia) 用量來自捕捉範圍（設計書 §5.5）：`run` 內每一次 LLM 呼叫
   * 都會經 invokeGuarded 回報，此處以 recordLlmUsage 模擬兩次呼叫的 fan-out。
   */
  it("bills the team that owns the session's account book", async () => {
    const run = jest.fn(async () => {
      recordLlmUsage({
        inputTokens: 800,
        outputTokens: 700,
        totalTokens: 1500,
      });
      recordLlmUsage({
        inputTokens: 400,
        outputTokens: 600,
        totalTokens: 1000,
      });
      return { reply: "hi" };
    });

    const outcome = await runBilledCarbonTask({ ...BASE_PARAMS, run });

    expect(assertAccountBookMember).toHaveBeenCalledWith("book-1", "user-1");
    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        featureCode: "CARBON_CHAT",
        idempotencyKey: BASE_PARAMS.idempotencyKey,
      }),
    );
    // Info: (20260813 - Luphia) 2500 tokens → 實耗 3 點（1,000 tokens = 1 點，無條件進位）
    expect(settleSpend).toHaveBeenCalledWith(
      expect.objectContaining({ actualCost: BigInt(3) }),
    );
    expect(outcome.result).toEqual({ reply: "hi" });
    // Info: (20260813 - Luphia) 兩次呼叫的 tokens 相加，且呼叫次數可觀測（匯入可達十餘次）
    expect(outcome.billing.totalTokens).toBe(2500);
    expect(outcome.billing.llmCallCount).toBe(2);
  });

  /**
   * Info: (20260813 - Luphia) 計費的重點是「先確定付得起再花錢」：
   * 預扣失敗（402）時 LLM 不得被呼叫，否則等於免費送出一次昂貴的呼叫。
   */
  it("never runs the task when the hold is rejected", async () => {
    asMock(spendCredits).mockRejectedValue(new Error("quota exceeded"));
    const run = jest.fn(async () => ({
      result: { reply: "hi" },
      usage: null,
    }));

    await expect(runBilledCarbonTask({ ...BASE_PARAMS, run })).rejects.toThrow(
      "quota exceeded",
    );
    expect(run).not.toHaveBeenCalled();
    expect(settleSpend).not.toHaveBeenCalled();
  });

  it("refunds the full hold when the task fails", async () => {
    const run = jest.fn(async (): Promise<{ reply: string }> => {
      throw new Error("LLM exploded");
    });

    await expect(runBilledCarbonTask({ ...BASE_PARAMS, run })).rejects.toThrow(
      "LLM exploded",
    );
    expect(refundCredits).toHaveBeenCalledWith({
      idempotencyKey: BASE_PARAMS.idempotencyKey,
      operatorUserId: "user-1",
    });
    expect(settleSpend).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) SDK 未回報用量時收斂為最低 1 點：寧可少收，
   * 也不憑空推估——推估出來的數字在點數歷程裡無法查證。
   */
  it("settles at the minimum when the SDK reports no usage", async () => {
    const run = jest.fn(async () => ({ reply: "hi" }));

    await runBilledCarbonTask({ ...BASE_PARAMS, run });

    expect(settleSpend).toHaveBeenCalledWith(
      expect.objectContaining({ actualCost: BigInt(1) }),
    );
  });

  /**
   * Info: (20260813 - Luphia) 無帳本會話改扣個人鏈上點數（產品拍板 20260813）。
   * 個人點數扣款需簽章，故先建單並以 402 回 orderId；**款未付訖前不得執行工作**，
   * 反過來做等於允許賴帳，而鏈上扣不到就沒有強制力。
   */
  it("asks for personal credit payment when the session has no account book", async () => {
    asMock(chatroomRepo.findAccountBookIdByChannel).mockResolvedValue(null);
    asMock(ensurePersonalCreditCharge).mockResolvedValue({
      paid: false,
      orderId: "order-1",
      cost: 6,
    });
    const run = jest.fn(async () => ({ reply: "hi" }));

    await expect(
      runBilledCarbonTask({ ...BASE_PARAMS, run }),
    ).rejects.toMatchObject({ data: { orderId: "order-1", cost: 6 } });
    expect(run).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260813 - Luphia) 付訖後（用戶簽章完成、重送同一則訊息）才執行，
   * 且不走團隊額度管線——個人點數路徑以估算一次收足，不做預扣結算
   * （鏈上退差額要再一筆交易與簽章，成本高於差額本身）。
   */
  it("runs on personal credits once the order is paid", async () => {
    asMock(chatroomRepo.findAccountBookIdByChannel).mockResolvedValue(null);
    asMock(ensurePersonalCreditCharge).mockResolvedValue({
      paid: true,
      orderId: "order-1",
      cost: 6,
    });
    const run = jest.fn(async () => {
      recordLlmUsage({ totalTokens: 2500 });
      return { reply: "hi" };
    });

    const outcome = await runBilledCarbonTask({ ...BASE_PARAMS, run });

    expect(outcome.result).toEqual({ reply: "hi" });
    expect(outcome.billing.paidBy).toBe("PERSONAL");
    expect(outcome.billing.charged).toBe("6");
    expect(spendCredits).not.toHaveBeenCalled();
    expect(settleSpend).not.toHaveBeenCalled();
  });
});
