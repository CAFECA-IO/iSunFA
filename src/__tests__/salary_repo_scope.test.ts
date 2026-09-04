import { describe, it, expect, beforeEach } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { salaryCalculatorEmployeeRepo } from "@/repositories/salary_calculator_employee.repo";
import { salaryRecordRepo } from "@/repositories/salary_record.repo";
import { ISalaryCalculatorEmployeeWriteInput } from "@/interfaces/salary_record";
import { DEFAULT_EMPLOYEE_PROFILE } from "@/lib/utils/salary_employee_profile";

/**
 * Info: (20260901 - Luphia) 薪資兩支 repository **交給資料庫的條件**。
 *
 * ## 這一檔存在的理由是一次實跑的 mutation
 *
 * 覆核 #6737 時對這兩支 repo 做了五條變異，只有一條會紅：
 *
 * | 改壞什麼 | 失效的性質 | 當時的結果 |
 * |---|---|---|
 * | `saveRecord` 拿掉員工歸屬檢查 | 跨租戶建立薪資紀錄 | 紅 |
 * | `getEmployeeById` 拿掉 `accountBookId` | 跨租戶讀員工 | **全綠** |
 * | `getEmployeeById` 拿掉 `deletedAt` | 已刪員工仍可被存新紀錄 | **全綠** |
 * | `softDeleteEmployee` 不清 `activeNumber` | 編號永久佔住 | **全綠** |
 * | `deleteRecord` 拿掉 `accountBookId` | 跨租戶刪薪資紀錄 | **全綠** |
 *
 * 四條全綠的共同點是它們都住在 repository 的 `where` 裡 —— 而兩個消費端
 * （`salary_record_service.test.ts`、route 測試）都把 repo 整包 mock 掉了，
 * repo 自己則沒有任何測試。檢查清單 §1.2 講的正是這件事：
 * **一旦決定 mock 掉某支協作者，就要另有一支測試直接測那支協作者。**
 *
 * ## 其中一條會連帶讓那道唯一會紅的守門失效
 *
 * `saveRecord` 靠 `getEmployeeById(accountBookId, employeeId)` 回 null 來擋
 * 跨帳本的請求。`getEmployeeById` 一旦掉了 `accountBookId`，它對別人家的
 * 員工也會回一列 —— 那道守門就從「擋得住」變成「永遠放行」，而它自己的
 * 測試照樣綠，因為那支測試 mock 掉的正是 `getEmployeeById`。
 *
 * ## 所以這裡不 mock repo，而是 mock `prisma`
 *
 * 斷言的對象是**交給資料庫的那個物件**（`where` 與 `data`），
 * 形狀比照 `resumable_job_read_scope.test.ts`。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    salaryCalculatorEmployee: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => null),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    salaryRecord: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => []),
      upsert: jest.fn(async () => null),
      deleteMany: jest.fn(async () => ({ count: 1 })),
    },
  },
}));

/**
 * Info: (20260901 - Luphia) 替身的回傳型別故意放寬。
 *
 * `jest.fn()` 的推導會把 `mockResolvedValue` 的參數收成 `never`，
 * 而這一檔要餵的是 Prisma 各種形狀的列。斷言的對象是**傳進去的參數**，
 * 不是回傳值，所以這裡放寬不會弱化任何一條斷言。
 */
type Mock = {
  mock: { calls: unknown[][] };
  mockResolvedValue: (value: unknown) => void;
  mockResolvedValueOnce: (value: unknown) => void;
};

const employeeFindFirst = prisma.salaryCalculatorEmployee
  .findFirst as unknown as Mock;
const employeeFindMany = prisma.salaryCalculatorEmployee
  .findMany as unknown as Mock;
const employeeUpdateMany = prisma.salaryCalculatorEmployee
  .updateMany as unknown as Mock;
const recordFindFirst = prisma.salaryRecord.findFirst as unknown as Mock;
const recordFindMany = prisma.salaryRecord.findMany as unknown as Mock;
const recordCount = prisma.salaryRecord.count as unknown as Mock;
const recordDeleteMany = prisma.salaryRecord.deleteMany as unknown as Mock;
const recordGroupBy = prisma.salaryRecord.groupBy as unknown as Mock;

const BOOK = "book-1";
const OTHER_EMPLOYEE = "employee-9";
const RECORD = "record-1";

/**
 * Info: (20260902 - Julian) 員工寫入的最小輸入。
 *
 * 這一檔驗的是**交給資料庫的 `where` 與 `data`**，與 15 個常態屬性
 * （行業別、投保狀態、到職日⋯⋯）無關。但 `ISalaryCalculatorEmployeeWriteInput`
 * 是整組必填 —— 少一欄會靜靜落到 schema 的 `@default`，也就是
 * 「改個名字順便把他的投保狀態與到職日重設」。
 *
 * 所以這裡用預設值補齊，只留下真正被斷言的那幾欄（`number` / `activeNumber`）。
 * 用 `DEFAULT_EMPLOYEE_PROFILE` 而不是手寫 15 個值：那份常數與 schema 的
 * `@default` 由 `salary_employee_profile.test.ts` 對拍，手寫的話這一檔會變成
 * 第三份要同步的預設值。
 */
const employeeInputOf = (
  overrides: Partial<ISalaryCalculatorEmployeeWriteInput> = {},
): ISalaryCalculatorEmployeeWriteInput => ({
  ...DEFAULT_EMPLOYEE_PROFILE,
  name: "王小明",
  number: "A012",
  email: undefined,
  baseSalary: 40000,
  mealAllowance: 2400,
  ...overrides,
});

const argOf = (mock: Mock, call = 0): Record<string, unknown> =>
  mock.mock.calls[call][0] as Record<string, unknown>;

const whereOf = (mock: Mock, call = 0): Record<string, unknown> =>
  argOf(mock, call).where as Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  employeeFindFirst.mockResolvedValue(null);
  employeeFindMany.mockResolvedValue([]);
  employeeUpdateMany.mockResolvedValue({ count: 1 });
  recordFindFirst.mockResolvedValue(null);
  recordFindMany.mockResolvedValue([]);
  recordCount.mockResolvedValue(0);
  recordDeleteMany.mockResolvedValue({ count: 1 });
  recordGroupBy.mockResolvedValue([]);
});

/**
 * Info: (20260901 - Luphia) 租戶隔離：**每一支**都要帶 `accountBookId`。
 *
 * 逐支列出來而不是只測一兩支：這條規則的價值等於它涵蓋的方法數，
 * 而漏掉的那一支不會有人發現 —— 它只是安靜地跨租戶。
 */
describe("薪資 repository 的租戶隔離", () => {
  it("getEmployeeById 帶 accountBookId 與 deletedAt", async () => {
    await salaryCalculatorEmployeeRepo.getEmployeeById(BOOK, OTHER_EMPLOYEE);

    expect(whereOf(employeeFindFirst)).toEqual({
      accountBookId: BOOK,
      id: OTHER_EMPLOYEE,
      /**
       * Info: (20260901 - Luphia) `deletedAt` 與 `accountBookId` 一起釘。
       *
       * 少了它，已軟刪除的員工還查得到 —— 而 `saveRecord` 正是用這一支
       * 判斷「這個員工存不存在」，於是刪掉的人還能被存進新的薪資紀錄。
       */
      deletedAt: null,
    });
  });

  it("listEmployees 帶 accountBookId 與 deletedAt", async () => {
    await salaryCalculatorEmployeeRepo.listEmployees(BOOK);

    expect(whereOf(employeeFindMany)).toMatchObject({
      accountBookId: BOOK,
      deletedAt: null,
    });
  });

  it("updateEmployee 帶 accountBookId 與 deletedAt", async () => {
    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: OTHER_EMPLOYEE,
      input: employeeInputOf(),
    });

    expect(whereOf(employeeUpdateMany)).toEqual({
      accountBookId: BOOK,
      id: OTHER_EMPLOYEE,
      deletedAt: null,
    });
  });

  it("softDeleteEmployee 帶 accountBookId 與 deletedAt", async () => {
    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      accountBookId: BOOK,
      employeeId: OTHER_EMPLOYEE,
    });

    expect(whereOf(employeeUpdateMany)).toEqual({
      accountBookId: BOOK,
      id: OTHER_EMPLOYEE,
      deletedAt: null,
    });
  });

  it("getRecordById 帶 accountBookId", async () => {
    await salaryRecordRepo.getRecordById(BOOK, RECORD);

    expect(whereOf(recordFindFirst)).toEqual({
      accountBookId: BOOK,
      id: RECORD,
    });
  });

  it("deleteRecord 帶 accountBookId", async () => {
    await salaryRecordRepo.deleteRecord({
      accountBookId: BOOK,
      recordId: RECORD,
    });

    expect(whereOf(recordDeleteMany)).toMatchObject({
      accountBookId: BOOK,
      id: RECORD,
    });
  });

  /**
   * Info: (20260901 - Luphia) `listRecords` 一次發**三支**查詢，三支都要帶帳本。
   *
   * 逐支斷言而不是只驗 `findMany`：`count` 掉了帳本會讓分頁的總筆數
   * 變成全站的（頁碼因此指向查不到東西的頁），而 `groupBy` 掉了帳本
   * 會讓期間下拉選單列出**別的帳本有資料的月份** —— 那是一個安靜的
   * 跨租戶訊號洩漏，畫面上看起來只是多了幾個選項。
   */
  it("listRecords 的三支查詢都帶 accountBookId", async () => {
    await salaryRecordRepo.listRecords({
      accountBookId: BOOK,
      page: 1,
      pageSize: 20,
    });

    expect(whereOf(recordFindMany)).toMatchObject({ accountBookId: BOOK });
    expect(whereOf(recordCount)).toMatchObject({ accountBookId: BOOK });
    expect(whereOf(recordGroupBy)).toMatchObject({ accountBookId: BOOK });
  });
});

/**
 * Info: (20260901 - Luphia) 軟刪除必須讓出 `activeNumber`（review 異常 2）。
 *
 * 斷言的是**送給資料庫的 `data`**，不是 repository 內部那次不變式檢查 ——
 * 後者原本讀的是三個就地造出來的常數，寫對寫錯都通過（§1.9）。
 * 那道檢查已改成讀同一個 `data`，而這一條是它的外部證據：
 * 即使有人把兩者又拆開，這裡仍然會紅。
 */
describe("軟刪除讓出 activeNumber", () => {
  it("data 同時寫 deletedAt 與 activeNumber: null", async () => {
    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      accountBookId: BOOK,
      employeeId: OTHER_EMPLOYEE,
    });

    const data = argOf(employeeUpdateMany).data as Record<string, unknown>;

    expect(data.activeNumber).toBeNull();
    expect(data.deletedAt).toBeInstanceOf(Date);
  });

  /**
   * Info: (20260901 - Luphia) 反面：存活的列必須**帶著**自己的編號。
   *
   * 這一條與上面成對。只驗刪除那一半的話，把 `activeNumberFor` 改成
   * 「一律回 null」會讓上面通過，而效果是唯一鍵從此形同虛設 ——
   * 同一個編號可以有兩筆存活列，而「這個月的薪資屬於誰」變成擲骰子。
   */
  it("更新存活員工時 activeNumber 等於 number", async () => {
    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: OTHER_EMPLOYEE,
      input: employeeInputOf(),
    });

    const data = argOf(employeeUpdateMany).data as Record<string, unknown>;

    expect(data.activeNumber).toBe("A012");
    expect(data.number).toBe("A012");
  });
});
