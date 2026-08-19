import { describe, it, expect } from "@jest/globals";
import {
  compareDaysTo,
  exactDaysToDecimalString,
  exactDaysToNumber,
  totalDaysOf,
} from "@/lib/leave_entitlement_rules";

/**
 * Info: (20260819 - Julian) 總日數的精度（review B5）。
 *
 * ## 這幾條測的是什麼
 *
 * `Σ 分鐘 ÷ 日約當` 用 JS number 累加，在「恰好整數天」的形狀上會掉到
 * 整數下方。而那個值同時決定**簽核規則命中**：ADR 023 §2.2 訂的是右開區間
 * （`[0, 3)` 與 `[3, ∞)`，恰好 3 天走長假規則），於是少一個 epsilon
 * 就等於少簽一關 —— 一次職責分離的降級，而事後查那張單看起來完全正常。
 *
 * 每一條都附上舊實作的浮點值，讓「這條在缺陷發生時會不會照樣通過」
 * 一眼看得出來（checklist §1.9）。
 */
const plan = (count: number, minutes: number, dayEquivalentMinutes: number) =>
  Array.from({ length: count }, () => ({ minutes, dayEquivalentMinutes }));

describe("totalDaysOf — 恰好整數天不得掉到整數下方", () => {
  it.each([
    // Info: (20260819 - Julian) [班別, 天數, 每日分鐘, 舊 double 值]
    [420, 7, 180, 2.9999999999999996],
    [420, 21, 60, 2.999999999999999],
    [450, 10, 135, 2.9999999999999996],
    [480, 10, 144, 2.9999999999999996],
  ])(
    "%i 分班 × %i 天 × %i 分 = 恰好 3 天（舊實作為 %p）",
    (dayEq, count, minutes, legacy) => {
      const naive = plan(count, minutes, dayEq).reduce(
        (sum, day) => sum + day.minutes / day.dayEquivalentMinutes,
        0,
      );
      // Info: (20260819 - Julian) 先釘住「舊寫法確實會錯」，這條紅了代表前提變了
      expect(naive).toBe(legacy);
      expect(naive < 3).toBe(true);

      const exact = totalDaysOf(plan(count, minutes, dayEq));
      expect(exactDaysToDecimalString(exact)).toBe("3");
      expect(compareDaysTo(exact, 3)).toBe(0);
      // Info: (20260819 - Julian) 右開區間：恰好 3 天必須落在 [3, ∞)
      expect(compareDaysTo(exact, 3) >= 0).toBe(true);
    },
  );

  it("跨班別也精確（420 分 3 天 + 480 分 4 天）", () => {
    const exact = totalDaysOf([...plan(3, 180, 420), ...plan(4, 240, 480)]);
    // Info: (20260819 - Julian) 3/7 × 3 + 1/2 × 4 = 9/7 + 2 = 23/7
    expect(exactDaysToDecimalString(exact)).toBe("3.2857142857");
    expect(compareDaysTo(exact, 3)).toBe(1);
  });

  it("除不盡時落地字串取到 10 位並四捨五入", () => {
    const exact = totalDaysOf(plan(1, 160, 480));
    expect(exactDaysToDecimalString(exact)).toBe("0.3333333333");
  });

  it("半天與零天", () => {
    expect(compareDaysTo(totalDaysOf(plan(1, 240, 480)), 0.5)).toBe(0);
    expect(exactDaysToDecimalString(totalDaysOf([]))).toBe("0");
  });

  /**
   * Info: (20260819 - Julian) 顯示用的近似值仍然是 double —— 這是刻意的，
   * 但它不可以被拿去比對規則。這一條把那個界線寫下來。
   */
  it("exactDaysToNumber 只是顯示用", () => {
    expect(exactDaysToNumber(totalDaysOf(plan(7, 180, 420)))).toBe(3);
  });

  it("日約當為 0 直接丟，不會靜默算出 Infinity", () => {
    expect(() =>
      totalDaysOf([{ minutes: 480, dayEquivalentMinutes: 0 }]),
    ).toThrow();
  });
});
