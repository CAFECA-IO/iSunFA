import { describe, it, expect } from "@jest/globals";
import {
  fromPensionRatePercent,
  MAX_PENSION_RATE_PERCENT,
  toPensionRatePercent,
} from "@/lib/utils/salary_pension_rate";

/**
 * Info: (20260902 - Julian) 自提勞退費率的兩種表示法。
 *
 * ## 這一支擋的是什麼
 *
 * `voluntaryPensionRate` 落地是**百分點整數**（0–6），UI 那一側是**小數費率**
 * （`others_form.tsx` 的七顆單選鈕是 `i * 0.01`）。而它在員工檔上的鄰居有四個
 * `BigInt` 金額欄，引擎那一側的欄位又叫 `employeeBurdenPensionInsurance`
 * （「個人自願提繳退休金」）—— 名字讀起來像金額。
 *
 * 照抄鄰居的後果：`BigInt(0.06)` 丟 RangeError（還算好的），
 * `BigInt(Math.round(0.06))` 則靜靜變成 **0** —— 使用者選了 6%，
 * 存進去是 0、載回來是 0，而單選鈕顯示「0%」看起來像他自己沒選。
 *
 * 所以這一支的重點不是「乘除 100 對不對」，是**七個檔位一個都不能掉**。
 */

// Info: (20260902 - Julian) UI 真正產得出來的七個值，與 others_form.tsx 的選項同源
const UI_RATES = Array.from({ length: 7 }, (_, i) => i * 0.01);

describe("費率 ↔ 百分點", () => {
  it("UI 的七個檔位來回不失真", () => {
    for (const rate of UI_RATES) {
      const percent = toPensionRatePercent(rate);
      expect(Number.isInteger(percent)).toBe(true);
      expect(fromPensionRatePercent(percent)).toBeCloseTo(rate, 10);
    }
  });

  /**
   * Info: (20260902 - Julian) 逐格釘死，不只驗「來回相等」。
   *
   * 只驗來回的話，一對「都乘以 10」的函式也會全綠 ——
   * 那時候資料庫裡存的是 0.6 而不是 6，而讀回來的畫面正常
   * （checklist §1.9：判準要能在缺陷發生時分辨成功與失敗）。
   */
  it.each([
    [0, 0],
    [0.01, 1],
    [0.02, 2],
    [0.03, 3],
    [0.04, 4],
    [0.05, 5],
    [0.06, 6],
  ])("%f → %i", (rate, percent) => {
    expect(toPensionRatePercent(rate)).toBe(percent);
    expect(fromPensionRatePercent(percent)).toBeCloseTo(rate, 10);
  });

  /**
   * Info: (20260902 - Julian) 用 `Math.round` 而不是 `Math.trunc`，而這一格是唯一問得出來的地方。
   *
   * **先講一件我原本寫錯的事**：0–6 這七個檔位裡 `i * 0.01 * 100` 全部是精確的
   * （實測 node：0.03 * 100 === 3，沒有 3.0000000000000004）。
   * 也就是說用 `trunc` 或 `round`，上面那些斷言**全部照樣綠** ——
   * 那是 checklist §1.9 的形狀：判準分不出成功與失敗。
   *
   * 所以這一條刻意用一個 UI 產不出來的值來問。它守的不是今天的正確性，
   * 是「哪天有人把值域擴大」——`0.29 * 100` 是 28.999999999999996，
   * `trunc` 會靜靜少一個百分點，而使用者看到的是自提比例莫名變低。
   */
  it("非整數百分點取最近的檔位（round 而不是 trunc）", () => {
    // Info: (20260902 - Julian) trunc 會得到 2，round 得到 3
    expect(toPensionRatePercent(0.029)).toBe(3);
    // Info: (20260902 - Julian) 反方向同理：4.6 個百分點取到 5
    expect(fromPensionRatePercent(4.6)).toBeCloseTo(0.05, 10);
  });

  it("百分點是整數，不是 BigInt 也不是小數", () => {
    for (const rate of UI_RATES) {
      const percent = toPensionRatePercent(rate);
      expect(typeof percent).toBe("number");
      expect(percent % 1).toBe(0);
    }
  });
});

describe("讀取路徑上的異常值一律夾到合法檔位", () => {
  /**
   * Info: (20260902 - Julian) 寫入有 zod 擋著，這裡是讀取。
   *
   * 資料庫裡萬一有超出值域的舊值，回一個不在七個檔位裡的數字會讓
   * 單選鈕一顆都不選中 —— 表單變成非受控元件，而畫面上看不出原因。
   * 夾到最近的合法檔位是刻意的取捨，不是漏寫驗證。
   */
  it.each([
    ["超過上限", 99, MAX_PENSION_RATE_PERCENT],
    ["負數", -3, 0],
    ["NaN", Number.NaN, 0],
    ["Infinity", Number.POSITIVE_INFINITY, 0],
  ])("fromPensionRatePercent 的 %s", (_label, input, expected) => {
    expect(fromPensionRatePercent(input)).toBeCloseTo(expected / 100, 10);
  });

  it.each([
    ["超過上限", 0.99, MAX_PENSION_RATE_PERCENT],
    ["負數", -0.03, 0],
    ["NaN", Number.NaN, 0],
  ])("toPensionRatePercent 的 %s", (_label, input, expected) => {
    expect(toPensionRatePercent(input)).toBe(expected);
  });
});
