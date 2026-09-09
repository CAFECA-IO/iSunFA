import { describe, it, expect } from "@jest/globals";
import { formatPaySlipDate } from "@/lib/utils/pay_slip_meta";

/**
 * Info: (20260909 - Julian) 薪資單上的到職日，**在 UTC 以西的時區不得退一天**。
 *
 * ## 為什麼要單獨一支 `.tz.test.ts`
 *
 * 到職日在資料庫裡是「某一天的午夜 UTC」（見 `SalaryCalculatorEmployee.hireDate`
 * 的註解）—— 它是**日期**，不是時刻。用 `getFullYear()` / `getMonth()` /
 * `getDate()`（本地時間）讀回來，在 UTC 以西的時區會退一天：
 * 2026-08-10 在紐約會顯示成 2026-08-09。
 *
 * **這個錯誤在 UTC 與 UTC+08:00 都測不出來**（台北是東八區，午夜 UTC 是當天早上八點，
 * 日期不變）。本專案在這兩個時區開發，所以它只能靠這一檔抓 ——
 * 而這一格是要交給勞檢看的到職日，差一天就是差一天的年資。
 *
 * 由 `scripts/jest_tz.mjs`（`npm run test:tz`）以 `America/New_York` 執行。
 * 樣板是 `salary_coverage.tz.test.ts`。
 */

const utcSeconds = (year: number, month: number, day: number): number =>
  Date.UTC(year, month - 1, day) / 1000;

describe("到職日的顯示（America/New_York）", () => {
  it("執行時區真的是 UTC 以西 —— 否則這一支什麼都沒守到", () => {
    // Info: (20260909 - Julian) 紐約是 UTC-4／-5，`getTimezoneOffset()` 為正數（分鐘）
    expect(new Date(Date.UTC(2026, 7, 10)).getTimezoneOffset()).toBeGreaterThan(
      0,
    );
  });

  it("月中的到職日不退一天", () => {
    expect(formatPaySlipDate(utcSeconds(2026, 8, 10))).toBe("2026-08-10");
  });

  /**
   * Info: (20260909 - Julian) 月初最兇：退一天會連**月份**都跟著錯。
   *
   * 8/1 讀成 7/31，而薪資單上那一格會寫「2026/07/31 到職」——
   * 它與勞保投保申報表對不起來，而使用者會以為是投保申報錯了。
   */
  it("月初的到職日不退成上個月", () => {
    expect(formatPaySlipDate(utcSeconds(2026, 8, 1))).toBe("2026-08-01");
  });

  /**
   * Info: (20260909 - Julian) 年初退一天會連**年份**都錯 ——
   * 而年資是按年算的。
   */
  it("元旦到職不退成去年", () => {
    expect(formatPaySlipDate(utcSeconds(2026, 1, 1))).toBe("2026-01-01");
  });

  // Info: (20260909 - Julian) 美東夏令時間的兩個切換點，偏移量在此改變
  it("夏令時間起訖日附近仍然是同一天", () => {
    expect(formatPaySlipDate(utcSeconds(2026, 3, 8))).toBe("2026-03-08");
    expect(formatPaySlipDate(utcSeconds(2026, 11, 1))).toBe("2026-11-01");
  });
});
