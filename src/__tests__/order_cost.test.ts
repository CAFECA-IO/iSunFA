import { describe, it, expect } from "@jest/globals";
import { resolveOrderSpendCost } from "@/lib/order/order_cost";

/**
 * Info: (20260813 - Luphia) 訂單金額 → 扣款金額（設計書 §5）。
 *
 * 這條轉換漏掉時，團隊額度付款會直接回 TW000007「Spend amount must be a
 * positive integer」——訂單以有號數記帳，消費是負值，而扣費管線只收正整數。
 * 上線首日就撞到，因此用測試把邊界釘住。
 */
describe("resolveOrderSpendCost", () => {
  it("flips a consumption order's negative amount into a positive cost", () => {
    // Info: (20260813 - Luphia) 物流碳足跡一次 5 點，訂單記為 -5
    expect(resolveOrderSpendCost(BigInt(-5))).toBe(BigInt(5));
    expect(resolveOrderSpendCost(BigInt(-500))).toBe(BigInt(500));
  });

  it("accepts a positive amount as-is", () => {
    // Info: (20260813 - Luphia) 不硬性要求負值：資料慣例改變時不該變成無法解釋的失敗
    expect(resolveOrderSpendCost(BigInt(5))).toBe(BigInt(5));
  });

  it("rejects a zero-amount order instead of spending nothing", () => {
    expect(() => resolveOrderSpendCost(BigInt(0))).toThrow();
    try {
      resolveOrderSpendCost(BigInt(0));
    } catch (error) {
      expect(error).toMatchObject({ code: "TW000007" });
    }
  });
});
