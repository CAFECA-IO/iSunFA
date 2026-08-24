import { describe, it, expect } from "@jest/globals";
import { ANNUAL_LEAVE_TIER_SEED } from "@/constants/leave_policy";
import {
  assertAccrualTierTable,
  IStorableAccrualTier,
  LeaveAccrualTierInvariantError,
} from "@/repositories/leave_accrual_tier_invariant";

/**
 * Info: (20260818 - Julian) 年資級距表的階梯規則（L6）。
 *
 * ## 為什麼三條規則都要釘住
 *
 * 級距表是特休日數的唯一來源（勞基法 §38 I），而 `resolveTierDays` 的作法是
 * 「取最後一個 `minSeniorityMonths <= 年資` 的級距」。表寫壞的三種方式
 * **都不會報錯**：
 *
 * - 年資下界重複 → 兩列同時命中，取到哪一列取決於查詢回來的順序；
 * - 日數倒退 → 做越久假越少；
 * - 空表 → 每個人的額度都是零，而畫面上看起來設定完成了。
 *
 * 只有被少給假的人會發現。這支測試的職責就是讓它在寫入時就發現。
 */

const tier = (
  minSeniorityMonths: number,
  days: number,
  incrementDaysPerYear: number | null = null,
  maxDays: number | null = null,
): IStorableAccrualTier => ({
  minSeniorityMonths,
  days,
  incrementDaysPerYear,
  maxDays,
});

describe("法定級距表本身必須通得過", () => {
  /**
   * Info: (20260818 - Julian) 這一條是最重要的：seed 種進去的那張表就是
   * 勞基法 §38 I 的六級。不變式若擋掉它，那是不變式寫錯而不是法規寫錯。
   */
  it("§38 I 的六級（seed 內容）通過", () => {
    expect(() =>
      assertAccrualTierTable(
        ANNUAL_LEAVE_TIER_SEED.map((seed) => ({
          minSeniorityMonths: seed.minSeniorityMonths,
          days: seed.days,
          incrementDaysPerYear: seed.incrementDaysPerYear,
          maxDays: seed.maxDays,
        })),
      ),
    ).not.toThrow();
  });
});

describe("階梯的形狀", () => {
  it("空表擋下 —— 每個人的額度都會是零，而畫面看起來設定完成了", () => {
    expect(() => assertAccrualTierTable([])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });

  it("年資下界重複：擋下", () => {
    expect(() => assertAccrualTierTable([tier(6, 3), tier(6, 7)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });

  it("年資下界倒退：擋下", () => {
    expect(() => assertAccrualTierTable([tier(12, 7), tier(6, 3)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });

  it("日數倒退：擋下 —— 做越久假越少在 §38 I 站不住", () => {
    expect(() => assertAccrualTierTable([tier(6, 7), tier(12, 3)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });

  it("日數相同不算倒退（優於法定的公司規定可能有平台期）", () => {
    expect(() =>
      assertAccrualTierTable([tier(6, 7), tier(12, 7)]),
    ).not.toThrow();
  });

  it("零日或負日的級距與「沒有這一級」無法區分：擋下", () => {
    expect(() => assertAccrualTierTable([tier(6, 0)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
    expect(() => assertAccrualTierTable([tier(6, -1)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });

  it("年資下界必須是非負整數月", () => {
    expect(() => assertAccrualTierTable([tier(-1, 3)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
    expect(() => assertAccrualTierTable([tier(6.5, 3)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });
});

describe("每年加給與上限", () => {
  it("加給掛在最後一級：通過", () => {
    expect(() =>
      assertAccrualTierTable([tier(6, 3), tier(120, 16, 1, 30)]),
    ).not.toThrow();
  });

  /**
   * Info: (20260818 - Julian) §38 I ⑥ 的「每一年加給一日」是階梯的尾巴。
   * 掛在中間那一級，下一級的固定日數與累加出來的日數會在同一個年資上
   * 給出兩個答案。
   */
  it("加給掛在中間那一級：擋下", () => {
    expect(() =>
      assertAccrualTierTable([tier(6, 3, 1, 30), tier(120, 16)]),
    ).toThrow(LeaveAccrualTierInvariantError);
  });

  it("加給不是正數：擋下 —— 那是一個什麼都不做的設定", () => {
    expect(() => assertAccrualTierTable([tier(120, 16, 0, 30)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });

  it("有上限卻沒有加給：擋下 —— 上限限制了一個不會成長的東西", () => {
    expect(() => assertAccrualTierTable([tier(120, 16, null, 30)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });

  it("上限低於本級距日數：擋下 —— 上限會回頭砍掉法定最低值", () => {
    expect(() => assertAccrualTierTable([tier(120, 16, 1, 15)])).toThrow(
      LeaveAccrualTierInvariantError,
    );
  });
});
