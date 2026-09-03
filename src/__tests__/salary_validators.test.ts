import { describe, it, expect } from "@jest/globals";
import { defaultSalaryCalculatorResult } from "@/interfaces/salary_calculator";
import { SALARY_RECORD_MIN_YEAR } from "@/constants/salary_calculator";
import {
  salaryCalculatorEmployeeWriteSchema,
  salaryRecordQuerySchema,
  salaryRecordWriteSchema,
} from "@/validators/salary_record";

/**
 * Info: (20260901 - Julian) 薪資模組三支 zod schema 的判準。
 *
 * ## 為什麼需要這一支
 *
 * 這三支 schema 是薪資 API 對外唯一的守門人 —— 兩個 Json 欄位在資料庫端
 * 完全沒有約束，`inputSnapshot` / `resultSnapshot` 存什麼進去就是什麼。
 * 而在這支測試之前，**全 repo 沒有任何測試匯入過它們**：
 * `salary_route_wiring.test.ts` 用的是真的 validator 沒錯，但它只從 route
 * 那一端戳幾個代表性的壞形狀，schema 內部的規則沒有逐條的判準。
 *
 * 實測：把 `year === input.year` 那條 `.refine` 整條刪掉 → 87 passed 全綠。
 *
 * ## 為什麼特別要守那兩條 refine
 *
 * 年月在 write payload 裡出現兩次，用途完全不同：外層的 `year`/`month` 是
 * `(帳本, 員工, 年, 月)` 唯一鍵的一半，決定**覆寫哪一筆**；`input.year`/`input.month`
 * 是快照，決定**載回計算機時顯示哪個月**。前端兩邊各算一次、目前同源，
 * 所以必然相等 —— 但那是巧合不是約束（checklist §2.2：
 * 「兩邊各算一次就是『算的是 A、送的是 B』，而巧合能掩蓋很久」）。
 *
 * 不一致時的症狀是同一筆紀錄兩個畫面講不同的話，而且完全靜默。
 * API 是對外的，所以這一條在伺服器端擋。
 */

/**
 * Info: (20260901 - Julian) 拿掉一個欄位。
 *
 * 用 `delete` 而不是解構剩餘 —— `const { number: _number, ...rest }` 會留下一個
 * 沒人用的變數，eslint 的 `no-unused-vars` 會擋。這裡要的是「這個鍵真的不存在」，
 * 不是「值是 undefined」：zod 對兩者的錯誤訊息不同，而 JSON 送上來的 body
 * 缺欄位就是真的不存在。
 */
const omitKey = <T extends object, K extends keyof T>(
  value: T,
  key: K,
): Omit<T, K> => {
  const clone = { ...value };
  delete clone[key];
  return clone;
};

const VALID_INPUT = {
  year: 2026,
  month: 8,
  baseSalaryTaxable: 36000,
  baseSalaryTaxFree: 3000,
};

const VALID_WRITE = {
  employeeId: "11111111-1111-4111-8111-111111111111",
  year: 2026,
  month: 8,
  input: VALID_INPUT,
  result: defaultSalaryCalculatorResult,
  calculatorVersion: "2026.1",
};

describe("salaryRecordWriteSchema：年月必須兩邊一致", () => {
  it("基準線：兩邊一致時通過（否則下面幾條在測別的東西）", () => {
    expect(salaryRecordWriteSchema.safeParse(VALID_WRITE).success).toBe(true);
  });

  it("外層 year 與 input.year 不一致時擋下來", () => {
    const parsed = salaryRecordWriteSchema.safeParse({
      ...VALID_WRITE,
      year: 2025,
    });

    expect(parsed.success).toBe(false);
    // Info: (20260901 - Julian) 錯誤要指到 input.year 那一格，不是落在整包 payload 上
    expect(parsed.error?.issues.some((issue) => issue.path.includes("year"))).toBe(
      true,
    );
  });

  it("外層 month 與 input.month 不一致時擋下來", () => {
    const parsed = salaryRecordWriteSchema.safeParse({
      ...VALID_WRITE,
      month: 9,
    });

    expect(parsed.success).toBe(false);
  });

  /**
   * Info: (20260901 - Julian) 兩條 refine 是分開的，不是一條合併的。
   *
   * 合成一條 `d.year === d.input.year && d.month === d.input.month` 的話，
   * 只有月份不一致時錯誤會指到 `input.year` —— 訊息騙人。
   * 這一條讓「兩條各自成立」變成有判準的事。
   */
  it("年對月不對時，只有月份那一條紅（兩條 refine 各自獨立）", () => {
    const parsed = salaryRecordWriteSchema.safeParse({
      ...VALID_WRITE,
      input: { ...VALID_INPUT, month: 7 },
    });

    expect(parsed.success).toBe(false);
    const paths = parsed.error?.issues.map((issue) => issue.path.join(".")) ?? [];
    expect(paths).toContain("input.month");
    expect(paths).not.toContain("input.year");
  });

  it("年度下限與月份範圍照 SALARY_RECORD_MIN_YEAR 走", () => {
    const tooOld = SALARY_RECORD_MIN_YEAR - 1;
    expect(
      salaryRecordWriteSchema.safeParse({
        ...VALID_WRITE,
        year: tooOld,
        input: { ...VALID_INPUT, year: tooOld },
      }).success,
    ).toBe(false);

    expect(
      salaryRecordWriteSchema.safeParse({
        ...VALID_WRITE,
        month: 13,
        input: { ...VALID_INPUT, month: 13 },
      }).success,
    ).toBe(false);
  });

  it("結果快照缺欄位時擋下來（Json 欄位在 DB 端沒有守門人）", () => {
    expect(
      salaryRecordWriteSchema.safeParse({
        ...VALID_WRITE,
        result: { totalPayment: 1 },
      }).success,
    ).toBe(false);
  });

  it("employeeId 不是 uuid 時擋下來", () => {
    expect(
      salaryRecordWriteSchema.safeParse({ ...VALID_WRITE, employeeId: "abc" })
        .success,
    ).toBe(false);
  });
});

describe("salaryCalculatorEmployeeWriteSchema：身分鍵是編號不是 Email", () => {
  const VALID_EMPLOYEE = {
    name: "王小明",
    number: "A001",
    email: "ming@example.com",
    baseSalary: 30000,
    mealAllowance: 3000,
  };

  it("基準線通過", () => {
    expect(
      salaryCalculatorEmployeeWriteSchema.safeParse(VALID_EMPLOYEE).success,
    ).toBe(true);
  });

  it("編號必填 —— 它是帳本內的身分鍵，不能靠後端撿", () => {
    expect(
      salaryCalculatorEmployeeWriteSchema.safeParse(
        omitKey(VALID_EMPLOYEE, "number"),
      ).success,
    ).toBe(false);
    expect(
      salaryCalculatorEmployeeWriteSchema.safeParse({
        ...VALID_EMPLOYEE,
        number: "   ",
      }).success,
    ).toBe(false);
  });

  it("Email 可省略，但格式不對就擋（它只在寄薪資單時要用）", () => {
    expect(
      salaryCalculatorEmployeeWriteSchema.safeParse(
        omitKey(VALID_EMPLOYEE, "email"),
      ).success,
    ).toBe(true);
    expect(
      salaryCalculatorEmployeeWriteSchema.safeParse({
        ...VALID_EMPLOYEE,
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("金額不收負數與非有限數", () => {
    for (const baseSalary of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        salaryCalculatorEmployeeWriteSchema.safeParse({
          ...VALID_EMPLOYEE,
          baseSalary,
        }).success,
      ).toBe(false);
    }
  });
});

describe("salaryRecordQuerySchema：query string 全是字串，要 coerce", () => {
  /**
   * Info: (20260901 - Julian) 這一條守的是 `z.coerce`。
   *
   * query string 進來一律是字串，拿掉 `coerce` 之後 `year=2026` 會驗不過，
   * 症狀是薪資紀錄頁一選期間就變成「載入失敗」——
   * 而那條路徑在 route wiring 測試裡走的是不帶 query 的預設值，看不出來。
   */
  it("year / month / page / pageSize 收字串並轉成數字", () => {
    const parsed = salaryRecordQuerySchema.safeParse({
      year: "2026",
      month: "8",
      page: "2",
      pageSize: "50",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      year: 2026,
      month: 8,
      page: 2,
      pageSize: 50,
    });
  });

  it("沒帶分頁時有預設值（缺席不等於 0 筆）", () => {
    const parsed = salaryRecordQuerySchema.safeParse({});

    expect(parsed.success).toBe(true);
    expect(parsed.data?.page).toBe(1);
    expect(parsed.data?.pageSize).toBeGreaterThan(0);
  });

  // Info: (20260901 - Julian) 上限存在，否則一次撈回整本帳只要改一個 query 參數
  it("pageSize 有上限", () => {
    expect(salaryRecordQuerySchema.safeParse({ pageSize: "10000" }).success).toBe(
      false,
    );
  });
});
