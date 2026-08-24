import { describe, it, expect } from "@jest/globals";
import {
  compareDaysTo,
  exactDaysToDecimalString,
  exactDaysToNumber,
  totalDaysOf,
} from "@/lib/leave_entitlement_rules";
import type { IExactDays } from "@/lib/leave_entitlement_rules";

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

/**
 * Info: (20260820 - Julian) 進位案例（review 第 4 條）。顯式標註成 tuple 陣列 ——
 * 不標的話 TS 會把三種型別推成聯集，`it.each` 的回呼參數就拿不到各自的型別。
 */
const CARRY_CASES: readonly [number, string, string, IExactDays][] = [
  [1, "1.99", "2", { numerator: 199n, denominator: 100n }],
  [2, "2.999", "3", { numerator: 2999n, denominator: 1000n }],
  [3, "3.9999", "4", { numerator: 39999n, denominator: 10000n }],
];

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

  /**
   * Info: (20260820 - Julian) 進位分支（review 第 4 條）。
   *
   * ## 為什麼上面那幾條抓不到它
   *
   * 它們的分母都是 7、3、2 這種小數字，四捨五入之後離 `10^scale` 遠得很，
   * 從來走不到進位那一支。而那一支原本是**死碼**：它先剝掉尾零、再用字串
   * 長度判進位，而唯一會進位的 `scaled === 10^scale` 的字串是「1 後面 scale
   * 個零」—— 尾零一剝只剩 `"1"`。分支永遠不成立，落地的值是 `"2.1"`。
   *
   * 差的不是一位小數，是 **0.9 天**。`totalDays` 同時決定簽核規則命中
   * （ADR 023 §2.2 的右開區間），2.1 天與 3 天走的是不同的關。
   *
   * ## 為什麼要用真的 plan 建構
   *
   * 直接餵一個手工的 `IExactDays` 只證明「函式對這個分數會怎麼算」，
   * 不證明**這個分數生得出來**。要走到這一支，分母得大於 `2 × 10^10`，
   * 而它來自 `totalDaysOf` 的最小公倍：連續五日、各日班別的
   * `requiredWorkMinutes` 兩兩互質時就到那個量級。下面這五個值
   * （421 / 425 / 429 / 437 / 443）互質，分母 14,859,817,690,575。
   */
  it("四捨五入剛好進位時給出整數，不是 x.1", () => {
    const exact = totalDaysOf([
      { minutes: 327, dayEquivalentMinutes: 421 },
      { minutes: 296, dayEquivalentMinutes: 425 },
      { minutes: 127, dayEquivalentMinutes: 429 },
      { minutes: 381, dayEquivalentMinutes: 437 },
      { minutes: 159, dayEquivalentMinutes: 443 },
    ]);

    /**
     * Info: (20260820 - Julian) 先釘住前提：它**不是**恰好 3 天（否則
     * `remainder === 0` 提前回傳，根本走不到進位那一支），只是差
     * 1/14859817690575 天，在小數第 10 位進位成 3。
     */
    expect(exact.denominator).toBe(14859817690575n);
    expect(compareDaysTo(exact, 3)).toBe(-1);

    // Info: (20260820 - Julian) 缺陷發生時這裡是 "2.1"
    expect(exactDaysToDecimalString(exact)).toBe("3");
  });

  /**
   * Info: (20260820 - Julian) 同一支分支在小 scale 下容易得多 ——
   * 現行呼叫端都用預設的 10，但這條把「判準與 scale 無關」釘住。
   */
  it.each(CARRY_CASES)(
    "scale=%i 時 %s 進位成 %s",
    (scale, _label, expected, days) => {
      expect(exactDaysToDecimalString(days, scale)).toBe(expected);
    },
  );

  // Info: (20260820 - Julian) 負數走同一條路：進位是「離零更遠」，不是「變大」
  it("負值進位時往負向進", () => {
    expect(
      exactDaysToDecimalString({ numerator: -199n, denominator: 100n }, 1),
    ).toBe("-2");
  });

  /**
   * Info: (20260820 - Julian) 反向的一半：**沒有**進位時不得憑空多一位整數。
   * 只驗上面那幾條的話，把判準寫成「一律進位」也會通過。
   */
  it("差得夠遠時不進位", () => {
    expect(
      exactDaysToDecimalString({ numerator: 194n, denominator: 100n }, 1),
    ).toBe("1.9");
    expect(
      exactDaysToDecimalString({ numerator: 195n, denominator: 100n }, 1),
    ).toBe("2");
  });

  it("日約當為 0 直接丟，不會靜默算出 Infinity", () => {
    expect(() =>
      totalDaysOf([{ minutes: 480, dayEquivalentMinutes: 0 }]),
    ).toThrow();
  });
});
