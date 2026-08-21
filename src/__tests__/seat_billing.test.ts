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
 *
 * Info: (20260821 - Luphia) 分母改為**一個計費週期**（`periodDays`），不再是
 * `periodEnd − periodStart`（review #6687 二輪高-1）：展延讓跨距可能是好幾期，
 * 用跨距當分母會把補收金額除以期數——疊兩期就只收一半。
 */

const DAY = 86_400_000;
const PERIOD_START = Date.UTC(2026, 7, 1);
const PERIOD_END = PERIOD_START + 30 * DAY;

function prorate(
  overrides: Partial<Parameters<typeof resolveSeatProration>[0]>,
) {
  return resolveSeatProration({
    unitPrice: 840,
    nowMs: PERIOD_START,
    periodStartMs: PERIOD_START,
    periodEndMs: PERIOD_END,
    periodDays: 30,
    ...overrides,
  });
}

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
    expect(prorate({})).toBe(840);
  });

  it("charges half a period at the midpoint", () => {
    expect(prorate({ nowMs: PERIOD_START + 15 * DAY })).toBe(420);
  });

  /**
   * Info: (20260814 - Luphia) 這條要能分辨 floor 與 round（PR #6652 第二輪 B-5 #3）：
   * 原本 10 條斷言的小數部分沒有一條 ≥ 0.5，把 `.floor()` 改成 `.round()` 依然全綠，
   * 它只擋得住 `.ceil()`。2941 × 15/30 = 1470.5 是那個分界點。
   */
  it("rounds down at the .5 boundary instead of rounding to nearest", () => {
    expect(prorate({ unitPrice: 2941, nowMs: PERIOD_START + 15 * DAY })).toBe(
      1470,
    );
  });

  it("rounds down so the remainder goes to the customer", () => {
    // Info: (20260814 - Luphia) 840 × 7/30 = 196
    expect(prorate({ nowMs: PERIOD_START + 23 * DAY })).toBe(196);
    // Info: (20260814 - Luphia) 除不盡的情況：2941 × 1/30 = 98.03…，取 98
    expect(prorate({ unitPrice: 2941, nowMs: PERIOD_START + 29 * DAY })).toBe(
      98,
    );
  });

  it("multiplies by the number of seats added at once", () => {
    expect(prorate({ nowMs: PERIOD_START + 15 * DAY, seats: 3 })).toBe(1260);
  });

  /**
   * Info: (20260821 - Luphia) 展延後的跨距（review #6687 二輪高-1 的正面案例）：
   * 期間 0→60 天（提早續購疊了一期）、月繳 840。第 21 天加一席，
   * 剩餘 39 天 = 1.3 期 → 該收 840 × 39/30 = 1092。
   * 舊算式用跨距當分母會算出 840 × 39/60 = 546——恰好一半。
   */
  it("charges more than one unit price when the remaining span exceeds one period", () => {
    expect(
      prorate({
        periodEndMs: PERIOD_START + 60 * DAY,
        nowMs: PERIOD_START + 21 * DAY,
      }),
    ).toBe(1092);
  });

  // Info: (20260821 - Luphia) 年繳的分母是 365 天，不是跨距也不是 30 天
  it("uses the yearly interval as the denominator for yearly plans", () => {
    expect(
      prorate({
        unitPrice: 8400,
        periodEndMs: PERIOD_START + 365 * DAY,
        nowMs: PERIOD_START + 292 * DAY,
        periodDays: 365,
      }),
    ).toBe(1680); // Info: (20260821 - Luphia) 8400 × 73/365 = 1680
  });

  /**
   * Info: (20260814 - Luphia) 期末之後加人不補收：這一期他一天都沒用到。
   * 下一次續訂會依當下人數重算，不會漏掉他。
   */
  it("charges nothing once the period has ended", () => {
    expect(prorate({ nowMs: PERIOD_END })).toBe(0);
    expect(prorate({ nowMs: PERIOD_END + DAY })).toBe(0);
  });

  it("charges nothing for a free plan or a zero-seat change", () => {
    expect(prorate({ unitPrice: 0 })).toBe(0);
    expect(prorate({ seats: 0 })).toBe(0);
  });

  /**
   * Info: (20260814 - Luphia) 髒資料一律回 0：寧可少收一次，
   * 也不要對用戶的卡扣一筆算不出根據的錢。
   */
  it("charges nothing when the period is inverted, empty, or the interval is invalid", () => {
    expect(
      prorate({ periodStartMs: PERIOD_END, periodEndMs: PERIOD_START }),
    ).toBe(0);
    expect(prorate({ periodEndMs: PERIOD_START })).toBe(0);
    expect(prorate({ periodDays: 0 })).toBe(0);
    expect(prorate({ periodDays: -30 })).toBe(0);
  });

  // Info: (20260814 - Luphia) now 早於期初（時鐘偏移）不該放大成超過跨距的金額
  it("clamps the billable time to the period span on clock skew", () => {
    expect(prorate({ nowMs: PERIOD_START - 10 * DAY })).toBe(840);
  });
});
