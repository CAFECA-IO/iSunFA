import { describe, it, expect } from "@jest/globals";
import {
  LEAVE_ENTITLEMENT_ENGINE_VERSION,
  ceilToScale,
  monthsBetween,
  resolveTierDays,
} from "@/lib/leave_entitlement_rules";
import { ANNUAL_LEAVE_TIER_SEED } from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) T1：特別休假年資級距（勞動基準法 §38 I）。
 *
 * 驗收方式是**窮舉級距邊界**而不是抽樣：這張表的每一個交界都對應
 * 「差一天就差三日特休」的分野，而那幾日最終會折算成工資。
 * 級距內容本身是 seed 資料（ADR 021 §2.2），這裡驗的是查表規則。
 */
describe("resolveTierDays — 勞基法 §38 I 年資級距", () => {
  const tiers = ANNUAL_LEAVE_TIER_SEED;

  it.each([
    ["未滿六個月", 0, 0],
    ["滿五個月又不足一天", 5, 0],
    ["滿六個月當日", 6, 3],
    ["六個月以上一年未滿的上界", 11, 3],
    ["滿一年", 12, 7],
    ["一年以上二年未滿的上界", 23, 7],
    ["滿二年", 24, 10],
    ["滿三年", 36, 14],
    ["三年以上五年未滿的上界", 59, 14],
    ["滿五年", 60, 15],
    ["五年以上十年未滿的上界", 119, 15],
    ["滿十年", 120, 16],
  ])("%s（%i 個月）給 %i 日", (_label, months, expected) => {
    expect(resolveTierDays(tiers, months)).toBe(expected);
  });

  /**
   * Info: (20260817 - Julian) 「十年以上者，每一年加給一日，加至三十日為止」——
   * 用 incrementDaysPerYear + maxDays 兩個欄位表達，不為它列 20 列。
   */
  it("滿十一年加一日", () => {
    expect(resolveTierDays(tiers, 132)).toBe(17);
  });

  it("滿二十四年恰好觸及三十日上限", () => {
    expect(resolveTierDays(tiers, 24 * 12)).toBe(30);
  });

  it("滿二十五年仍為三十日（封頂後不再增加）", () => {
    expect(resolveTierDays(tiers, 25 * 12)).toBe(30);
  });

  it("滿四十年仍為三十日", () => {
    expect(resolveTierDays(tiers, 40 * 12)).toBe(30);
  });
});

/**
 * Info: (20260817 - Julian) 年資月數的計算。用整月比對而非「天數 ÷ 30.4」——
 * 級距的邊界是「滿六個月」「滿一年」，近似值會在邊界前後差一兩天，
 * 而那一兩天決定了 3 日還是 7 日。
 */
describe("monthsBetween — 年資月數", () => {
  it("到職滿六個月當日為 6，前一日為 5", () => {
    expect(monthsBetween("2026-01-01", "2026-07-01")).toBe(6);
    expect(monthsBetween("2026-01-01", "2026-06-30")).toBe(5);
  });

  it("月底到職不會因為次月天數較少而少算", () => {
    // Info: (20260817 - Julian) 1/31 的一個月後是 2/28，不是 3/3
    expect(monthsBetween("2026-01-31", "2026-02-28")).toBe(0);
    expect(monthsBetween("2026-01-31", "2026-03-01")).toBe(1);
  });

  it("跨年正確", () => {
    expect(monthsBetween("2026-03-15", "2028-03-15")).toBe(24);
    expect(monthsBetween("2026-03-15", "2028-03-14")).toBe(23);
  });
});

/**
 * Info: (20260817 - Julian) 比例給假的捨入方向固定為無條件進位 —— 餘數不該由勞工承擔。
 * 特別驗 `1.005` 這類會被浮點表示誤差咬到的值。
 */
describe("ceilToScale — 比例給假的捨入", () => {
  it("無條件進位至指定小數位", () => {
    expect(ceilToScale(1.51232, 1)).toBe(1.6);
    expect(ceilToScale(6.35342, 1)).toBe(6.4);
    expect(ceilToScale(1.0027, 1)).toBe(1.1);
  });

  it("已經是整數位時不會多進一位", () => {
    expect(ceilToScale(7, 1)).toBe(7);
    expect(ceilToScale(1.5, 1)).toBe(1.5);
  });

  it("不因浮點表示誤差多給一個單位", () => {
    // Info: (20260817 - Julian) 0.1 + 0.2 在 IEEE 754 下是 0.30000000000000004
    expect(ceilToScale(0.1 + 0.2, 1)).toBe(0.3);
  });
});

describe("引擎版本", () => {
  it("有明確的版本號供結果回填", () => {
    expect(LEAVE_ENTITLEMENT_ENGINE_VERSION).toBe(1);
  });
});
