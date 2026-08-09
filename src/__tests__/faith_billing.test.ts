import { describe, expect, it } from "@jest/globals";
import {
  estimateFaithHoldCredits,
  settleFaithCredits,
} from "@/lib/faith_billing";
import {
  DEFAULT_FAITH_BILLING,
  FAITH_PROMPT_OVERHEAD_TOKENS,
} from "@/constants/llm";

// Info: (20260809 - Luphia) 計費設定改由 DB 提供，純函式以注入方式取得；測試用預設值
const BILLING = DEFAULT_FAITH_BILLING;

/**
 * Info: (20260807 - Luphia) 費思計費純函式單測（設計書 §5.3、P3 驗收）。
 * 核心不變量：settle ≤ hold（只退不補）、無條件進位、每輪最低 1 點、
 * usageMetadata 異常時收最低 1 點（零捏造：不憑空放大）。
 */

describe("estimateFaithHoldCredits", () => {
  it("covers prompt overhead + message + max output as the worst case", () => {
    // Info: (20260807 - Luphia) 1000 字元 ÷ 3 = 334，600 + 334 + 4096 = 5030 → 6 點
    expect(estimateFaithHoldCredits(1000, false, BILLING)).toBe(BigInt(6));
  });

  it("adds the image estimate when an attachment is present", () => {
    // Info: (20260807 - Luphia) 5030 + 2000 = 7030 → 8 點
    expect(estimateFaithHoldCredits(1000, true, BILLING)).toBe(BigInt(8));
  });

  it("never goes below one credit", () => {
    expect(estimateFaithHoldCredits(0, false, BILLING) >= BigInt(1)).toBe(true);
  });

  it("hold always covers the settle of the worst realizable usage", () => {
    const messageLength = 5000;
    const hold = estimateFaithHoldCredits(messageLength, true, BILLING);
    // Info: (20260807 - Luphia) 實際 token 上界 = 輸入估算 + maxOutputTokens（thinking 共用額度）
    const worstTokens =
      FAITH_PROMPT_OVERHEAD_TOKENS +
      Math.ceil(messageLength / 3) +
      2000 +
      BILLING.maxOutputTokens;
    const settle = settleFaithCredits(worstTokens, BILLING);
    expect(settle <= hold).toBe(true);
  });
});

describe("settleFaithCredits", () => {
  it("rounds up by the tokens-per-credit rate", () => {
    expect(settleFaithCredits(BILLING.tokensPerCredit, BILLING)).toBe(
      BigInt(1),
    );
    expect(settleFaithCredits(BILLING.tokensPerCredit + 1, BILLING)).toBe(
      BigInt(2),
    );
    expect(settleFaithCredits(3150, BILLING)).toBe(BigInt(4));
  });

  it("charges the minimum of one credit per turn", () => {
    expect(settleFaithCredits(0, BILLING)).toBe(BigInt(1));
    expect(settleFaithCredits(1, BILLING)).toBe(BigInt(1));
  });

  it("falls back to one credit when usage metadata is invalid", () => {
    expect(settleFaithCredits(Number.NaN, BILLING)).toBe(BigInt(1));
    expect(settleFaithCredits(-5, BILLING)).toBe(BigInt(1));
  });
});
