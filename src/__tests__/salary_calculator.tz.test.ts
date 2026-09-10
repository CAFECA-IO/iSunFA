import { describe, it, expect } from "@jest/globals";
import { salaryCalculator } from "@/lib/utils/salary_calculator";

/**
 * Info: (20260910 - Luphia) 引擎讀到職／離職日的時區（#6798）。
 *
 * ## 這一檔為什麼非釘 `America/New_York` 不可
 *
 * 到職日在快照裡是 **UTC 午夜**（`salary_calculator_snapshot.ts` 的 `toTimestamp`
 * 組的是 `new Date("2026-08-01")`，裸 ISO 日期字串由 JS 當成 UTC 解析），
 * 而引擎原本用 `getDate()`（本地時間）把它讀回「幾號」。
 *
 *     存的是        2026-08-01T00:00:00.000Z
 *     getUTCDate()  → 1
 *     getDate()     → 31   （America/New_York）
 *
 * 台灣是 UTC+8：讀 UTC 午夜得到的是同一天 08:00，**日期完全相同**。
 * 也就是說這個缺陷在開發與正式使用的時區下都不存在，只有把時鐘移到
 * UTC 以西才看得到 —— 而它改的是薪水金額，不是畫面。
 *
 * 反方向的映射（`toDayString`）一直都是 `getUTCDate()`，所以兩個方向
 * 互相矛盾了很久而沒有人發現。
 */

const utcDay = (year: number, month: number, day: string): number =>
  Date.parse(`${year}-${month.toString().padStart(2, "0")}-${day}`) / 1000;

/**
 * Info: (20260910 - Luphia) 只帶引擎必要的欄位；其餘走預設。
 * 這一檔要驗的是**比例**，不是稅與保費的絕對值。
 */
const optionsOf = (overrides: Record<string, unknown> = {}) => ({
  year: 2026,
  month: 8,
  baseSalaryTaxable: 31000,
  baseSalaryTaxFree: 0,
  // Info: (20260910 - Luphia) 關掉三保，把比例以外的變因移開
  isLaborInsuranceEnrolled: false,
  isHealthInsuranceEnrolled: false,
  isPensionInsuranceEnrolled: false,
  // Info: (20260910 - Luphia) 用實際天數而不是 30 日制 —— 八月 31 天，一天剛好 1,000
  baseSalary30Days: false,
  ...overrides,
});

describe("到職日：本地時間讀 UTC 午夜會退一天", () => {
  /**
   * Info: (20260910 - Luphia) **8/1 到職＝整月，不是一天。**
   *
   * 這是這個缺陷最糟的形狀：`getDate()` 在紐約回 31，於是「8/1 起計薪」
   * 變成「8/31 起計薪」，整月薪資塌成一天。
   */
  it("8/1 到職拿的是整月", () => {
    const full = salaryCalculator(optionsOf() as never);
    const joined = salaryCalculator(
      optionsOf({ employeeStartDate: utcDay(2026, 8, "01") }) as never,
    );

    expect(joined.baseSalaryTaxable).toBe(full.baseSalaryTaxable);
  });

  /**
   * Info: (20260910 - Luphia) 月中到職照樣不得差一天。
   * 8/16 到職 = 8/16–8/31 共 16 天，31,000 / 31 × 16 = 16,000。
   * 讀成 15 號的話會多算一天（17,000）。
   */
  it("8/16 到職算 16 天，不是 17 天", () => {
    const joined = salaryCalculator(
      optionsOf({ employeeStartDate: utcDay(2026, 8, "16") }) as never,
    );

    expect(joined.baseSalaryTaxable).toBe(16000);
  });
});

describe("離職日同樣要用 UTC 讀", () => {
  /**
   * Info: (20260910 - Luphia) 8/1 離職 = 只做一天。
   *
   * 這一條的方向與到職相反：`getDate()` 回 31 會讓「只做一天」
   * 變成「做滿整月」—— 多付一整個月。
   */
  it("8/1 離職只算一天", () => {
    const left = salaryCalculator(
      optionsOf({ employeeEndDate: utcDay(2026, 8, "01") }) as never,
    );

    expect(left.baseSalaryTaxable).toBe(1000);
  });

  it("8/31 離職拿的是整月", () => {
    const full = salaryCalculator(optionsOf() as never);
    const left = salaryCalculator(
      optionsOf({ employeeEndDate: utcDay(2026, 8, "31") }) as never,
    );

    expect(left.baseSalaryTaxable).toBe(full.baseSalaryTaxable);
  });
});

describe("跨年的月份邊界", () => {
  /**
   * Info: (20260910 - Luphia) 1/1 到職在西半球會退成前一年的 12/31 ——
   * 日期與年份同時錯，而 `employeeStartDate` 只取「幾號」，
   * 於是 31 這個數字會被當成一月的 31 號。
   */
  it("1/1 到職拿的是整月", () => {
    const full = salaryCalculator(optionsOf({ year: 2026, month: 1 }) as never);
    const joined = salaryCalculator(
      optionsOf({
        year: 2026,
        month: 1,
        employeeStartDate: utcDay(2026, 1, "01"),
      }) as never,
    );

    expect(joined.baseSalaryTaxable).toBe(full.baseSalaryTaxable);
  });
});
