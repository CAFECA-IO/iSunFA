import { describe, it, expect, beforeEach } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { salaryRecordRepo } from "@/repositories/salary_record.repo";

declare const jest: {
  fn: (impl?: (...args: never[]) => unknown) => unknown;
  mock: (moduleName: string, factory: () => unknown) => void;
  clearAllMocks: () => void;
};

/**
 * Info: (20260908 - Julian) 薪資紀錄列表上的「本薪調了多少」。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §15
 *
 * ## 這一支守什麼
 *
 * 三個規則，每一個錯的時候都是**畫面上一個看起來很合理的數字**：
 *
 * 1. **建檔不算調薪。** 算進來的話，新員工的第一筆紀錄顯示 `+29,000`。
 * 2. **同月多筆取淨變動，並回報筆數。** 只取一筆的話，
 *    29,000 → 31,000 → 30,000 會顯示成 `+2,000` 或 `-1,000`，兩個都不是事實。
 * 3. **一次撈整批。** 逐筆查是 N+1：一頁 20 筆 21 次往返，而它不會壞掉，
 *    只會慢 —— 慢到有人抱怨時已經沒人記得為什麼。
 *
 * 沒有一個錯法會丟出例外。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    salaryRecord: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => []),
      upsert: jest.fn(async () => null),
    },
    salaryEmployeeProfileChange: {
      findMany: jest.fn(async () => []),
    },
  },
}));

const asMock = (fn: unknown) =>
  fn as {
    mock: { calls: unknown[][] };
    mockResolvedValue: (value: unknown) => void;
    mockResolvedValueOnce: (value: unknown) => void;
  };

const recordFindMany = asMock(prisma.salaryRecord.findMany);
const recordCount = asMock(prisma.salaryRecord.count);
const recordGroupBy = asMock(prisma.salaryRecord.groupBy);
const changeFindMany = asMock(prisma.salaryEmployeeProfileChange.findMany);
const recordUpsert = asMock(prisma.salaryRecord.upsert);

const BOOK = "book-1";
const EMPLOYEE = "employee-1";

const recordRow = (patch: Record<string, unknown> = {}) => ({
  id: "rec-1",
  year: 2026,
  month: 9,
  employee: { id: EMPLOYEE, name: "王小明", number: "A001", hireDate: null },
  // Info: (20260908 - Julian) 本薪的純量欄位（計劃書 §16）；`toSummary` 直接讀它
  baseSalary: 30000n,
  totalPayment: 41234n,
  totalSalaryTaxable: 30000n,
  totalEmployerCost: 45000n,
  calculatorVersion: "2026.1",
  createdAt: new Date("2026-09-05T00:00:00.000Z"),
  updatedAt: new Date("2026-09-05T00:00:00.000Z"),
  paySlipDeliveries: [],
  // Info: (20260908 - Julian) 引擎的 `baseSalaryTaxable` 就是本薪（伙食費在 TaxFree 那一欄）
  inputSnapshot: { year: 2026, month: 9, baseSalaryTaxable: 30000 },
  resultSnapshot: {},
  ...patch,
});

const changeRow = (patch: Record<string, unknown> = {}) => ({
  id: "chg-1",
  employeeId: EMPLOYEE,
  effectiveYear: 2026,
  effectiveMonth: 9,
  beforeSnapshot: { baseSalary: 29000 },
  afterSnapshot: { baseSalary: 30000 },
  reason: "年度調薪",
  recordedAt: new Date("2026-08-28T01:00:00.000Z"),
  changedBy: { id: "user-7", name: "會計小林" },
  ...patch,
});

const listOnce = async () =>
  salaryRecordRepo.listRecords({
    accountBookId: BOOK,
    page: 1,
    pageSize: 20,
  });

beforeEach(() => {
  jest.clearAllMocks();
  recordFindMany.mockResolvedValue([recordRow()]);
  recordCount.mockResolvedValue(1);
  recordGroupBy.mockResolvedValue([]);
  changeFindMany.mockResolvedValue([]);
  recordUpsert.mockResolvedValue(recordRow());
});

describe("本薪讀純量欄位", () => {
  /**
   * Info: (20260908 - Julian) 讀 `SalaryRecord.baseSalary`，**不解析 Json**。
   *
   * 這一條刻意餵一個「純量與 Json 不一致」的列（純量 44,000、Json 30,000）——
   * 現實中不會出現（`upsertRecord` 從同一份 input 取值，見下一組），
   * 但它是唯一能分辨「讀了哪一個」的方法。
   *
   * 為什麼一定要讀純量：跨列比較（較上一筆）需要另外查一次，
   * 而 Json 取不出單一欄位 —— 那會變成撈回整批完整快照。
   */
  it("baseSalary 來自純量欄位，不是 inputSnapshot", async () => {
    recordFindMany.mockResolvedValue([
      recordRow({
        baseSalary: 44000n,
        inputSnapshot: { year: 2026, month: 9, baseSalaryTaxable: 30000 },
      }),
    ]);

    const result = await listOnce();
    expect(result.data[0].baseSalary).toBe(44000);
  });

  /**
   * Info: (20260908 - Julian) 寫入時純量與 Json **取自同一份 input**。
   *
   * 這是「兩者不可能分岔」的來源。若呼叫端另外傳一個 `baseSalary` 參數，
   * 它就會變成第二份事實 —— 而分岔的症狀是列表上的本薪與點開薪資單看到的
   * 不一樣，沒有任何錯誤訊息。
   */
  it("upsertRecord 把 input.baseSalaryTaxable 寫進純量欄位", async () => {
    await salaryRecordRepo.upsertRecord({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      createdByUserId: "user-1",
      year: 2026,
      month: 9,
      input: {
        year: 2026,
        month: 9,
        baseSalaryTaxable: 44000,
        baseSalaryTaxFree: 2400,
      } as never,
      result: {} as never,
      calculatorVersion: "2026.1",
      totalPayment: 41234n,
      totalSalaryTaxable: 30000n,
      totalEmployerCost: 45000n,
    });

    const [arg] = recordUpsert.mock.calls[0] as [
      { create: Record<string, unknown>; update: Record<string, unknown> },
    ];
    expect(arg.create.baseSalary).toBe(44000n);
    expect(arg.update.baseSalary).toBe(44000n);
  });
});

describe("較上一筆的差額", () => {
  /**
   * Info: (20260908 - Julian) 這一組是這個功能真正的主體。
   *
   * `baseSalaryChange`（員工檔異動）需要使用者在「順便更新員工資料嗎？」
   * 那個彈窗按下「更新」；而**選「只存這一次」就什麼都不會被記錄** ——
   * 20260908 的實測撞到的正是這件事：畫面上兩個月差一萬，系統說沒有異動。
   *
   * 差額因此改由紀錄本身算，不依賴任何使用者紀律。
   */
  const previousRow = (patch: Record<string, unknown> = {}) => ({
    employeeId: EMPLOYEE,
    year: 2026,
    month: 8,
    baseSalary: 54000n,
    ...patch,
  });

  it("有更早的紀錄時算出差額與被比較的期間", async () => {
    recordFindMany.mockResolvedValue([
      recordRow({ month: 9, baseSalary: 44000n }),
    ]);
    // Info: (20260908 - Julian) 第二次 findMany 是差額那一支的查詢
    recordFindMany.mockResolvedValueOnce([
      recordRow({ month: 9, baseSalary: 44000n }),
    ]);
    recordFindMany.mockResolvedValueOnce([
      previousRow(),
      { employeeId: EMPLOYEE, year: 2026, month: 9, baseSalary: 44000n },
    ]);

    const result = await listOnce();

    expect(result.data[0].baseSalaryDelta).toEqual({
      previousYear: 2026,
      previousMonth: 8,
      previous: 54000,
      delta: -10000,
    });
  });

  /**
   * Info: (20260908 - Julian) 「上一筆」不保證是上一個月。
   *
   * 八月沒存紀錄的話，九月的上一筆是七月 —— 而畫面必須寫出「較 7 月」，
   * 否則使用者會默認那個差額是跟上個月比的。
   */
  it("中間有月份沒存紀錄時，比的是上一筆存在的紀錄", async () => {
    recordFindMany.mockResolvedValueOnce([
      recordRow({ month: 9, baseSalary: 44000n }),
    ]);
    recordFindMany.mockResolvedValueOnce([
      previousRow({ month: 7, baseSalary: 50000n }),
      { employeeId: EMPLOYEE, year: 2026, month: 9, baseSalary: 44000n },
    ]);

    const result = await listOnce();

    expect(result.data[0].baseSalaryDelta?.previousMonth).toBe(7);
    expect(result.data[0].baseSalaryDelta?.delta).toBe(-6000);
  });

  /**
   * Info: (20260908 - Julian) 跨年要比對得出來。
   *
   * 先比年再比月的寫法只有跨年那一次會錯，而測試資料多半在同一年裡 ——
   * 所以這一條刻意跨年。`periodIndex` 把 (年, 月) 壓成單一鍵就是為了它。
   */
  it("跨年時 2025-12 是 2026-01 的上一筆", async () => {
    recordFindMany.mockResolvedValueOnce([
      recordRow({ year: 2026, month: 1, baseSalary: 46000n }),
    ]);
    recordFindMany.mockResolvedValueOnce([
      { employeeId: EMPLOYEE, year: 2025, month: 12, baseSalary: 44000n },
      { employeeId: EMPLOYEE, year: 2026, month: 1, baseSalary: 46000n },
    ]);

    const result = await listOnce();

    expect(result.data[0].baseSalaryDelta).toEqual({
      previousYear: 2025,
      previousMonth: 12,
      previous: 44000,
      delta: 2000,
    });
  });

  /**
   * Info: (20260908 - Julian) 自己不能當自己的上一筆。
   *
   * 查詢的上界是「不比這一頁最新期間更新的紀錄」，所以自己那一列也會被撈回來。
   * 用 `<=` 而不是 `<` 的話，每一列的差額都會是 0 —— 而 0 不會顯示，
   * 於是這個功能會安靜地整個消失。
   */
  it("最早的一筆沒有差額（null，不是 0）", async () => {
    recordFindMany.mockResolvedValueOnce([
      recordRow({ month: 9, baseSalary: 44000n }),
    ]);
    recordFindMany.mockResolvedValueOnce([
      { employeeId: EMPLOYEE, year: 2026, month: 9, baseSalary: 44000n },
    ]);

    const result = await listOnce();
    expect(result.data[0].baseSalaryDelta).toBeNull();
  });

  /**
   * Info: (20260908 - Julian) 差額的查詢只回三個純量欄位，**不帶 inputSnapshot**。
   *
   * 這是 `SalaryRecord.baseSalary` 這個欄位存在的唯一理由。帶 Json 的話，
   * 一本三年三十人的帳每次翻頁會多傳約兩 MB —— 而它不會壞掉，只會慢。
   */
  it("只 select 需要的欄位，不撈快照", async () => {
    recordFindMany.mockResolvedValueOnce([recordRow()]);
    recordFindMany.mockResolvedValueOnce([]);

    await listOnce();

    const [arg] = recordFindMany.mock.calls[1] as [
      { select: Record<string, unknown> },
    ];
    expect(Object.keys(arg.select).sort()).toEqual([
      "baseSalary",
      "employeeId",
      "month",
      "year",
    ]);
  });
});

describe("這個月生效的本薪異動", () => {
  it("有異動時算出前值、後值與差額", async () => {
    changeFindMany.mockResolvedValue([changeRow()]);

    const result = await listOnce();

    expect(result.data[0].baseSalaryChange).toEqual({
      before: 29000,
      after: 30000,
      delta: 1000,
      count: 1,
      reason: "年度調薪",
      changedBy: { id: "user-7", name: "會計小林" },
      recordedAt: Math.floor(
        new Date("2026-08-28T01:00:00.000Z").getTime() / 1000,
      ),
    });
  });

  it("沒有異動時是 null", async () => {
    const result = await listOnce();
    expect(result.data[0].baseSalaryChange).toBeNull();
  });

  /**
   * Info: (20260908 - Julian) 減薪要顯示成負的，不是取絕對值。
   *
   * `Math.abs` 在畫面那一層做（要挑 `+` / `−` 的符號），
   * 但資料這一層必須帶正負 —— 少了它，減薪與調薪在資料上長得一樣。
   */
  it("減薪的 delta 是負數", async () => {
    changeFindMany.mockResolvedValue([
      changeRow({
        beforeSnapshot: { baseSalary: 30000 },
        afterSnapshot: { baseSalary: 28000 },
      }),
    ]);

    const result = await listOnce();
    expect(result.data[0].baseSalaryChange?.delta).toBe(-2000);
  });

  /**
   * Info: (20260908 - Julian) **同月多筆取淨變動，並回報筆數。**
   *
   * 29,000 → 31,000 → 30,000 的淨變動是 +1,000。只取第一筆會顯示 +2,000、
   * 只取最後一筆會顯示 -1,000 —— 兩個都不是這個月實際發生的事。
   *
   * `count` 是畫面的義務：淨變動 +1,000 會被讀成「調了一次」，
   * 而實際上中間經過 31,000。沒有筆數，那件事在畫面上消失。
   */
  it("同月多筆時取淨變動，並帶回筆數", async () => {
    changeFindMany.mockResolvedValue([
      changeRow({
        id: "chg-1",
        beforeSnapshot: { baseSalary: 29000 },
        afterSnapshot: { baseSalary: 31000 },
        recordedAt: new Date("2026-08-20T00:00:00.000Z"),
        reason: "第一次",
      }),
      changeRow({
        id: "chg-2",
        beforeSnapshot: { baseSalary: 31000 },
        afterSnapshot: { baseSalary: 30000 },
        recordedAt: new Date("2026-08-28T00:00:00.000Z"),
        reason: "改回來",
      }),
    ]);

    const change = (await listOnce()).data[0].baseSalaryChange;

    expect(change?.before).toBe(29000);
    expect(change?.after).toBe(30000);
    expect(change?.delta).toBe(1000);
    expect(change?.count).toBe(2);
    // Info: (20260908 - Julian) 歸因取最後一筆：那是這個月最終的決定
    expect(change?.reason).toBe("改回來");
  });

  /**
   * Info: (20260910 - Luphia) 建檔那一列沒有「之前」——**回 `null`，不是 0**
   *（review 建-1）。
   *
   * `appendProfileChange` 在 `CREATE` 時帶的是 `before: null`，所以每一位員工的
   * 第一筆異動都會走到這條路。初版把它算成 0，於是：
   *
   * - 畫面說「本薪 0 → 44,000」，而他從來沒有 0 過
   * - 更要緊的是 `salary_record_csv.ts` 把 `before` 寫進**工資清冊**的
   *   「本薪異動前」欄 —— 勞檢調閱的檔案裡會出現那個 0
   *
   * `delta` 一併回 `null`：少了任何一端，那個減法沒有意義，而 0 會被讀成
   * 「沒有調整」。
   */
  it("建檔那一列：before 與 delta 都是 null，不是 0", async () => {
    changeFindMany.mockResolvedValue([
      changeRow({
        id: "chg-create",
        beforeSnapshot: null,
        afterSnapshot: { baseSalary: 44000 },
        recordedAt: new Date("2026-08-01T00:00:00.000Z"),
        reason: "到職建檔",
      }),
    ]);

    const change = (await listOnce()).data[0].baseSalaryChange;

    expect(change?.before).toBeNull();
    expect(change?.delta).toBeNull();
    expect(change?.after).toBe(44000);
  });

  /**
   * Info: (20260910 - Luphia) 快照缺欄位時同樣回 `null`。
   *
   * 這張表是 append-only 的 Json 欄，寫進去的形狀不會再被校正 ——
   * 哪天欄名漂移，這裡回 0 會讓歷史憑空多出一筆「從 0 調上來」的調薪。
   */
  it("快照讀不到本薪時回 null", async () => {
    changeFindMany.mockResolvedValue([
      changeRow({
        id: "chg-odd",
        beforeSnapshot: { somethingElse: 1 },
        afterSnapshot: { baseSalary: 44000 },
        recordedAt: new Date("2026-08-01T00:00:00.000Z"),
        reason: "形狀不對的舊列",
      }),
    ]);

    const change = (await listOnce()).data[0].baseSalaryChange;

    expect(change?.before).toBeNull();
    expect(change?.delta).toBeNull();
  });
});

describe("查詢的形狀", () => {
  /**
   * Info: (20260908 - Julian) **建檔不算調薪** —— 查詢只認 UPDATE。
   *
   * 建檔的 `changedFields` 是全部欄位、`before` 是 null。放它進來的話，
   * 新員工的第一筆薪資紀錄會顯示 `+29,000`，而那讀起來像一次巨額調薪。
   */
  it("只查 UPDATE，而且只查動到 baseSalary 的列", async () => {
    await listOnce();

    const [arg] = changeFindMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];

    expect(arg.where.action).toBe("UPDATE");
    expect(arg.where.changedFields).toEqual({ has: "baseSalary" });
  });

  // Info: (20260908 - Julian) 租戶鍵一律是 where 的第一個 key（同 salary_repo_scope）
  it("帶 accountBookId", async () => {
    await listOnce();

    const [arg] = changeFindMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(arg.where.accountBookId).toBe(BOOK);
  });

  /**
   * Info: (20260908 - Julian) 一次撈整批，不是逐筆查。
   *
   * 逐筆是 N+1：一頁 20 筆就是 21 次往返。它不會壞掉，只會慢 ——
   * 而「只會慢」的缺陷通常活很久，因為沒有任何測試會紅。
   * 這一條把它變成會紅的事。
   */
  it("整頁只查一次，條件是全部 (人, 年, 月) 的 OR", async () => {
    recordFindMany.mockResolvedValue([
      recordRow({ id: "rec-1", month: 9 }),
      recordRow({ id: "rec-2", month: 8 }),
      recordRow({
        id: "rec-3",
        month: 9,
        employee: {
          id: "employee-2",
          name: "李小華",
          number: "A002",
          hireDate: null,
        },
      }),
    ]);

    await listOnce();

    expect(changeFindMany.mock.calls.length).toBe(1);

    const [arg] = changeFindMany.mock.calls[0] as [
      { where: { OR: Record<string, unknown>[] } },
    ];
    expect(arg.where.OR).toHaveLength(3);
    expect(arg.where.OR).toContainEqual({
      employeeId: EMPLOYEE,
      effectiveYear: 2026,
      effectiveMonth: 8,
    });
  });

  /**
   * Info: (20260908 - Julian) 一筆紀錄都沒有時不打資料庫。
   *
   * `OR: []` 在 Prisma 上是合法查詢，而合法的空查詢是最容易被忽略的浪費：
   * 空清單的頁面（篩選撈不到東西）在使用者亂點篩選時會出現很多次。
   */
  it("沒有紀錄時完全不查異動表", async () => {
    recordFindMany.mockResolvedValue([]);
    recordCount.mockResolvedValue(0);

    await listOnce();

    expect(changeFindMany.mock.calls.length).toBe(0);
  });
});

/**
 * Info: (20260910 - Luphia) 薪資模組只能有**一份**年月序數（review 建-2）。
 *
 * 這條規則存在的理由不是整潔。20260910 清點時，同一個功能裡有**三份**
 * 手寫的 `year * 12 + month`：
 *
 * - `salary_coverage.ts` 的 `toOrdinal`：`year * 12 + (month - 1)`
 * - `salary_record.repo.ts` 的 `periodIndex`：`year * 12 + month`
 * - `employee_history_modal.tsx` 的 `effectiveIndex` / `recordedIndex`：同上
 *
 * 三份各自都對 —— 都單調遞增，拿來排序與比較都成立，所以三邊的測試都是綠的。
 * 但**同一個年月會算出差 1 的兩種值，而型別都是 `number`**。哪天有人把
 * 一邊的值傳給另一邊，編譯器不會有意見，症狀是「差額比對整整差一個月」：
 * 九月那一列去跟十月比，而畫面上一切正常。
 *
 * 這是掃描測試合理的用法（§1.12 的同一類）：那個錯誤的形狀是「兩份定義並存」，
 * 而行為測試看不到它 —— 兩份各自都通過自己的測試，正是它能存在的原因。
 *
 * 掃描根是整個薪資模組，不是被改的那幾個檔（§1.1）。
 */
describe("年月序數只有一份定義", () => {
  const SALARY_DIRS = [
    "src/lib/utils",
    "src/repositories",
    "src/services",
    "src/components/salary_calculator",
  ];

  // Info: (20260910 - Luphia) 唯一允許自己算的地方 —— `toOrdinal` 與 `ordinalOf` 住在這裡
  const HOME = "src/lib/utils/salary_coverage.ts";

  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/[^\n]*/gm, "");

  const salaryFiles = (): string[] =>
    SALARY_DIRS.flatMap((dir) => {
      const full = join(process.cwd(), dir);

      return readdirSync(full, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
        .map((entry) => `${dir}/${entry.name}`)
        .filter(
          (path) =>
            path.includes("salary") || dir.endsWith("salary_calculator"),
        );
    });

  it("掃得到檔案（掃描根沒有掃到空氣）", () => {
    expect(salaryFiles().length).toBeGreaterThan(10);
  });

  it("除了 salary_coverage.ts，沒有人自己寫 year * 12", () => {
    const offenders = salaryFiles().filter((path) => {
      if (path === HOME) return false;
      const source = stripComments(
        readFileSync(join(process.cwd(), path), "utf8"),
      );

      // Info: (20260910 - Luphia) 只認「絕對序數」；`(y2 - y1) * 12` 那種月份差不算
      return /(?<!-\s?\w{0,20})[Yy]ear\s*\*\s*12\s*\+/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
