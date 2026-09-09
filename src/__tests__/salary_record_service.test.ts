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
  ISalaryProfileChangeRow,
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
import {
  IAccountBookCreatedAtReader,
  SalaryRecordService,
} from "@/services/salary_record.service";
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

  /**
   * Info: (20260908 - Julian) 調薪歷程：假 repo 持有一份可以塞的列。
   *
   * 服務層對這一支做的事是「把原始列的兩份快照算成逐欄差異」，
   * 所以替身只要回得了列就夠 —— 差異本身由 `salary_profile_diff.ts` 負責，
   * 而它有自己的測試。這裡刻意不模擬篩選與分頁：
   * 那兩件事在 repository（SQL），不在服務層。
   */
  public profileChangeRows: ISalaryProfileChangeRow[] = [];

  public profileChangeQueries: unknown[] = [];

  public async listProfileChanges(params: {
    accountBookId: string;
    employeeId: string;
    fields?: string[];
    page: number;
    pageSize: number;
  }) {
    this.profileChangeQueries.push(params);
    return {
      rows: this.profileChangeRows,
      totalCount: this.profileChangeRows.length,
      recordedSince:
        this.profileChangeRows.length === 0
          ? null
          : this.profileChangeRows[this.profileChangeRows.length - 1]
              .recordedAt,
    };
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
      /**
       * Info: (20260908 - Julian) 本薪與「這個月生效的本薪異動」（計劃書 §15）。
       *
       * 預設 `null` = 這個月沒有調薪。要測有調薪的案例時由 overrides 帶進來 ——
       * 預設就給一筆的話，每一條案例都會意外帶著一個 `+1,000`。
       */
      baseSalary: 30000,
      // Info: (20260908 - Julian) 假 repo 不模擬跨列比較（那是 SQL 的事，計劃書 §16）
      baseSalaryDelta: null,
      baseSalaryChange: null,
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

/**
 * Info: (20260907 - Julian) 帳本的建立時間 —— 完整度起算的下限。
 *
 * 有狀態的替身：`getCreatedAt` 要真的照 `accountBookId` 回答，而且要數
 * 被呼叫幾次。回一個寫死的值會讓「有沒有傳對帳本」與「有沒有變成
 * 一人一次查詢」兩條都測不到（檢查清單 §1.8：被 mock 的那支要照實做事）。
 */
class FakeAccountBookRepo implements IAccountBookCreatedAtReader {
  public createdAtByBook = new Map<string, Date>();
  public createdAtCalls = 0;

  public async getCreatedAt(accountBookId: string): Promise<Date | null> {
    this.createdAtCalls += 1;
    return this.createdAtByBook.get(accountBookId) ?? null;
  }
}

let employees: FakeEmployeeRepo;
let records: FakeRecordRepo;
let accountBooks: FakeAccountBookRepo;
let service: SalaryRecordService;

beforeEach(() => {
  employees = new FakeEmployeeRepo();
  records = new FakeRecordRepo();
  accountBooks = new FakeAccountBookRepo();
  /**
   * Info: (20260907 - Julian) 預設一本 2020 年就建立的帳。
   *
   * 下限比其他測試用的到職日都早，所以它們的期望值不受影響 ——
   * 而這也是真實的形狀：帳本先存在，人才進來。下限自己的判準在
   * 「起算下限」那一組，以及 `salary_coverage.tz.test.ts`。
   */
  accountBooks.createdAtByBook.set(BOOK, new Date("2020-01-01T00:00:00.000Z"));
  employees.seed(BOOK, employeeOf());
  service = new SalaryRecordService(employees, records, accountBooks);
});

/**
 * Info: (20260908 - Julian) 員工檔寫入一律要帶「誰改的、何時生效」（計劃書 §4）。
 *
 * 這是**必填**參數而不是選填：忘記傳是編譯錯誤，不是一列少了 userId 的異動紀錄。
 * 這一批呼叫端因此都被迫補上它 —— 那正是型別該做的事。
 *
 * 寫成函式而不是常數：`changedByUserId` 在 e2e 裡要等 `beforeAll` 建好 user
 * 才有值，模組載入時取一次會永遠是空字串（而外鍵會在執行期才抱怨）。
 */
const changeCtx = () => ({
  changedByUserId: "user-1",
  effectiveYear: 2026,
  effectiveMonth: 9,
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
          change: changeCtx(),
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
          change: changeCtx(),
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
          change: changeCtx(),
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

describe("調薪歷程：服務層把原始列算成逐欄差異", () => {
  const snapshotOf = (patch: Record<string, unknown> = {}) => ({
    ...DEFAULT_EMPLOYEE_PROFILE,
    name: "王小明",
    number: "A001",
    email: "ming@example.com",
    baseSalary: 40000,
    mealAllowance: 2400,
    ...patch,
  });

  const rowOf = (
    patch: Partial<ISalaryProfileChangeRow> = {},
  ): ISalaryProfileChangeRow => ({
    id: "chg-1",
    action: "UPDATE",
    beforeSnapshot: snapshotOf(),
    afterSnapshot: snapshotOf({ baseSalary: 45000 }),
    changedFields: ["baseSalary"],
    effectiveYear: 2026,
    effectiveMonth: 10,
    reason: "年度調薪",
    recordedAt: new Date("2026-09-28T02:30:00.000Z"),
    changedBy: { id: "user-7", name: "會計小林" },
    ...patch,
  });

  /**
   * Info: (20260908 - Julian) **diff 在服務層算，不丟給前端。**
   *
   * repository 回的是兩份 Json 快照。若服務層只是原封不動轉出去，
   * 「哪些欄位算變動、金額怎麼正規化」的規則就會落到每一個呼叫端 ——
   * 而那個規則已經有實作與測試（`salary_profile_diff.ts`）。
   * 這一條釘住服務層真的用了它。
   */
  it("UPDATE 列算出逐欄的前後值", async () => {
    employees.profileChangeRows = [rowOf()];

    const result = await service.listProfileChanges({
      accountBookId: BOOK,
      employeeId: EMPLOYEE_ID,
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].changes).toEqual([
      { field: "baseSalary", before: 40000, after: 45000 },
    ]);
  });

  /**
   * Info: (20260908 - Julian) 時間一律轉成 Unix 秒（本模組的前端慣例）。
   *
   * 直接把 `Date` 交出去的話，它會在 JSON 序列化時變成 ISO 字串 ——
   * 而前端其他地方拿到的都是秒。混用的症狀是某一頁的時間顯示成
   * `Invalid Date`，而那一頁通常不是改動它的人在看的那一頁。
   */
  it("recordedAt 轉成 Unix 秒", async () => {
    employees.profileChangeRows = [rowOf()];

    const result = await service.listProfileChanges({
      accountBookId: BOOK,
      employeeId: EMPLOYEE_ID,
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].recordedAt).toBe(
      Math.floor(new Date("2026-09-28T02:30:00.000Z").getTime() / 1000),
    );
    expect(result.recordedSince).toBe(result.data[0].recordedAt);
  });

  it("生效期間、原因、誰改的都照原樣帶出", async () => {
    employees.profileChangeRows = [rowOf()];

    const result = await service.listProfileChanges({
      accountBookId: BOOK,
      employeeId: EMPLOYEE_ID,
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].effectiveYear).toBe(2026);
    expect(result.data[0].effectiveMonth).toBe(10);
    expect(result.data[0].reason).toBe("年度調薪");
    expect(result.data[0].changedBy).toEqual({
      id: "user-7",
      name: "會計小林",
    });
  });

  /**
   * Info: (20260908 - Julian) 篩選與分頁條件要真的往下傳。
   *
   * 服務層對這兩者只做轉傳，而「轉傳」最常見的壞法是漏掉其中一個 ——
   * 症狀是使用者勾了欄位卻沒有變化，或翻頁永遠停在第一頁。
   * 兩者都不會有錯誤訊息。
   */
  it("fields 與分頁條件原樣交給 repository", async () => {
    employees.profileChangeRows = [];

    await service.listProfileChanges({
      accountBookId: BOOK,
      employeeId: EMPLOYEE_ID,
      fields: ["baseSalary", "isLaborInsured"],
      page: 3,
      pageSize: 50,
    });

    expect(employees.profileChangeQueries).toEqual([
      {
        accountBookId: BOOK,
        employeeId: EMPLOYEE_ID,
        fields: ["baseSalary", "isLaborInsured"],
        page: 3,
        pageSize: 50,
      },
    ]);
  });

  /**
   * Info: (20260908 - Julian) 一列都沒有時，`totalPages` 是 1 而不是 0。
   *
   * 「共 0 頁」會讓分頁元件算出「第 1 頁 / 共 0 頁」這種讀不通的狀態，
   * 而空清單本身就是一頁 —— 那一頁上面寫著「還沒有任何紀錄」。
   */
  it("沒有任何紀錄時 totalPages 是 1，recordedSince 是 null", async () => {
    employees.profileChangeRows = [];

    const result = await service.listProfileChanges({
      accountBookId: BOOK,
      employeeId: EMPLOYEE_ID,
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.recordedSince).toBeNull();
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

  /**
   * Info: (20260907 - Julian) 起算的下限**真的傳下去了**（產品決策 20260907）。
   *
   * 逐月的判斷由 `salary_coverage.tz.test.ts` 守；這一條守的是編排 ——
   * service 有沒有去問帳本、問到的值有沒有換成秒、有沒有傳進去。
   * 少了它，把 `bookCreatedAt` 寫死成 `null` 也會全綠，而症狀是
   * 中途導入的帳本一補上到職日就冒出上百個月（§1.7：測到零件、沒測到接線）。
   */
  it("帳本引入使用之前的月份不算缺漏", async () => {
    employees.seed(
      BOOK,
      employeeOf({ hireDate: Math.floor(Date.UTC(2015, 2, 10) / 1000) }),
    );
    accountBooks.createdAtByBook.set(
      BOOK,
      new Date("2026-08-20T00:00:00.000Z"),
    );

    const [employee] = await service.listEmployees(BOOK);

    // Info: (20260907 - Julian) 2015 年到職，但這本帳 2026/08 才建立
    expect(employee.missingPeriods).toEqual([{ year: 2026, month: 8 }]);
  });

  /**
   * Info: (20260907 - Julian) **回填的月份不得被下限藏起來**（review 阻擋-1）。
   *
   * 薪資紀錄的年月是使用者自己選的，沒有綁在建帳日之後 ——「九月建帳、
   * 把今年 1–8 月補進來」是導入時的正常路徑。只看建帳日當下限的話，
   * 這一段裡漏建的那個月會回空陣列，完全不標示。
   *
   * 這一條與 `salary_coverage.tz.test.ts` 的分工：那邊驗判斷本身，
   * 這邊驗 service 真的把整份 `existing` 傳下去了 —— 只傳「建帳日之後」
   * 那幾筆的話，逐月判斷再對也救不回來。
   */
  it("導入時回填到建帳日之前的月份，其中漏建的仍然標得出來", async () => {
    employees.seed(
      BOOK,
      employeeOf({ hireDate: Math.floor(Date.UTC(2020, 0, 1) / 1000) }),
    );
    accountBooks.createdAtByBook.set(
      BOOK,
      new Date("2026-09-01T00:00:00.000Z"),
    );
    // Info: (20260907 - Julian) 回填了今年 1–8 月，唯獨 6 月漏了
    records.coveredByBook.set(
      BOOK,
      [1, 2, 3, 4, 5, 7, 8].map((month) => ({
        employeeId: EMPLOYEE_ID,
        year: 2026,
        month,
      })),
    );

    const [employee] = await service.listEmployees(BOOK);

    expect(employee.missingPeriods).toEqual([{ year: 2026, month: 6 }]);
  });

  /**
   * Info: (20260907 - Julian) 讀不到帳本時退回只看到職日，不是整個不下結論。
   *
   * 帳本讀不到多半代表 id 錯或已刪 —— 那時名單本來也會是空的。
   * 但這一格若寫成「讀不到就回空」，一次暫時的查詢失敗會讓整頁的
   * 缺漏標示靜靜消失，而畫面看起來完全正常。
   */
  it("讀不到帳本的建立時間時，仍以到職日算得出來", async () => {
    employees.seed(BOOK, employeeOf({ hireDate: HIRE_2026_06 }));
    accountBooks.createdAtByBook.clear();

    const [employee] = await service.listEmployees(BOOK);

    expect(employee.missingPeriods).toEqual([
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
    ]);
  });

  /**
   * Info: (20260907 - Julian) 帳本的建立時間也是**整份名單問一次**。
   *
   * 與紀錄分佈同一個理由：放進 `Promise.all` 之外、或搬進 `map` 裡，
   * 一百位員工就是一百次往返，而小帳本上完全看不出來。
   */
  it("整份名單只問一次帳本的建立時間", async () => {
    employees.seed(BOOK, employeeOf({ id: OTHER_EMPLOYEE_ID, number: "A002" }));
    employees.seed(
      BOOK,
      employeeOf({
        id: "33333333-3333-4333-8333-333333333333",
        number: "A003",
      }),
    );

    await service.listEmployees(BOOK);

    expect(accountBooks.createdAtCalls).toBe(1);
  });
});
