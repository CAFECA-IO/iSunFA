import { describe, it, expect, beforeEach } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { salaryCalculatorEmployeeRepo } from "@/repositories/salary_calculator_employee.repo";
import { salaryRecordRepo } from "@/repositories/salary_record.repo";
import { salaryPaySlipDeliveryRepo } from "@/repositories/salary_pay_slip_delivery.repo";
import { readFileSync } from "fs";
import { join } from "path";
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
    salaryPaySlipDelivery: {
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => null),
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
const employeeCreate = prisma.salaryCalculatorEmployee
  .create as unknown as Mock;
const recordFindFirst = prisma.salaryRecord.findFirst as unknown as Mock;
const recordFindMany = prisma.salaryRecord.findMany as unknown as Mock;
const recordCount = prisma.salaryRecord.count as unknown as Mock;
const recordDeleteMany = prisma.salaryRecord.deleteMany as unknown as Mock;
const recordGroupBy = prisma.salaryRecord.groupBy as unknown as Mock;
const recordUpsert = prisma.salaryRecord.upsert as unknown as Mock;
const deliveryFindMany = prisma.salaryPaySlipDelivery
  .findMany as unknown as Mock;
const deliveryCreate = prisma.salaryPaySlipDelivery.create as unknown as Mock;

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

/**
 * Info: (20260905 - Luphia) 兩個寫入路徑的替身回傳值。
 *
 * 只補到「mapper 走得完」為止 —— 這一檔驗的是**交給資料庫的參數**，
 * 回傳值只是為了讓呼叫不炸在無關的地方。
 */
const salaryRowFixture = () => ({
  id: "r-1",
  year: 2026,
  month: 8,
  accountBookId: BOOK,
  employeeId: "e-9",
  createdByUserId: "u-1",
  calculatorVersion: "v1",
  totalPayment: BigInt(0),
  totalSalaryTaxable: BigInt(0),
  totalEmployerCost: BigInt(0),
  inputSnapshot: {},
  resultSnapshot: {},
  createdAt: new Date(0),
  updatedAt: new Date(0),
  employee: { id: "e-9", name: "王小明", number: "A012", email: null },
  // Info: (20260905 - Luphia) `toSummary` 會讀這個關聯算「最近一次寄出」
  paySlipDeliveries: [],
});

const deliveryRowFixture = () => ({
  id: "d-1",
  salaryRecordId: RECORD,
  accountBookId: BOOK,
  recipientEmail: "a@b.c",
  status: "SENT",
  failureReason: null,
  sentBy: { id: "u-1", name: "Luphia" },
  createdAt: new Date(0),
});

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
  /**
   * Info: (20260905 - Luphia) 替身要回得了 mapper 走得完的列（§1.8）。
   *
   * 回一個空物件的話，失敗會發生在 `toDetail` 而不是斷言上 —— 那時看到的
   * 是一個與被測行為無關的 TypeError，而真正要驗的「交出去的條件」
   * 根本還沒被檢查。
   */
  recordUpsert.mockResolvedValue(salaryRowFixture());
  deliveryFindMany.mockResolvedValue([]);
  deliveryCreate.mockResolvedValue(deliveryRowFixture());
});

/**
 * Info: (20260905 - Luphia) 從**列舉**改成**規則**（review #6769）。
 *
 * ## 上一版守不住什麼
 *
 * 這一檔原本逐支列出七條 `it`，涵蓋範圍等於「我當時想得到的那幾支」。
 * 三支 repo 現在有 13 支 public 方法，而其中六支從來沒被驗過 ——
 * `upsertRecord` 甚至是這個檔案誕生時就在外面的，不需要有人新增方法
 * 才會出現缺口。實測：把 `listRecordsByIds` 的 `accountBookId` 拿掉，
 * 5,927 條全綠。
 *
 * 差別只有一個字：**預設**。列舉是 opt-in（新方法自動在外面），
 * 規則是 opt-out（新方法自動在裡面，要排除得主動登記並說明理由）。
 * 安全性質的守門必須是後者 —— 漏掉的那一支不會有人發現，
 * 它只是安靜地跨租戶。這正是檢查清單 §1.1 的處方。
 *
 * ## 兩個不變式分開宣告
 *
 * 上一版把「帶 `accountBookId`」與「濾 `deletedAt`」寫在同一條斷言裡，
 * 而它們是兩件事、兩個理由：
 *
 * - **租戶隔離**對每一支都成立，沒有例外
 * - **生命週期**是逐支的選擇：動作路徑只認存活中的，顯示路徑可以要全部
 *
 * 焊在一起的後果是「想加一支列出已刪除員工的查詢」時，最順手的動作
 * 是把 `deletedAt` 從既有方法拿掉 —— 而那會讓「替已移除的員工建薪資紀錄」
 * 與「把薪資單寄給已經離開的人」一起靜靜變成可能。
 * 分開之後，新增 `findEmployeeById`（任何狀態）只需要在下面宣告
 * `ANY_STATE`，不必也不該動到現有的動作路徑。
 */

const REPO_FILES = [
  "src/repositories/salary_record.repo.ts",
  "src/repositories/salary_calculator_employee.repo.ts",
  "src/repositories/salary_pay_slip_delivery.repo.ts",
] as const;

/**
 * Info: (20260905 - Luphia) 生命週期語意：這一支看得到已軟刪除的列嗎。
 *
 * `ACTIVE_ONLY` 的方法必須在 `where` 帶 `deletedAt: null`。
 * `ANY_STATE` 是刻意要看到全部（歷史清單之類），必須寫明理由。
 * 只有 `SalaryCalculatorEmployee` 有軟刪除；另外兩張表沒有 `deletedAt`，
 * 所以標 `NO_SOFT_DELETE`。
 */
const LIFECYCLE: Record<
  string,
  "ACTIVE_ONLY" | "ANY_STATE" | "NO_SOFT_DELETE"
> = {
  // Info: (20260905 - Luphia) 動作路徑：saveRecord 與寄薪資單都不該認已刪除的員工
  getActiveEmployeeById: "ACTIVE_ONLY",
  // Info: (20260905 - Luphia) 挑人彈窗與名單：選得到的人就是還在的人
  listEmployees: "ACTIVE_ONLY",
  updateEmployee: "ACTIVE_ONLY",
  softDeleteEmployee: "ACTIVE_ONLY",
  // Info: (20260905 - Luphia) 建立時那一列還不存在，沒有 deletedAt 可濾
  createEmployee: "NO_SOFT_DELETE",
  upsertRecord: "NO_SOFT_DELETE",
  listRecords: "NO_SOFT_DELETE",
  listRecordsByIds: "NO_SOFT_DELETE",
  getRecordById: "NO_SOFT_DELETE",
  deleteRecord: "NO_SOFT_DELETE",
  createDelivery: "NO_SOFT_DELETE",
  listByRecord: "NO_SOFT_DELETE",
  listByAccountBook: "NO_SOFT_DELETE",
};

/**
 * Info: (20260905 - Luphia) 不需要帶 `accountBookId` 的方法。
 *
 * **今天是空的，而且應該一直是空的** —— 三支 repo 服務的都是帳本底下的資料。
 * 留這個出口是為了讓「真的有例外」時它出現在 diff 上、需要在 review 裡
 * 被解釋，而不是靜靜地不被守。長度由下一條測試釘住，只能變短。
 */
const TENANT_EXEMPT: Record<string, string> = {};
const TENANT_EXEMPT_MAX = 0;

const publicMethodsOf = (relativePath: string): string[] => {
  const source = readFileSync(join(process.cwd(), relativePath), "utf-8");
  return [...source.matchAll(/^ {2}public async ([A-Za-z0-9_]+)\(/gm)].map(
    (match) => match[1],
  );
};

const ALL_METHODS = REPO_FILES.flatMap(publicMethodsOf).sort();

describe("覆蓋率本身：每一支方法都要被分類過", () => {
  /**
   * Info: (20260905 - Luphia) 掃描根沒有掃到空氣 —— 正則寫錯時這一條先紅。
   */
  it("三支 repo 都掃得到 public 方法", () => {
    for (const file of REPO_FILES) {
      expect(publicMethodsOf(file).length).toBeGreaterThan(0);
    }
  });

  /**
   * Info: (20260905 - Luphia) **新增第 14 支方法時，這一條會紅。**
   *
   * 訊息直接說出是哪一支沒分類，作者只有兩條路：補一條行為斷言，
   * 或登記進 `TENANT_EXEMPT` 並寫下理由 —— 而後者會出現在 diff 上。
   */
  it("沒有未分類的方法", () => {
    const classified = new Set([
      ...Object.keys(LIFECYCLE),
      ...Object.keys(TENANT_EXEMPT),
    ]);
    expect(ALL_METHODS.filter((name) => !classified.has(name))).toEqual([]);
  });

  // Info: (20260905 - Luphia) 反面：分類表裡不該有已經不存在的方法（改名會留下孤兒）
  it("分類表沒有指向不存在的方法", () => {
    const actual = new Set(ALL_METHODS);
    expect(Object.keys(LIFECYCLE).filter((n) => !actual.has(n))).toEqual([]);
  });

  it("租戶豁免清單沒有變長", () => {
    expect(Object.keys(TENANT_EXEMPT).length).toBeLessThanOrEqual(
      TENANT_EXEMPT_MAX,
    );
  });
});

/**
 * Info: (20260905 - Luphia) 租戶隔離：**每一支都要帶 `accountBookId`，沒有例外**。
 *
 * `accountBookId` 在這裡做的是**授權**不是識別 —— `employeeId` / `recordId`
 * 都是 uuid 主鍵，拿它就找得到列；帶帳本才讓「別人家的那一列」變成查無此人。
 * 而這不是理論：`saveRecord` 的 `employeeId` 來自 request body，
 * `exportRecordsCsv` 的 `recordIds` 也是。
 *
 * 拿掉之後正確性得搬到呼叫端（`if (row.accountBookId !== accountBookId)`），
 * 也就是把一個地方的判斷變成 N 個呼叫端各記得一次。
 */
describe("租戶隔離：每一支交給資料庫的條件都帶帳本", () => {
  const call = async (name: string): Promise<void> => {
    const employeeInput = employeeInputOf();
    switch (name) {
      case "getActiveEmployeeById":
        await salaryCalculatorEmployeeRepo.getActiveEmployeeById(BOOK, "e-9");
        return;
      case "listEmployees":
        await salaryCalculatorEmployeeRepo.listEmployees(BOOK);
        return;
      case "createEmployee":
        await salaryCalculatorEmployeeRepo.createEmployee({
          accountBookId: BOOK,
          input: employeeInput,
        });
        return;
      case "updateEmployee":
        await salaryCalculatorEmployeeRepo.updateEmployee({
          accountBookId: BOOK,
          employeeId: "e-9",
          input: employeeInput,
        });
        return;
      case "softDeleteEmployee":
        await salaryCalculatorEmployeeRepo.softDeleteEmployee({
          accountBookId: BOOK,
          employeeId: "e-9",
        });
        return;
      case "listRecords":
        await salaryRecordRepo.listRecords({
          accountBookId: BOOK,
          page: 1,
          pageSize: 20,
        });
        return;
      case "listRecordsByIds":
        await salaryRecordRepo.listRecordsByIds(BOOK, ["r-1"]);
        return;
      case "getRecordById":
        await salaryRecordRepo.getRecordById(BOOK, RECORD);
        return;
      case "deleteRecord":
        await salaryRecordRepo.deleteRecord({
          accountBookId: BOOK,
          recordId: RECORD,
        });
        return;
      case "listByRecord":
        await salaryPaySlipDeliveryRepo.listByRecord({
          accountBookId: BOOK,
          salaryRecordId: RECORD,
        });
        return;
      case "listByAccountBook":
        await salaryPaySlipDeliveryRepo.listByAccountBook({
          accountBookId: BOOK,
          limit: 20,
        });
        return;
      default:
        throw new Error(`未接線的方法：${name}`);
    }
  };

  /**
   * Info: (20260905 - Luphia) `upsertRecord` 與 `createDelivery` 是**寫入**：
   * 帳本進的是 `data` 不是 `where`，所以另外驗（見下方）。
   */
  const WHERE_METHODS = ALL_METHODS.filter(
    (name) =>
      !["upsertRecord", "createDelivery", "createEmployee"].includes(name),
  );

  it.each(WHERE_METHODS)("%s 的 where 帶 accountBookId", async (name) => {
    jest.clearAllMocks();
    await call(name);

    const everyCall = [
      employeeFindFirst,
      employeeFindMany,
      employeeUpdateMany,
      recordFindFirst,
      recordFindMany,
      recordCount,
      recordGroupBy,
      recordDeleteMany,
      deliveryFindMany,
    ].flatMap((mock) => mock.mock.calls.map((args) => args[0]));

    expect(everyCall.length).toBeGreaterThan(0);
    for (const arg of everyCall) {
      const where = (arg as { where?: Record<string, unknown> }).where;
      expect(where?.accountBookId).toBe(BOOK);
    }
  });

  /**
   * Info: (20260905 - Luphia) 寫入路徑：帳本要進 `data`，否則那一列不屬於任何帳本
   *（或屬於錯的那一本）。`upsert` 的 `where` 是複合唯一鍵，也含帳本。
   */
  it("upsertRecord 的 where 與 data 都帶 accountBookId", async () => {
    jest.clearAllMocks();
    await salaryRecordRepo.upsertRecord({
      accountBookId: BOOK,
      employeeId: "e-9",
      createdByUserId: "u-1",
      year: 2026,
      month: 8,
      input: {} as never,
      result: {} as never,
      calculatorVersion: "v1",
      totalPayment: BigInt(0),
      totalSalaryTaxable: BigInt(0),
      totalEmployerCost: BigInt(0),
    });

    const arg = argOf(recordUpsert);
    const where = arg.where as Record<string, Record<string, unknown>>;
    const create = arg.create as Record<string, unknown>;

    expect(where.accountBookId_employeeId_year_month.accountBookId).toBe(BOOK);
    expect(create.accountBookId).toBe(BOOK);
  });

  it("createDelivery 的 data 帶 accountBookId", async () => {
    jest.clearAllMocks();
    await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK,
      salaryRecordId: RECORD,
      recipientEmail: "a@b.c",
      status: "SENT" as never,
      failureReason: null,
      sentByUserId: "u-1",
    });

    const data = argOf(deliveryCreate).data as Record<string, unknown>;
    expect(data.accountBookId).toBe(BOOK);
  });
});

/**
 * Info: (20260905 - Luphia) 生命週期：宣告成 `ACTIVE_ONLY` 的就必須真的濾。
 *
 * 與租戶那一組分開，因為它們是兩個不變式。這一組讓「我要一支看得到
 * 已刪除員工的查詢」變成一個**加一行宣告**的動作，而不是「把既有方法的
 * 條件拿掉」——後者會連帶鬆掉寄薪資單與存薪資紀錄兩條動作路徑。
 */
describe("生命週期：ACTIVE_ONLY 的方法真的濾掉軟刪除", () => {
  const ACTIVE_ONLY = Object.keys(LIFECYCLE).filter(
    (name) => LIFECYCLE[name] === "ACTIVE_ONLY",
  );

  it("至少有一支是 ACTIVE_ONLY（否則下面整組空過）", () => {
    expect(ACTIVE_ONLY.length).toBeGreaterThan(0);
  });

  it.each(ACTIVE_ONLY)("%s 的 where 帶 deletedAt: null", async (name) => {
    jest.clearAllMocks();
    switch (name) {
      case "getActiveEmployeeById":
        await salaryCalculatorEmployeeRepo.getActiveEmployeeById(BOOK, "e-9");
        break;
      case "listEmployees":
        await salaryCalculatorEmployeeRepo.listEmployees(BOOK);
        break;
      case "updateEmployee":
        await salaryCalculatorEmployeeRepo.updateEmployee({
          accountBookId: BOOK,
          employeeId: "e-9",
          input: employeeInputOf(),
        });
        break;
      case "softDeleteEmployee":
        await salaryCalculatorEmployeeRepo.softDeleteEmployee({
          accountBookId: BOOK,
          employeeId: "e-9",
        });
        break;
      default:
        throw new Error(`未接線的方法：${name}`);
    }

    const everyCall = [
      employeeFindFirst,
      employeeFindMany,
      employeeUpdateMany,
    ].flatMap((mock) => mock.mock.calls.map((args) => args[0]));

    expect(everyCall.length).toBeGreaterThan(0);
    for (const arg of everyCall) {
      const where = (arg as { where?: Record<string, unknown> }).where;
      expect(where?.deletedAt).toBeNull();
    }
  });
});

/**
 * Info: (20260901 - Luphia) 租戶隔離：**每一支**都要帶 `accountBookId`。
 *
 * 逐支列出來而不是只測一兩支：這條規則的價值等於它涵蓋的方法數，
 * 而漏掉的那一支不會有人發現 —— 它只是安靜地跨租戶。
 */
describe("薪資 repository 的租戶隔離", () => {
  it("getActiveEmployeeById 帶 accountBookId 與 deletedAt", async () => {
    await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
      BOOK,
      OTHER_EMPLOYEE,
    );

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

/**
 * Info: (20260902 - Julian) 15 個常態屬性真的被交給資料庫。
 *
 * ## 這一組是一次真實回退的產物
 *
 * 20260902 把 develop 併進本支時，`updateEmployee` 組 `data` 的那一段被
 * `9dc404ff0`（把斷言接到真正的寫入）整塊取代，而那一版寫在 15 個常態屬性
 * 落地**之前** —— `...toWriteData(input)` 就這樣不見了。後果是編輯員工只
 * 寫得進姓名、編號、Email 與兩個金額，行業別、投保狀態、扶養人數、
 * 自提比例、到離職日全部原地不動。
 *
 * **症狀完全靜默**：`updateEmployee` 回傳的是重新查出來的那一列，
 * 所以畫面顯示「更新成功」，使用者要到下次打開表單才發現沒存進去。
 *
 * 當時全套測試只有 `salary_repo.e2e.test.ts` 紅 —— 而那一支需要真資料庫、
 * 只在 CI 的獨立步驟跑。這一組把同一件事搬進預設套件：這個檔案本來就在
 * 斷言「交給資料庫的那個物件」，多問 15 欄幾乎不花成本。
 *
 * 新增與更新**各守一次**：那次回退只吃掉 `updateEmployee`，
 * `createEmployee` 毫髮無傷 —— 而那是因為兩邊本來就是兩段獨立的程式碼，
 * 不是因為有人守著。
 */
describe("員工的常態屬性交給資料庫", () => {
  const HIRE_DATE = Date.parse("2026-08-15T00:00:00.000Z") / 1000;

  const CHANGED = {
    industryCode: 41,
    isForeignWorker: true,
    employmentType: "PART_TIME",
    baseSalary30Days: false,
    otherAllowanceTaxable: 1500,
    otherAllowanceTaxFree: 300,
    isLaborInsured: false,
    isHealthInsured: false,
    isPensionInsured: false,
    dependentsCount: 3,
    voluntaryPensionRate: 6,
    hireDate: HIRE_DATE,
    resignDate: null,
  };

  /**
   * Info: (20260902 - Julian) 逐欄斷言，不是 `toMatchObject(CHANGED)`。
   *
   * 後者在 `toWriteData` 整支消失時會因為金額欄的型別差異紅得莫名其妙，
   * 而逐欄列出時「哪一欄沒被寫進去」直接寫在失敗訊息上。
   * 金額落地是 `BigInt`、費率是 `Int`、日期是 `Date` —— 三種型別各驗一次。
   */
  const expectProfileIn = (data: Record<string, unknown>) => {
    expect(data.industryCode).toBe(41);
    expect(data.isForeignWorker).toBe(true);
    expect(data.employmentType).toBe("PART_TIME");
    expect(data.baseSalary30Days).toBe(false);
    expect(data.otherAllowanceTaxable).toBe(1500n);
    expect(data.otherAllowanceTaxFree).toBe(300n);
    expect(data.isLaborInsured).toBe(false);
    expect(data.isHealthInsured).toBe(false);
    expect(data.isPensionInsured).toBe(false);
    expect(data.dependentsCount).toBe(3);
    // Info: (20260902 - Julian) 費率是 Int 百分點，不是 BigInt 金額
    expect(data.voluntaryPensionRate).toBe(6);
    expect(data.hireDate).toEqual(new Date("2026-08-15T00:00:00.000Z"));
    expect(data.resignDate).toBeNull();
  };

  it("updateEmployee 把 15 欄一起交出去", async () => {
    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: OTHER_EMPLOYEE,
      input: employeeInputOf(CHANGED),
    });

    expectProfileIn(argOf(employeeUpdateMany).data as Record<string, unknown>);
  });

  it("createEmployee 把 15 欄一起交出去", async () => {
    /**
     * Info: (20260902 - Julian) `create` 的替身預設回 null，而 `createEmployee`
     * 會把回傳值餵給 `toFrontendFormat` —— 不給一列的話會炸在讀 `row.id`，
     * 而那個錯誤與這一條要驗的事無關。這裡只需要它不炸，
     * 斷言的對象仍然是**傳進去的參數**。
     */
    employeeCreate.mockResolvedValueOnce({
      id: OTHER_EMPLOYEE,
      name: "王小明",
      number: "A012",
      email: null,
      activeNumber: "A012",
      accountBookId: BOOK,
      employeeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      baseSalary: 40000n,
      mealAllowance: 2400n,
      otherAllowanceTaxable: 1500n,
      otherAllowanceTaxFree: 300n,
      industryCode: 41,
      isForeignWorker: true,
      employmentType: "PART_TIME",
      baseSalary30Days: false,
      isLaborInsured: false,
      isHealthInsured: false,
      isPensionInsured: false,
      dependentsCount: 3,
      voluntaryPensionRate: 6,
      hireDate: new Date("2026-08-15T00:00:00.000Z"),
      resignDate: null,
    });

    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: employeeInputOf(CHANGED),
    });

    expectProfileIn(argOf(employeeCreate).data as Record<string, unknown>);
  });
});
