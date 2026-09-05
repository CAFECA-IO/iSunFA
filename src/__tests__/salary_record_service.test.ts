import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS, IErrorDef } from "@/lib/utils/error_dictionary";
import {
  defaultSalaryCalculatorResult,
  ISalaryCalculatorOptions,
  ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
  ISalaryRecordDetail,
  ISalaryRecordPageResult,
  ISalaryRecordQueryOptions,
} from "@/interfaces/salary_record";
import {
  ISalaryCalculatorEmployeeRepository,
  SalaryEmployeeNumberTakenError,
} from "@/repositories/salary_calculator_employee.repo";
import {
  DEFAULT_EMPLOYEE_LEAVE,
  DEFAULT_EMPLOYEE_PROFILE,
} from "@/lib/utils/salary_employee_profile";
import { ISalaryRecordRepository } from "@/repositories/salary_record.repo";
import { SalaryRecordService } from "@/services/salary_record.service";
import { SALARY_EXPORT_MAX_RECORDS } from "@/constants/salary_export";

/**
 * Info: (20260831 - Julian) 薪資紀錄 service 的編排。
 *
 * ## 為什麼用手寫的假 repository 而不是 mock Prisma
 *
 * 沿用本專案既有的慣例（`leave_request_service.test.ts` 有明文）：
 * 「有沒有真的寫進去」是 repository 的事，那需要整合測試；
 * 這裡驗的是 service 的判斷 —— 誰擋得住、誰被允許、金額怎麼抽出來。
 * service 的 constructor 本來就開放注入，不需要動到模組系統。
 *
 * 假的紀錄 repository 用一個 Map 模擬
 * `@@unique([accountBookId, employeeId, year, month])`，
 * 讓「重存即覆寫」這件事在測試裡真的成立，而不是只斷言 upsert 被呼叫過。
 */

const BOOK = "book-a";
const OTHER_BOOK = "book-b";
const USER = "user-1";
const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111";

const employeeOf = (
  overrides: Partial<ISalaryCalculatorEmployee> = {},
): ISalaryCalculatorEmployee => ({
  // Info: (20260902 - Julian) 常態屬性整組必填；這一支測的是 service 的編排，用預設值即可。
  // 放在最前面，下面幾行才蓋得掉它的 baseSalary / mealAllowance
  ...DEFAULT_EMPLOYEE_PROFILE,
  ...DEFAULT_EMPLOYEE_LEAVE,
  // Info: (20260905 - Luphia) 完整度預設「沒有缺漏」；要驗警示的案例自己覆蓋（#6774）
  missingPeriods: [],
  id: EMPLOYEE_ID,
  name: "王小明",
  number: "A001",
  email: "ming@example.com",
  baseSalary: 30000,
  mealAllowance: 3000,
  ...overrides,
});

/**
 * Info: (20260902 - Julian) 新增／編輯員工的輸入：身分三欄 + 整組常態屬性。
 *
 * 名字帶 `employee` 前綴 —— 這個檔案下面已經有一支給**薪資紀錄**用的 `writeInputOf`。
 */
const employeeWriteInputOf = (
  overrides: Partial<ISalaryCalculatorEmployeeWriteInput> = {},
): ISalaryCalculatorEmployeeWriteInput => ({
  ...DEFAULT_EMPLOYEE_PROFILE,
  ...DEFAULT_EMPLOYEE_LEAVE,
  name: "李小華",
  number: "A001",
  email: "hua@example.com",
  baseSalary: 30000,
  mealAllowance: 0,
  ...overrides,
});

const optionsOf = (): ISalaryCalculatorOptions => ({
  year: 2026,
  month: 8,
  baseSalaryTaxable: 30000,
  baseSalaryTaxFree: 3000,
});

const resultOf = (
  overrides: Partial<ISalaryCalculatorUI> = {},
): ISalaryCalculatorUI => ({
  ...defaultSalaryCalculatorResult,
  totalPayment: 31000,
  totalSalaryTaxable: 30000,
  employerContribution: {
    ...defaultSalaryCalculatorResult.employerContribution,
    totalEmployerCost: 36000,
  },
  ...overrides,
});

const writeInputOf = (overrides = {}) => ({
  employeeId: EMPLOYEE_ID,
  year: 2026,
  month: 8,
  input: optionsOf(),
  result: resultOf(),
  calculatorVersion: "2026.1",
  ...overrides,
});

// Info: (20260831 - Julian) 斷言錯誤是「哪一個」API 錯誤，而不是只斷言「有丟東西」
const expectAppError = async (
  run: () => Promise<unknown>,
  def: IErrorDef,
): Promise<void> => {
  await expect(run()).rejects.toThrow(AppError);
  await run().catch((error: unknown) => {
    expect((error as AppError).apiCode).toBe(def.code);
  });
};

class FakeEmployeeRepo implements ISalaryCalculatorEmployeeRepository {
  // Info: (20260831 - Julian) key 是 `${accountBookId}|${employeeId}`，天然表達租戶隔離
  private readonly rows = new Map<string, ISalaryCalculatorEmployee>();

  public numberTaken = false;

  public updateCalls = 0;

  public seed(accountBookId: string, employee: ISalaryCalculatorEmployee) {
    this.rows.set(`${accountBookId}|${employee.id}`, employee);
  }

  public async listEmployees(accountBookId: string) {
    return [...this.rows.entries()]
      .filter(([key]) => key.startsWith(`${accountBookId}|`))
      .map(([, value]) => value);
  }

  public async getActiveEmployeeById(
    accountBookId: string,
    employeeId: string,
  ) {
    return this.rows.get(`${accountBookId}|${employeeId}`) ?? null;
  }

  public async createEmployee({
    accountBookId,
    input,
  }: {
    accountBookId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
  }) {
    if (this.numberTaken)
      throw new SalaryEmployeeNumberTakenError(input.number);
    const created = employeeOf({ ...input, number: input.number ?? "" });
    this.seed(accountBookId, created);
    return created;
  }

  public async updateEmployee({
    accountBookId,
    employeeId,
    input,
  }: {
    accountBookId: string;
    employeeId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
  }) {
    this.updateCalls += 1;
    if (this.numberTaken)
      throw new SalaryEmployeeNumberTakenError(input.number);
    const existing = this.rows.get(`${accountBookId}|${employeeId}`);
    if (!existing) return null;
    const updated = { ...existing, ...input, number: input.number ?? "" };
    this.rows.set(`${accountBookId}|${employeeId}`, updated);
    return updated;
  }

  public async softDeleteEmployee({
    accountBookId,
    employeeId,
  }: {
    accountBookId: string;
    employeeId: string;
  }) {
    return this.rows.delete(`${accountBookId}|${employeeId}`);
  }
}

class FakeRecordRepo implements ISalaryRecordRepository {
  /**
   * Info: (20260905 - Luphia) 已有薪資紀錄的年月分佈，依帳本分開放（#6774）。
   *
   * 依帳本分開不是為了完整 —— 它是判準本身：service 若忘了把 `accountBookId`
   * 傳下去，別的帳本的紀錄會被算成這個人的，缺漏就這樣消失。
   */
  public readonly coveredByBook = new Map<
    string,
    { employeeId: string; year: number; month: number }[]
  >();

  public coveredCalls = 0;

  public async listCoveredPeriods(
    accountBookId: string,
  ): Promise<{ employeeId: string; year: number; month: number }[]> {
    this.coveredCalls += 1;
    return this.coveredByBook.get(accountBookId) ?? [];
  }

  // Info: (20260831 - Julian) 模擬 @@unique([accountBookId, employeeId, year, month])
  public readonly rows = new Map<string, ISalaryRecordDetail>();

  public upsertCalls = 0;

  public async upsertRecord(params: {
    accountBookId: string;
    employeeId: string;
    createdByUserId: string;
    year: number;
    month: number;
    input: ISalaryCalculatorOptions;
    result: ISalaryCalculatorUI;
    calculatorVersion: string;
    totalPayment: bigint;
    totalSalaryTaxable: bigint;
    totalEmployerCost: bigint;
  }) {
    this.upsertCalls += 1;
    const key = `${params.accountBookId}|${params.employeeId}|${params.year}|${params.month}`;
    const detail: ISalaryRecordDetail = {
      id: key,
      year: params.year,
      month: params.month,
      employee: { id: params.employeeId, name: "王小明", number: "A001" },
      totalPayment: Number(params.totalPayment),
      totalSalaryTaxable: Number(params.totalSalaryTaxable),
      totalEmployerCost: Number(params.totalEmployerCost),
      calculatorVersion: params.calculatorVersion,
      createdAt: 0,
      updatedAt: 0,
      /**
       * Info: (20260904 - Julian) 假 repo 不模擬寄送 —— 這一支測的是儲存的編排。
       * `null` 在這裡是誠實的：這個假的資料庫裡確實沒有任何寄送紀錄。
       */
      lastSentAt: null,
      lastSentTo: null,
      input: params.input,
      result: params.result,
    };
    this.rows.set(key, detail);
    return detail;
  }

  public async listRecords(
    options: ISalaryRecordQueryOptions,
  ): Promise<ISalaryRecordPageResult> {
    const data = [...this.rows.values()];
    return {
      data,
      page: options.page,
      pageSize: options.pageSize,
      totalCount: data.length,
      totalPages: 1,
      periods: data.map((row) => ({ year: row.year, month: row.month })),
    };
  }

  /**
   * Info: (20260904 - Julian) 依 id 取多筆。**租戶過濾比照真 repo**：
   * 這個假物件的 key 帶著 accountBookId 前綴，所以「拿別的帳本的 id 來匯出」
   * 在測試裡是真的問得出答案的 —— 若這裡不比對前綴，那條案例會永遠綠。
   */
  public async listRecordsByIds(
    accountBookId: string,
    recordIds: readonly string[],
  ): Promise<ISalaryRecordDetail[]> {
    return recordIds
      .filter((id) => id.startsWith(`${accountBookId}|`))
      .map((id) => this.rows.get(id))
      .filter((row): row is ISalaryRecordDetail => row !== undefined);
  }

  public async getRecordById(accountBookId: string, recordId: string) {
    const row = this.rows.get(recordId);
    return row && recordId.startsWith(`${accountBookId}|`) ? row : null;
  }

  public async deleteRecord({
    accountBookId,
    recordId,
  }: {
    accountBookId: string;
    recordId: string;
  }) {
    if (!recordId.startsWith(`${accountBookId}|`)) return false;
    return this.rows.delete(recordId);
  }
}

let employees: FakeEmployeeRepo;
let records: FakeRecordRepo;
let service: SalaryRecordService;

beforeEach(() => {
  employees = new FakeEmployeeRepo();
  records = new FakeRecordRepo();
  employees.seed(BOOK, employeeOf());
  service = new SalaryRecordService(employees, records);
});

describe("儲存薪資紀錄", () => {
  it("同一位員工、同一個年月存第二次是覆寫，不是新增一筆", async () => {
    await service.saveRecord({
      accountBookId: BOOK,
      userId: USER,
      input: writeInputOf(),
    });
    await service.saveRecord({
      accountBookId: BOOK,
      userId: USER,
      input: writeInputOf({ result: resultOf({ totalPayment: 45000 }) }),
    });

    expect(records.upsertCalls).toBe(2);
    expect(records.rows.size).toBe(1);
    expect([...records.rows.values()][0].totalPayment).toBe(45000);
  });

  it("換一個月就是另一筆紀錄", async () => {
    await service.saveRecord({
      accountBookId: BOOK,
      userId: USER,
      input: writeInputOf(),
    });
    await service.saveRecord({
      accountBookId: BOOK,
      userId: USER,
      input: writeInputOf({ month: 9 }),
    });

    expect(records.rows.size).toBe(2);
  });

  it("三個抽出的金額分別取自 totalPayment、totalSalaryTaxable、雇主總負擔", async () => {
    const saved = await service.saveRecord({
      accountBookId: BOOK,
      userId: USER,
      input: writeInputOf(),
    });

    expect(saved.totalPayment).toBe(31000);
    expect(saved.totalSalaryTaxable).toBe(30000);
    expect(saved.totalEmployerCost).toBe(36000);
  });

  it("員工屬於別的帳本時擋下來，而且沒有寫入任何東西", async () => {
    await expectAppError(
      () =>
        service.saveRecord({
          accountBookId: OTHER_BOOK,
          userId: USER,
          input: writeInputOf(),
        }),
      API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE,
    );

    expect(records.upsertCalls).toBe(0);
  });

  it("金額不是整數時 fail fast，不靜默 truncate", async () => {
    await expectAppError(
      () =>
        service.saveRecord({
          accountBookId: BOOK,
          userId: USER,
          input: writeInputOf({ result: resultOf({ totalPayment: 31000.5 }) }),
        }),
      API_ERRORS.VA_SALARY_AMOUNT_NOT_INTEGER,
    );

    expect(records.upsertCalls).toBe(0);
  });

  it("雇主總負擔不是整數也一樣擋（三個欄位都要走同一道檢查）", async () => {
    await expectAppError(
      () =>
        service.saveRecord({
          accountBookId: BOOK,
          userId: USER,
          input: writeInputOf({
            result: resultOf({
              employerContribution: {
                ...defaultSalaryCalculatorResult.employerContribution,
                totalEmployerCost: 36000.25,
              },
            }),
          }),
        }),
      API_ERRORS.VA_SALARY_AMOUNT_NOT_INTEGER,
    );

    expect(records.upsertCalls).toBe(0);
  });
});

describe("讀取與刪除薪資紀錄", () => {
  it("讀不到別的帳本的紀錄", async () => {
    const saved = await service.saveRecord({
      accountBookId: BOOK,
      userId: USER,
      input: writeInputOf(),
    });

    await expectAppError(
      () =>
        service.getRecord({ accountBookId: OTHER_BOOK, recordId: saved.id }),
      API_ERRORS.NF_SALARY_RECORD,
    );
  });

  it("刪不到別的帳本的紀錄，而且那一筆還在", async () => {
    const saved = await service.saveRecord({
      accountBookId: BOOK,
      userId: USER,
      input: writeInputOf(),
    });

    await expectAppError(
      () =>
        service.deleteRecord({
          accountBookId: OTHER_BOOK,
          recordId: saved.id,
        }),
      API_ERRORS.NF_SALARY_RECORD,
    );
    expect(records.rows.size).toBe(1);
  });

  it("刪除不存在的紀錄回 404 而不是靜默成功", async () => {
    await expectAppError(
      () => service.deleteRecord({ accountBookId: BOOK, recordId: "nope" }),
      API_ERRORS.NF_SALARY_RECORD,
    );
  });
});

/**
 * Info: (20260905 - Luphia) 匯出的筆數上限（review #6769 異常 2）。
 *
 * 這道守門是「一次能帶走多少薪資明細」的**唯一上界** —— 端點那一層只有
 * 限流（6/分、60/日），而限流管的是頻率不是單次體積。上限一旦失效，
 * 一個請求就能把整本帳所有年月的完整薪資明細打包帶走，
 * 而 `constants/salary_export.ts` 的註解寫的正是這句話。
 *
 * 實測（修正前）：把那段 `throw` 整段拿掉，5,927 條全綠。
 *
 * 兩條成對：只驗「超過會擋」的話，把上限改成 0 也會通過，
 * 而那會讓匯出功能整個不能用 —— 這種方向的失效同樣沒有人擋得住。
 */
describe("匯出的筆數上限", () => {
  it(`超過 ${SALARY_EXPORT_MAX_RECORDS} 筆就擋下來`, async () => {
    await expectAppError(
      () =>
        service.exportRecordsCsv({
          accountBookId: BOOK,
          recordIds: Array.from(
            { length: SALARY_EXPORT_MAX_RECORDS + 1 },
            (unused, index) => `r-${index}`,
          ),
        }),
      API_ERRORS.VA_SALARY_EXPORT_TOO_MANY,
    );
  });

  it(`剛好 ${SALARY_EXPORT_MAX_RECORDS} 筆放行`, async () => {
    const result = await service.exportRecordsCsv({
      accountBookId: BOOK,
      recordIds: Array.from(
        { length: SALARY_EXPORT_MAX_RECORDS },
        (unused, index) => `r-${index}`,
      ),
    });

    expect(result.requested).toBe(SALARY_EXPORT_MAX_RECORDS);
  });

  /**
   * Info: (20260905 - Luphia) 重複的 id 只算一次 —— 否則使用者可以用
   * 同一個 id 重複 501 次來試探上限，而那本來就不是 501 筆資料。
   */
  it("重複的 id 只算一次", async () => {
    const result = await service.exportRecordsCsv({
      accountBookId: BOOK,
      recordIds: ["r-1", "r-1", "r-1"],
    });

    expect(result.requested).toBe(1);
  });
});

describe("員工名單", () => {
  it("員工編號撞號時回 409，而不是把 Prisma 的 P2002 噴到前端", async () => {
    employees.numberTaken = true;

    await expectAppError(
      () =>
        service.createEmployee({
          accountBookId: BOOK,
          input: employeeWriteInputOf(),
        }),
      API_ERRORS.CF_SALARY_EMPLOYEE_NUMBER_TAKEN,
    );
  });

  it("編輯別的帳本的員工回 404", async () => {
    await expectAppError(
      () =>
        service.updateEmployee({
          accountBookId: OTHER_BOOK,
          employeeId: EMPLOYEE_ID,
          input: employeeWriteInputOf({ number: "A002" }),
        }),
      API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE,
    );
  });

  it("刪除別的帳本的員工回 404，而且那一筆還在", async () => {
    await expectAppError(
      () =>
        service.deleteEmployee({
          accountBookId: OTHER_BOOK,
          employeeId: EMPLOYEE_ID,
        }),
      API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE,
    );

    expect(await service.listEmployees(BOOK)).toHaveLength(1);
  });

  it("列表只回本帳本的員工", async () => {
    employees.seed(OTHER_BOOK, employeeOf({ id: "other", name: "別人" }));

    const list = await service.listEmployees(BOOK);

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("王小明");
  });
});

/**
 * Info: (20260905 - Luphia) 名單上的「缺哪幾個月」（#6774）。
 *
 * 逐月的判斷本身由 `salary_coverage.tz.test.ts` 守（那裡連時區都釘住了）。
 * 這一支守的是**編排**：算出來的東西有沒有掛到對的人身上、
 * 帳本有沒有傳下去、以及有沒有變成一人一次查詢。
 */
describe("listEmployees 帶出薪資紀錄缺漏", () => {
  const OTHER_EMPLOYEE_ID = "22222222-2222-4222-8222-222222222222";

  // Info: (20260905 - Luphia) 2026-09-15。掃描範圍的終點是「上個月」，所以是到 8 月為止
  const NOW = new Date("2026-09-15T00:00:00.000Z");
  // Info: (20260905 - Luphia) 2026-06-01 UTC。到職日一律以 UTC 午夜落地
  const HIRE_2026_06 = Math.floor(Date.UTC(2026, 5, 1) / 1000);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("有到職日、只建了其中幾個月 → 列出漏掉的那些", async () => {
    employees.seed(BOOK, employeeOf({ hireDate: HIRE_2026_06 }));
    records.coveredByBook.set(BOOK, [
      { employeeId: EMPLOYEE_ID, year: 2026, month: 6 },
      { employeeId: EMPLOYEE_ID, year: 2026, month: 8 },
    ]);

    const [employee] = await service.listEmployees(BOOK);

    expect(employee.missingPeriods).toEqual([{ year: 2026, month: 7 }]);
  });

  /**
   * Info: (20260905 - Luphia) 掛錯人是這段編排最容易出的錯：分組的 key 打錯、
   * 或忘了分組直接把整本帳的紀錄丟給每一位。症狀是「明明建了的人被標成缺漏」，
   * 而使用者會去補一張已經存在的薪資單。
   */
  it("紀錄掛在對的人身上 —— 別人的紀錄不算自己的", async () => {
    employees.seed(BOOK, employeeOf({ hireDate: HIRE_2026_06 }));
    employees.seed(
      BOOK,
      employeeOf({
        id: OTHER_EMPLOYEE_ID,
        name: "李小美",
        number: "A002",
        hireDate: HIRE_2026_06,
      }),
    );
    // Info: (20260905 - Luphia) 6–8 月全部建在王小明身上，李小美一張都沒有
    records.coveredByBook.set(
      BOOK,
      [6, 7, 8].map((month) => ({
        employeeId: EMPLOYEE_ID,
        year: 2026,
        month,
      })),
    );

    const list = await service.listEmployees(BOOK);
    const ming = list.find((employee) => employee.id === EMPLOYEE_ID);
    const mei = list.find((employee) => employee.id === OTHER_EMPLOYEE_ID);

    expect(ming?.missingPeriods).toEqual([]);
    expect(mei?.missingPeriods).toEqual([
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
    ]);
  });

  /**
   * Info: (20260905 - Luphia) 別的帳本的紀錄不得算進來。
   *
   * uuid 撞號在現實裡不會發生，但「忘了把 accountBookId 傳下去」會 ——
   * 那時查到的是整個資料庫的分佈，而缺漏會靜靜地消失。
   */
  it("只看本帳本的紀錄", async () => {
    employees.seed(BOOK, employeeOf({ hireDate: HIRE_2026_06 }));
    records.coveredByBook.set(
      OTHER_BOOK,
      [6, 7, 8].map((month) => ({
        employeeId: EMPLOYEE_ID,
        year: 2026,
        month,
      })),
    );

    const [employee] = await service.listEmployees(BOOK);

    expect(employee.missingPeriods).toHaveLength(3);
  });

  /**
   * Info: (20260905 - Luphia) 一次查詢，不是一人一次。
   *
   * 逐位員工問在小帳本上完全看不出來 —— 五個人、五次查詢，畫面照樣秒開。
   * 一百位員工的帳本才會炸，而那時已經上線了。
   */
  it("整份名單只查一次紀錄分佈", async () => {
    employees.seed(BOOK, employeeOf({ hireDate: HIRE_2026_06 }));
    employees.seed(BOOK, employeeOf({ id: OTHER_EMPLOYEE_ID, number: "A002" }));
    employees.seed(
      BOOK,
      employeeOf({
        id: "33333333-3333-4333-8333-333333333333",
        number: "A003",
      }),
    );

    await service.listEmployees(BOOK);

    expect(records.coveredCalls).toBe(1);
  });

  /**
   * Info: (20260905 - Luphia) 留職停薪的月份不算缺漏。
   *
   * 這一條驗的是 service 有沒有把留停那兩欄傳下去 —— 漏傳的話
   * `missingSalaryPeriods` 拿到的是 undefined，型別上會擋，
   * 但傳成 `null`（例如寫死）不會，而留停中的人會每個月被標成缺漏。
   */
  it("留職停薪期間不算缺漏", async () => {
    employees.seed(
      BOOK,
      employeeOf({
        hireDate: HIRE_2026_06,
        // Info: (20260905 - Luphia) 7 月留停、8 月仍未復職
        leaveStartDate: Math.floor(Date.UTC(2026, 6, 1) / 1000),
        leaveEndDate: null,
      }),
    );
    records.coveredByBook.set(BOOK, [
      { employeeId: EMPLOYEE_ID, year: 2026, month: 6 },
    ]);

    const [employee] = await service.listEmployees(BOOK);

    expect(employee.missingPeriods).toEqual([]);
  });

  // Info: (20260905 - Luphia) 沒有到職日 = 算不出範圍。不猜，也不標示
  it("沒有到職日就不下結論", async () => {
    employees.seed(BOOK, employeeOf({ hireDate: null }));

    const [employee] = await service.listEmployees(BOOK);

    expect(employee.missingPeriods).toEqual([]);
  });
});
