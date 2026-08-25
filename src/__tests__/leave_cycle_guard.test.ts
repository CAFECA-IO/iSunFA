import { describe, it, expect } from "@jest/globals";
import { compareCycleBasisEntitlement } from "@/lib/leave_entitlement_rules";
import {
  ANNUAL_LEAVE_TIER_SEED,
  LeaveAccrualMethod,
} from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) T3：曆年制「不得低於週年制」的護欄（ADR 021 §3.1）。
 *
 * 曆年制是雇主為了行政方便而選的制度，這個方便不能由勞工買單。
 * 比較的方式是**年資年度 × 重疊比例歸屬**：兩制的給假時點不同
 * （週年制在週年日、曆年制在 1/1），直接比累計總數會在不同日子得到不同結論，
 * 那不是護欄而是擲骰子。以同一把尺歸屬後，剩下的才是真正的多寡差異。
 */

const basePolicy = {
  accrualMethod: LeaveAccrualMethod.SENIORITY_TIER,
  annualDays: null,
  tiers: ANNUAL_LEAVE_TIER_SEED,
  carryForwardMonths: 12,
  proratedRoundingScale: 1,
};

describe("compareCycleBasisEntitlement", () => {
  it("尚無完整年資年度時不做判斷", () => {
    const result = compareCycleBasisEntitlement({
      hireDate: "2026-01-01",
      asOfDate: "2026-08-01",
      policy: basePolicy,
      dayEquivalentMinutes: 480,
    });
    expect(result.employmentYearIndex).toBe(-1);
    expect(result.calendarIsAtLeastAnniversary).toBe(true);
  });

  /**
   * Info: (20260817 - Julian) **這是一個刻意記錄現況的測試，不是慶祝一個正確的結果。**
   *
   * 計畫書 §6.3 的比例公式（曆年制首年按「該年剩餘天數占比」給假）在第一個
   * 年資年度就低於週年制：一個 3/1 到職的人，週年制在 9/1 拿到法定的 3 日，
   * 曆年制卻只拿到 3 × 122/365 ≈ 1.1 日。
   *
   * 這代表**公式的方向錯了** —— 曆年制的實務作法是「把未來的年資額度提前給」，
   * 不是「把當期的法定額度按比例砍掉」。護欄在這裡確實發揮了它的作用：
   * 它擋下的不是一組壞資料，是一條寫錯的規則。
   *
   * ToDo: (20260817 - Julian) 比例公式待法務確認後修正（計畫書 §3.2、§17 缺口 9）。
   * 修正後本測試的斷言要跟著改成 `true`，而不是把測試刪掉。
   */
  it("現行比例公式在第一個年資年度低於週年制 —— 護欄如預期擋下", () => {
    const result = compareCycleBasisEntitlement({
      hireDate: "2026-03-01",
      asOfDate: "2028-03-01",
      policy: basePolicy,
      dayEquivalentMinutes: 480,
    });

    expect(result.employmentYearIndex).toBe(0);
    expect(result.calendarIsAtLeastAnniversary).toBe(false);
    expect(result.anniversaryDays).toBeCloseTo(3, 6);
    expect(result.calendarDays).toBeLessThan(3);
  });

  it("回報的是第一個違反的年資年度，不是最後一個", () => {
    const result = compareCycleBasisEntitlement({
      hireDate: "2026-03-01",
      asOfDate: "2031-03-01",
      policy: basePolicy,
      dayEquivalentMinutes: 480,
    });
    expect(result.employmentYearIndex).toBe(0);
  });

  /**
   * Info: (20260817 - Julian) 對照組：確認**比較方法本身沒有偏差**。
   *
   * 上面兩條斷言若只是「歸屬函數對曆年制不公平」造成的假訊號，這條也會紅。
   * 取一個兩制完全重合的設定（1/1 到職、固定年度日數、無年資級距）——
   * 兩邊的週期起訖逐日相同，任何非零差異都只可能來自比較方法本身。
   */
  it("兩制週期完全重合時判定相等（確認比較方法本身無偏差）", () => {
    const result = compareCycleBasisEntitlement({
      hireDate: "2026-01-01",
      asOfDate: "2029-01-01",
      policy: {
        accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
        annualDays: 14,
        tiers: [],
        carryForwardMonths: 0,
        proratedRoundingScale: 1,
      },
      dayEquivalentMinutes: 480,
    });
    expect(result.calendarIsAtLeastAnniversary).toBe(true);
    expect(result.calendarDays).toBeCloseTo(result.anniversaryDays, 6);
    expect(result.calendarDays).toBeCloseTo(14, 6);
  });
});
