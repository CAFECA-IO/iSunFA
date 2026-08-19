import { describe, it, expect } from "@jest/globals";
import { grantedMinutesOf } from "@/lib/leave_entitlement_rules";
import {
  assertGrantSource,
  LeaveGrantInvariantError,
} from "@/repositories/leave_grant_invariant";
import { deriveCompensatoryGrantDays } from "@/lib/overtime_rules";
import { LeaveGrantSource } from "@/constants/leave_policy";

/**
 * Info: (20260819 - Julian) 「日數 × 日約當 → 分鐘」的精度（review B6）。
 *
 * ## 這幾條測的是什麼
 *
 * `Math.ceil(days × dayEquivalentMinutes)` 的乘積會落在整數上方一個 epsilon，
 * 於是進位多給一分鐘。ADR 022 §3.2 承諾「任何人事後都能驗算這 3360 分鐘的
 * 來歷」—— 稽核員按計算機得到 462、DB 寫 463，那個承諾就不成立了。
 *
 * ## 為什麼有「不變式要抓得到」這一組
 *
 * `assertGrantSource` 原本重算的是**同一個式子**，所以它與缺陷完全相容：
 * 181 組多算一分鐘的批次全數通過檢查（checklist §1.9「衍生值救不了衍生值」）。
 * 光把引擎改對不夠 —— 若不變式仍舊重算實作，下一次有人改壞乘法時它照樣沉默。
 * 因此這裡直接把**舊式算出來的錯誤值**餵給不變式，要求它擋下來。
 */

const seniorityGrant = {
  source: LeaveGrantSource.SENIORITY_ACCRUAL,
  grantedDays: 7,
  dayEquivalentMinutes: 480,
  grantedMinutes: 3360,
  cycleStartDate: "2026-01-01",
  cycleEndDate: "2026-12-31",
  expiresOn: "2026-12-31",
  overtimeSegmentId: null,
  reason: null,
};

// Info: (20260819 - Julian) [日數, 日約當, 浮點乘積, 舊式進位, 正解]
const OVER_BY_ONE: [number, number, number, number, number][] = [
  [1.1, 420, 462.00000000000006, 463, 462],
  [1.1, 450, 495.00000000000006, 496, 495],
  [2.2, 465, 1023.0000000000001, 1024, 1023],
  [8.3, 480, 3984.0000000000005, 3985, 3984],
];

describe("grantedMinutesOf — 浮點乘積不得多給一分鐘", () => {
  it.each(OVER_BY_ONE)(
    "%p 日 × %p 分 = %p（舊式進位 %p）→ 正解 %p",
    (days, dayEq, product, legacy, correct) => {
      // Info: (20260819 - Julian) 先釘住「舊寫法確實會錯」，這條紅了代表前提變了
      expect(days * dayEq).toBe(product);
      expect(Math.ceil(days * dayEq)).toBe(legacy);
      expect(legacy).toBe(correct + 1);

      expect(grantedMinutesOf(days, dayEq)).toBe(correct);
    },
  );

  it("整除與半天不受影響", () => {
    expect(grantedMinutesOf(7, 480)).toBe(3360);
    expect(grantedMinutesOf(0.5, 465)).toBe(233);
    expect(grantedMinutesOf(0, 480)).toBe(0);
  });

  /**
   * Info: (20260819 - Julian) 捨入方向沒有改變：除不盡時仍然無條件進位，
   * 因為比例給假的餘數不該由勞工承擔。這一條把「改的是怎麼算、不是往哪捨」
   * 寫下來，免得下一個人以為 B6 順手把它改成四捨五入了。
   */
  it("除不盡時仍然無條件進位（1.1 日 × 465 分 = 511.5 → 512）", () => {
    expect(grantedMinutesOf(1.1, 465)).toBe(512);
  });

  it("日約當非正整數時直接丟", () => {
    expect(() => grantedMinutesOf(1, 0)).toThrow();
    expect(() => grantedMinutesOf(1, -480)).toThrow();
    expect(() => grantedMinutesOf(1, 480.5)).toThrow();
  });
});

describe("assertGrantSource — 判準必須獨立於乘法實作", () => {
  it.each(OVER_BY_ONE)(
    "%p 日 × %p 分：擋下舊式多給的一分鐘（%p → 應為 %p 的那一組）",
    (days, dayEq, _product, legacy, correct) => {
      expect(() =>
        assertGrantSource({
          ...seniorityGrant,
          grantedDays: days,
          dayEquivalentMinutes: dayEq,
          grantedMinutes: legacy,
        }),
      ).toThrow(LeaveGrantInvariantError);

      expect(() =>
        assertGrantSource({
          ...seniorityGrant,
          grantedDays: days,
          dayEquivalentMinutes: dayEq,
          grantedMinutes: correct,
        }),
      ).not.toThrow();
    },
  );

  it("少給一分鐘也擋下（下界）", () => {
    expect(() =>
      assertGrantSource({
        ...seniorityGrant,
        grantedDays: 1.1,
        dayEquivalentMinutes: 420,
        grantedMinutes: 461,
      }),
    ).toThrow(LeaveGrantInvariantError);
  });

  it("非整數分鐘擋下（帳本只認整分鐘）", () => {
    expect(() =>
      assertGrantSource({ ...seniorityGrant, grantedMinutes: 3360.5 }),
    ).toThrow(LeaveGrantInvariantError);
  });
});

/**
 * Info: (20260819 - Julian) 補休換算的方向相反：分鐘既定、日數推導。
 *
 * 舊實作為了讓 `Math.ceil(days × eq)` 這個**錯的**式子成立，會把日數退位
 * 10⁻¹⁰ —— 63 分鐘 ÷ 450 分班本該是 `0.14` 日，退位後存進 DB 的是
 * `0.1399999999`，而那個數字會原樣出現在員工的餘額畫面上。
 * 誤差的源頭移除之後，退位迴圈連同它製造的髒資料一起不見了。
 */
describe("deriveCompensatoryGrantDays — 日數不再被退位扭曲", () => {
  it.each([
    [63, 450, 0.14],
    [126, 450, 0.28],
    [243, 450, 0.54],
    [231, 420, 0.55],
    [120, 480, 0.25],
  ])("%i 分 ÷ %i 分班 = %p 日", (minutes, dayEquivalentMinutes, days) => {
    expect(deriveCompensatoryGrantDays({ minutes, dayEquivalentMinutes })).toBe(
      days,
    );
  });

  it.each([420, 450, 465, 480, 720])(
    "日約當 %i 分鐘時，1..720 分鐘全部換算得回來且通過不變式",
    (dayEquivalentMinutes) => {
      for (let minutes = 1; minutes <= 720; minutes += 1) {
        const grantedDays = deriveCompensatoryGrantDays({
          minutes,
          dayEquivalentMinutes,
        });
        expect(grantedMinutesOf(grantedDays, dayEquivalentMinutes)).toBe(
          minutes,
        );
        expect(() =>
          assertGrantSource({
            ...seniorityGrant,
            source: LeaveGrantSource.OVERTIME_CONVERSION,
            overtimeSegmentId: "seg-1",
            overtimeSegmentMinutes: minutes,
            grantedDays,
            dayEquivalentMinutes,
            grantedMinutes: minutes,
          }),
        ).not.toThrow();
      }
    },
  );
});
