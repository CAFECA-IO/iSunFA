import { describe, it, expect } from "@jest/globals";
import {
  resolveSeatProration,
  resolveSubscriptionAmount,
} from "@/lib/billing/seat_billing";

/**
 * Info: (20260814 - Luphia) 席次計費數學（規範 P2–P3）。
 *
 * 這裡算錯不會噴錯，只會多收或少收——沒有人會來回報「我這個月被多扣了 3 元」，
 * 但那筆錢確實從別人的卡上扣走了。因此邊界（期末最後一天、期間異常、席次為 0）
 * 全部釘死。
 */

const DAY = 86_400_000;
const PERIOD_START = Date.UTC(2026, 7, 1);
const PERIOD_END = PERIOD_START + 30 * DAY;

describe("subscription amount", () => {
  it("multiplies the unit price by the seat count", () => {
    expect(resolveSubscriptionAmount(840, 5)).toBe(4200);
  });

  // Info: (20260814 - Luphia) 團隊再小也有擁有者本人，0 席不是合法狀態
  it("never charges fewer than one seat", () => {
    expect(resolveSubscriptionAmount(840, 0)).toBe(840);
    expect(resolveSubscriptionAmount(840, -3)).toBe(840);
  });

  it("keeps the free plan free at any size", () => {
    expect(resolveSubscriptionAmount(0, 42)).toBe(0);
  });
});

describe("seat proration", () => {
  it("charges the full unit price when the period just started", () => {
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(840);
  });

  it("charges half a period at the midpoint", () => {
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START + 15 * DAY,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(420);
  });

  it("rounds down so the remainder goes to the customer", () => {
    // Info: (20260814 - Luphia) 840 × 10/30 = 280；840 × 1/30 = 28；取 7 天 = 196
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START + 23 * DAY,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(196);
    // Info: (20260814 - Luphia) 除不盡的情況：2940 × 1/30 = 98，落在 29 天後剩 1 天
    expect(
      resolveSeatProration({
        unitPrice: 2941,
        nowMs: PERIOD_START + 29 * DAY,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(98);
  });

  it("multiplies by the number of seats added at once", () => {
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START + 15 * DAY,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        seats: 3,
      }),
    ).toBe(1260);
  });

  /**
   * Info: (20260814 - Luphia) 期末之後加人不補收：這一期他一天都沒用到。
   * 下一次續訂會依當下人數重算，不會漏掉他。
   */
  it("charges nothing once the period has ended", () => {
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_END,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(0);
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_END + DAY,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(0);
  });

  it("charges nothing for a free plan or a zero-seat change", () => {
    expect(
      resolveSeatProration({
        unitPrice: 0,
        nowMs: PERIOD_START,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(0);
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        seats: 0,
      }),
    ).toBe(0);
  });

  /**
   * Info: (20260814 - Luphia) 髒資料一律回 0：寧可少收一次，
   * 也不要對用戶的卡扣一筆算不出根據的錢。
   */
  it("charges nothing when the period is inverted or empty", () => {
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START,
        periodStartMs: PERIOD_END,
        periodEndMs: PERIOD_START,
      }),
    ).toBe(0);
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_START,
      }),
    ).toBe(0);
  });

  // Info: (20260814 - Luphia) now 早於期初（時鐘偏移）不該放大成超過整期的金額
  it("never charges more than one full period", () => {
    expect(
      resolveSeatProration({
        unitPrice: 840,
        nowMs: PERIOD_START - 10 * DAY,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
      }),
    ).toBe(840);
  });
});
