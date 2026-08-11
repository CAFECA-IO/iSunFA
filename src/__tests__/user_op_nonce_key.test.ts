import { describe, it, expect } from "@jest/globals";
import { deriveNonceKey } from "@/lib/utils/user_op_builder";

/**
 * Info: (20260811 - Luphia) 這組測試守的是「已簽出的付款授權必須互斥」。
 *
 * ERC-4337 v0.6 的 UserOperation 沒有 validUntil / validAfter，`paymasterAndData` 也是空的，
 * 所以一份簽出來的 UserOp 沒有任何時間邊界——它一直有效，直到它佔的 nonce 槽被用掉。
 * 唯一能限制它的東西就是 nonce。
 *
 * 舊版每次用隨機 key，於是同一張訂單的每份簽章各佔一個獨立的槽，互不作廢也不過期：
 * 偷到一枚 DeWT 的人可以批次囤簽章，而登出、撤銷 DeWT、訂單標記已付都無法讓它們失效，
 * 因為鏈上從不查我們的資料庫。
 *
 * 由 orderId 推導之後，同一張訂單的簽章共用一個槽，第一份上鏈就讓其餘永久失效。
 * 這個性質是無聲的：壞掉的時候付款照樣成功，只有安全性默默消失，所以必須有測試釘住。
 */

const ORDER_A = "3f1b9c7e-0000-4000-8000-000000000001";
const ORDER_B = "3f1b9c7e-0000-4000-8000-000000000002";

describe("deriveNonceKey", () => {
  it("同一張訂單永遠得到同一個 key（授權因此互斥）", () => {
    expect(deriveNonceKey(ORDER_A)).toBe(deriveNonceKey(ORDER_A));
  });

  /**
   * Info: (20260811 - Luphia) 決定性是重點所在。
   * 舊版用 `Date.now() * Math.random()`，連續兩次呼叫幾乎不可能相同——
   * 這條測試正是舊實作必然失敗的地方。
   */
  it("不含任何隨機或時間成分", () => {
    const samples = Array.from({ length: 8 }, () => deriveNonceKey(ORDER_A));
    expect(new Set(samples).size).toBe(1);
  });

  // Info: (20260811 - Luphia) 不同訂單必須落在不同槽，否則併發付款會互相卡住
  it("不同訂單得到不同 key", () => {
    expect(deriveNonceKey(ORDER_A)).not.toBe(deriveNonceKey(ORDER_B));
  });

  /**
   * Info: (20260811 - Luphia) key 必須塞得進 uint192。
   * 溢出的話 viem 會在 encode 階段拋錯，症狀是所有付款都失敗——
   * 而 keccak256 的輸出是 256 bits，少了遮罩就一定會超出。
   */
  it("key 落在 uint192 範圍內", () => {
    const limit = 1n << 192n;
    for (const orderId of [ORDER_A, ORDER_B, "x", "0".repeat(200)]) {
      const key = deriveNonceKey(orderId);
      expect(key).toBeGreaterThanOrEqual(0n);
      expect(key).toBeLessThan(limit);
    }
  });

  /**
   * Info: (20260811 - Luphia) 打包後仍須符合 (key << 64) | seq 的版面。
   * 這是 UserOp.nonce 的實際格式，key 佔高 192 bits、seq 佔低 64 bits。
   */
  it("打包成 nonce 後 key 落在高 192 bits", () => {
    const key = deriveNonceKey(ORDER_A);
    const packed = (key << 64n) | 5n;

    expect(packed >> 64n).toBe(key);
    expect(packed & ((1n << 64n) - 1n)).toBe(5n);
  });

  // Info: (20260811 - Luphia) 沒有 orderId 時退回標準的循序空間（key 0），不是隨機值
  it("未提供 orderId 時回 0", () => {
    expect(deriveNonceKey()).toBe(0n);
    expect(deriveNonceKey("")).toBe(0n);
  });
});
