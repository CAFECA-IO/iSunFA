import { describe, it, expect, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { salaryCalculatorEmployeeRepo } from "@/repositories/salary_calculator_employee.repo";
import { ISalaryCalculatorEmployeeWriteInput } from "@/interfaces/salary_record";
import { SALARY_PROFILE_FIELDS } from "@/lib/utils/salary_profile_diff";

declare const jest: {
  fn: (impl?: (...args: never[]) => unknown) => unknown;
  mock: (moduleName: string, factory: () => unknown) => void;
  clearAllMocks: () => void;
};

/**
 * Info: (20260908 - Julian) 薪資異動紀錄的**寫入**護欄。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §5
 *
 * ## 這一支守的是什麼
 *
 * `salary_profile_diff.test.ts` 守「什麼算一次變動」（純函式）。
 * 這一支守它有沒有真的被寫下去，以及**寫下去的內容從哪裡來**。
 *
 * 三個缺陷是這裡唯一要抓的東西，它們都有一個共同點：**畫面完全正常**。
 * 員工檔照樣改得動、列表照樣顯示新值，只有異動表少了一列或多了一列錯的 ——
 * 而那件事要等到有人來要三年前的資料才會被發現。
 *
 * 1. `before` 取自前端送來的 payload，而不是資料庫當下那一列
 * 2. 追加不在交易裡（檔改了、紀錄沒寫，或反過來）
 * 3. 三個寫入入口漏掉其中一個
 *
 * ## 為什麼 mock `prisma` 而不是 mock repository
 *
 * 要驗的正是 repository 交給資料庫的那個物件。mock 掉 repository 就等於
 * mock 掉受測對象 —— 形狀比照 `salary_repo_scope.test.ts`。
 */

/**
 * Info: (20260908 - Julian) `$transaction` 把回呼餵**同一組替身**。
 *
 * 給 `tx` 另一組 `jest.fn` 的話，下面每一條斷言都會讀到一個從沒被呼叫過的
 * 替身 —— 全部靜靜地空過，而空過看起來和通過一模一樣。
 */
jest.mock("@/lib/prisma", () => {
  const client = {
    salaryCalculatorEmployee: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => null),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    salaryEmployeeProfileChange: {
      create: jest.fn(async () => null),
    },
  };

  return {
    prisma: {
      ...client,
      $transaction: jest.fn(
        async (run: (tx: typeof client) => Promise<unknown>) => run(client),
      ),
    },
  };
});

const asMock = (fn: unknown) =>
  fn as {
    mock: { calls: unknown[][] };
    mockResolvedValue: (value: unknown) => void;
    mockResolvedValueOnce: (value: unknown) => void;
  };

const employeeFindFirst = asMock(prisma.salaryCalculatorEmployee.findFirst);
const employeeCreate = asMock(prisma.salaryCalculatorEmployee.create);
const employeeUpdateMany = asMock(prisma.salaryCalculatorEmployee.updateMany);
const changeCreate = asMock(prisma.salaryEmployeeProfileChange.create);
const transaction = asMock(
  (prisma as unknown as { $transaction: unknown }).$transaction,
);

const BOOK = "book-1";
const EMPLOYEE = "employee-1";

const CHANGE = {
  changedByUserId: "user-7",
  effectiveYear: 2026,
  effectiveMonth: 10,
  reason: "年度調薪",
};

const rowFixture = (patch: Record<string, unknown> = {}) => ({
  id: EMPLOYEE,
  name: "王小明",
  number: "A001",
  email: "ming@example.com",
  activeNumber: "A001",
  accountBookId: BOOK,
  employeeId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null,
  baseSalary: 40000n,
  mealAllowance: 2400n,
  otherAllowanceTaxable: 0n,
  otherAllowanceTaxFree: 0n,
  industryCode: 42,
  isForeignWorker: false,
  employmentType: "FULL_TIME",
  baseSalary30Days: false,
  isLaborInsured: true,
  isHealthInsured: true,
  isPensionInsured: true,
  dependentsCount: 0,
  voluntaryPensionRate: 0,
  hireDate: new Date("2026-01-01T00:00:00.000Z"),
  resignDate: null,
  // Info: (20260909 - Julian) 留職停薪（#6774）；資料庫列這一側是 Date
  leaveStartDate: null,
  leaveEndDate: null,
  ...patch,
});

/**
 * Info: (20260908 - Julian) 寫入輸入整組必填 —— 少一欄會落到 schema 的 `@default`
 * （`ISalaryCalculatorEmployeeWriteInput` 的註解），所以這裡補齊，
 * 只留下被斷言的那幾欄由呼叫端覆寫。
 */
const inputOf = (
  patch: Partial<ISalaryCalculatorEmployeeWriteInput> = {},
): ISalaryCalculatorEmployeeWriteInput => ({
  name: "王小明",
  number: "A001",
  email: "ming@example.com",
  baseSalary: 40000,
  mealAllowance: 2400,
  otherAllowanceTaxable: 0,
  otherAllowanceTaxFree: 0,
  industryCode: 42,
  isForeignWorker: false,
  employmentType: "FULL_TIME",
  baseSalary30Days: false,
  isLaborInsured: true,
  isHealthInsured: true,
  isPensionInsured: true,
  dependentsCount: 0,
  voluntaryPensionRate: 0,
  // Info: (20260909 - Julian) 寫入輸入這一側是 Unix 秒／null（#6774）
  leaveStartDate: null,
  leaveEndDate: null,
  hireDate: 1_767_225_600,
  resignDate: null,
  ...patch,
});

const dataOf = (mock: ReturnType<typeof asMock>): Record<string, unknown> => {
  const [arg] = mock.mock.calls[mock.mock.calls.length - 1] as [
    { data: Record<string, unknown> },
  ];
  return arg.data;
};

beforeEach(() => {
  jest.clearAllMocks();
  employeeFindFirst.mockResolvedValue(rowFixture());
  employeeCreate.mockResolvedValue(rowFixture());
  employeeUpdateMany.mockResolvedValue({ count: 1 });
  changeCreate.mockResolvedValue(null);
});

describe("三個寫入入口都留痕", () => {
  /**
   * Info: (20260908 - Julian) 漏掉其中一個入口是這個功能最可能的死法。
   *
   * 員工檔的寫入有三條路，而「某一條沒留痕」在畫面上完全看不出來。
   * 這三條測試放在最前面，是因為它們是這張表存在的前提 ——
   * 底下所有關於內容正確性的斷言，都預設了「有一列被寫出來」。
   */
  it("createEmployee 追加一列 CREATE", async () => {
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: inputOf(),
      change: CHANGE,
    });

    expect(changeCreate.mock.calls.length).toBe(1);
    expect(dataOf(changeCreate).action).toBe("CREATE");
  });

  it("updateEmployee 追加一列 UPDATE", async () => {
    employeeFindFirst.mockResolvedValueOnce(rowFixture());
    employeeFindFirst.mockResolvedValueOnce(rowFixture({ baseSalary: 45000n }));

    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      input: inputOf({ baseSalary: 45000 }),
      change: CHANGE,
    });

    expect(changeCreate.mock.calls.length).toBe(1);
    expect(dataOf(changeCreate).action).toBe("UPDATE");
  });

  it("softDeleteEmployee 追加一列 DELETE", async () => {
    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      change: CHANGE,
    });

    expect(changeCreate.mock.calls.length).toBe(1);
    expect(dataOf(changeCreate).action).toBe("DELETE");
  });
});

describe("before 的來源", () => {
  /**
   * Info: (20260908 - Julian) **這是整支測試最重要的一條。**
   *
   * 前端手上有它載入時抓的舊值，拿它當 `before` 可以省一次查詢 ——
   * 而那份可能已經過期（別人剛改過），也可能被偽造。
   *
   * 缺陷的形狀是「`before` 取自 `input` 而不是資料庫」。它的症狀是
   * **異動紀錄的前值等於後值**（因為 `input` 就是要寫進去的東西），
   * 於是歷程上每一列都顯示「本薪 45,000 → 45,000」。
   * 畫面不會壞、沒有例外、沒有警告。
   *
   * 這裡讓資料庫的舊值（40,000）與送進來的新值（45,000）不同，
   * 所以「從哪裡讀的」在斷言上分得出來。
   */
  it("before 是資料庫當下那一列，不是送進來的 input", async () => {
    employeeFindFirst.mockResolvedValueOnce(rowFixture());
    employeeFindFirst.mockResolvedValueOnce(rowFixture({ baseSalary: 45000n }));

    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      input: inputOf({ baseSalary: 45000 }),
      change: CHANGE,
    });

    const data = dataOf(changeCreate);
    const before = data.beforeSnapshot as Record<string, unknown>;
    const after = data.afterSnapshot as Record<string, unknown>;

    expect(before.baseSalary).toBe(40000);
    expect(after.baseSalary).toBe(45000);
    expect(data.changedFields).toEqual(["baseSalary"]);
  });

  /**
   * Info: (20260908 - Julian) 讀舊值也要帶帳本與 deletedAt。
   *
   * 這一支查詢是 20260908 新加的，而它與 `updateMany` 的 `where` 是同一組條件。
   * 少了 `accountBookId`，猜到別人家員工的 uuid 就能讀到那個人的薪資
   * **並把它寫進自己帳本的異動紀錄裡** —— 一個讀取洩漏藏在寫入路徑上。
   */
  it("讀舊值的查詢帶 accountBookId 與 deletedAt", async () => {
    employeeFindFirst.mockResolvedValueOnce(rowFixture());
    employeeFindFirst.mockResolvedValueOnce(rowFixture({ baseSalary: 45000n }));

    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      input: inputOf({ baseSalary: 45000 }),
      change: CHANGE,
    });

    const [arg] = employeeFindFirst.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(arg.where.accountBookId).toBe(BOOK);
    expect(arg.where.id).toBe(EMPLOYEE);
    expect(arg.where.deletedAt).toBeNull();
  });
});

describe("寫下來的內容", () => {
  it("誰改的、何時生效、原因都照 change 帶進去", async () => {
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: inputOf(),
      change: CHANGE,
    });

    const data = dataOf(changeCreate);
    expect(data.changedByUserId).toBe(CHANGE.changedByUserId);
    expect(data.effectiveYear).toBe(CHANGE.effectiveYear);
    expect(data.effectiveMonth).toBe(CHANGE.effectiveMonth);
    expect(data.reason).toBe(CHANGE.reason);
  });

  it("異動列也帶 accountBookId（租戶鍵）", async () => {
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: inputOf(),
      change: CHANGE,
    });

    expect(dataOf(changeCreate).accountBookId).toBe(BOOK);
  });

  /**
   * Info: (20260908 - Julian) 建檔的 `changedFields` 是**全部欄位**，不是空的。
   *
   * 讀取端的欄位篩選（「只看本薪的變動」）應該撈得到建檔那一列：
   * 一個人的第一筆本薪也是他薪資歷程的一部分。給空陣列的話，
   * 篩選之後的歷程會從第二次調薪開始 —— 而少的那一列正是起點。
   */
  it("CREATE 的 changedFields 是全部欄位", async () => {
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: inputOf(),
      change: CHANGE,
    });

    expect(dataOf(changeCreate).changedFields).toEqual(SALARY_PROFILE_FIELDS);
  });

  it("CREATE 沒有 before，DELETE 沒有 after", async () => {
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: inputOf(),
      change: CHANGE,
    });
    const created = dataOf(changeCreate);
    expect(created.afterSnapshot).not.toBeNull();

    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      change: CHANGE,
    });
    const deleted = dataOf(changeCreate);
    expect((deleted.beforeSnapshot as Record<string, unknown>).baseSalary).toBe(
      40000,
    );
  });

  /**
   * Info: (20260908 - Julian) 快照裡不留 `id`。
   *
   * 它是列的識別，不是員工的條件 —— 而異動列自己已經有 `employeeId`。
   * 留著會讓快照與 `ISalaryEmployeeProfileSnapshot` 的形狀分岔，
   * 而讀取端的 diff 走的是那個型別的欄位清單。
   */
  it("快照不含 id", async () => {
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: inputOf(),
      change: CHANGE,
    });

    const after = dataOf(changeCreate).afterSnapshot as Record<string, unknown>;
    expect(after.id).toBeUndefined();
    expect(after.baseSalary).toBe(40000);
  });
});

describe("沒有實際變動就不寫列", () => {
  /**
   * Info: (20260908 - Julian) 打開彈窗、什麼都沒改就按儲存，是很常見的操作。
   *
   * 每一次都留一列的話，歷程會被無意義的列淹沒 ——
   * 而淹沒的後果是真正的調薪找不到。這是「多報」這個方向的唯一防線。
   */
  it("前後一致時不追加", async () => {
    employeeFindFirst.mockResolvedValueOnce(rowFixture());
    employeeFindFirst.mockResolvedValueOnce(rowFixture());

    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      input: inputOf(),
      change: CHANGE,
    });

    expect(employeeUpdateMany.mock.calls.length).toBe(1);
    expect(changeCreate.mock.calls.length).toBe(0);
  });
});

describe("交易", () => {
  /**
   * Info: (20260908 - Julian) 三支寫入都在一個交易裡。
   *
   * 分兩次寫、中間失敗，會留下「檔改了、沒有紀錄」（靜默的資料遺失）
   * 或「有紀錄、檔沒改」（假的歷史）。兩者都不會有任何錯誤訊息。
   */
  it("三支寫入都開交易", async () => {
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK,
      input: inputOf(),
      change: CHANGE,
    });
    expect(transaction.mock.calls.length).toBe(1);

    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      change: CHANGE,
    });
    expect(transaction.mock.calls.length).toBe(2);

    employeeFindFirst.mockResolvedValueOnce(rowFixture());
    employeeFindFirst.mockResolvedValueOnce(rowFixture({ baseSalary: 45000n }));
    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      input: inputOf({ baseSalary: 45000 }),
      change: CHANGE,
    });
    expect(transaction.mock.calls.length).toBe(3);
  });
});

describe("只增不改", () => {
  const source = readFileSync(
    path.join(
      process.cwd(),
      "src",
      "repositories",
      "salary_calculator_employee.repo.ts",
    ),
    "utf-8",
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  /**
   * Info: (20260908 - Julian) 應用層沒有任何路徑改得動或刪得掉異動列。
   *
   * schema 上已經沒有 `updatedAt` / `deletedAt`（那是型別層面的表態），
   * 這一條守的是行為層面：**沒有人寫出那樣的呼叫**。
   *
   * 要誠實的是它守不住什麼：有資料庫權限的人仍然 `UPDATE` 得動，
   * 任何純應用層的方案都擋不住那件事（計劃書 §10）。
   * 這一條擋的是「日後有人為了修一筆打錯的原因而加一支編輯 API」——
   * 那一刻這張表就不再是稽核軌跡了。
   */
  it("repository 對異動表只有 create，沒有 update / delete", () => {
    expect(source).toContain("salaryEmployeeProfileChange.create");
    expect(source).not.toMatch(/salaryEmployeeProfileChange\.update/);
    expect(source).not.toMatch(/salaryEmployeeProfileChange\.delete/);
    expect(source).not.toMatch(/salaryEmployeeProfileChange\.upsert/);
  });

  /**
   * Info: (20260908 - Julian) `changedFields` 只能由 `changedFieldsOf()` 產生。
   *
   * 手組一份就是第二個答案，而兩個答案不一致的症狀是**篩選會騙人**：
   * 使用者篩「本薪」，一筆真的改了本薪的列沒出現。
   */
  it("changedFields 走 changedFieldsOf，不手組", () => {
    expect(source).toContain("changedFieldsOf(");
  });
});
