import { describe, it, expect } from "@jest/globals";
import { parsePositiveInt } from "@/lib/utils/pagination";

/**
 * Info: (20260815 - Luphia) 分頁參數解析（PR #6652 第二輪 C-8）。
 *
 * 原本的 `Math.max(parseInt(raw ?? "20", 10), 1)` 對 `?limit=abc` 回 `NaN`，
 * 而 `Math.max(NaN, 1)` 仍是 `NaN`——`take: NaN` 交給 Prisma 就是一個 500。
 * 使用者打錯一個字元不該讓端點爆炸。
 */

describe("parsePositiveInt", () => {
  it("takes a valid number within range", () => {
    expect(parsePositiveInt("50", { fallback: 20, max: 100 })).toBe(50);
  });

  // Info: (20260815 - Luphia) 這一條就是 C-8：非數字不得變成 NaN
  it("falls back instead of producing NaN for non-numeric input", () => {
    expect(parsePositiveInt("abc", { fallback: 20, max: 100 })).toBe(20);
    expect(parsePositiveInt("", { fallback: 20, max: 100 })).toBe(20);
    expect(parsePositiveInt(null, { fallback: 20, max: 100 })).toBe(20);
  });

  /**
   * Info: (20260815 - Luphia) `"12abc"` 會被 parseInt 讀成 12，但那多半代表呼叫端
   * 搞錯了格式——悄悄採用一半的值比退回預設值更難查。
   */
  it("rejects partially numeric input rather than silently truncating", () => {
    expect(parsePositiveInt("12abc", { fallback: 20, max: 100 })).toBe(20);
  });

  it("clamps to the allowed range", () => {
    expect(parsePositiveInt("500", { fallback: 20, max: 100 })).toBe(100);
    expect(parsePositiveInt("0", { fallback: 20, min: 1, max: 100 })).toBe(20);
  });

  // Info: (20260815 - Luphia) 負數與小數都不是合法的頁數／筆數
  it("rejects negatives and decimals", () => {
    expect(parsePositiveInt("-5", { fallback: 20, max: 100 })).toBe(20);
    expect(parsePositiveInt("1.5", { fallback: 20, max: 100 })).toBe(20);
  });

  // Info: (20260815 - Luphia) 超過安全整數範圍的輸入不該被當成有效筆數
  it("rejects values beyond the safe integer range", () => {
    expect(
      parsePositiveInt("99999999999999999999", { fallback: 20, max: 100 }),
    ).toBe(20);
  });
});
