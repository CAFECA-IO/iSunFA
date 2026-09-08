import {
  Prisma,
  SalaryCalculatorEmployee,
  SalaryProfileChangeAction,
  SalaryRecord,
} from "@/generated";
import { prisma } from "@/lib/prisma";
import { SALARY_DELIVERY_STATUS } from "@/constants/salary_delivery";
import { MoneyUtil } from "@/lib/utils/money";
import {
  ISalaryCalculatorOptions,
  ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";
import {
  ISalaryRecordDetail,
  ISalaryRecordPageResult,
  ISalaryRecordQueryOptions,
  ISalaryRecordSummary,
  ISalaryBaseSalaryChange,
  ISalaryBaseSalaryDelta,
} from "@/interfaces/salary_record";

/**
 * Info: (20260831 - Julian) 薪資紀錄的存取層。
 *
 * `(帳本, 員工, 年, 月)` 唯一，重存即覆寫 —— 落地點就是 `upsertRecord` 的
 * `@@unique` 複合鍵（計劃書 D3）。這裡不判斷「可不可以存」，那是 service 的事。
 */
export interface ISalaryRecordRepository {
  upsertRecord(params: {
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
  }): Promise<ISalaryRecordDetail>;
  listRecords(
    options: ISalaryRecordQueryOptions,
  ): Promise<ISalaryRecordPageResult>;
  /**
   * Info: (20260904 - Julian) 依 id 取多筆完整紀錄（CSV 匯出）。
   *
   * 與 `getRecordById` 一樣以 `accountBookId` 為 where 的第一個 key ——
   * 匯出是**一次讀走多筆**，租戶過濾在這裡漏掉的後果比單筆嚴重得多。
   * 回傳順序與傳入的 id 無關，由呼叫端決定要不要排序。
   */
  listRecordsByIds(
    accountBookId: string,
    recordIds: readonly string[],
  ): Promise<ISalaryRecordDetail[]>;
  getRecordById(
    accountBookId: string,
    recordId: string,
  ): Promise<ISalaryRecordDetail | null>;
  /** Info: (20260831 - Julian) 回 false 表示那一列不存在（或不屬於這個帳本） */
  deleteRecord(params: {
    accountBookId: string;
    recordId: string;
  }): Promise<boolean>;
}

type SalaryRecordWithEmployee = SalaryRecord & {
  employee: SalaryCalculatorEmployee;
  /**
   * Info: (20260904 - Julian) 最近一次成功寄送，0 或 1 筆（查詢端已 `take: 1`）。
   *
   * 型別寫成陣列而不是可選的單一物件，是因為 Prisma 的關聯就是陣列 ——
   * 在型別上假裝它是單數，只會讓 `toSummary` 那一行的取法與實際回傳對不上。
   */
  paySlipDeliveries: { createdAt: Date; recipientEmail: string }[];
};

// Info: (20260831 - Julian) BigInt → number（薪資是整數元），統一走 MoneyUtil
const toAmount = (value: bigint): number =>
  MoneyUtil.toDecimal(value.toString()).toNumber();

// Info: (20260831 - Julian) DateTime → Unix 秒，沿用 IVoucher 的前端時間戳慣例
const toUnixSeconds = (value: Date): number =>
  Math.floor(value.getTime() / 1000);

/**
 * Info: (20260831 - Julian) 物件 → Prisma 的 Json 欄位值。
 *
 * 走一次 JSON round-trip 而不是直接轉型：`InputJsonValue` 不接受 `undefined`，
 * 而快照的可選欄位在 TypeScript 上就是 `number | undefined`。
 * round-trip 會把沒填的欄位整個拿掉，順便保證存進去的是純資料
 * （沒有 Date、沒有 BigInt、沒有原型鏈上的東西）。
 */
const toJsonSnapshot = (value: object): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

/**
 * Info: (20260831 - Julian) Json 欄位 → 快照型別。
 *
 * 這裡的轉型沒有 runtime 檢查，而那是刻意的：寫入路徑上
 * `salaryRecordWriteSchema` 已經逐欄驗過，讀取時再驗一次只會在
 * 「schema 演進了但舊資料還是舊形狀」時把整筆紀錄變成讀不出來 ——
 * 而使用者要的是看到當初那張薪資單。
 */
const fromJsonSnapshot = <T>(value: Prisma.JsonValue): T =>
  value as unknown as T;

/**
 * Info: (20260904 - Julian) 每一筆紀錄最近一次**成功**的寄送。
 *
 * 用關聯的 `take: 1` 而不是先撈紀錄再逐筆查寄送：後者是 N+1，
 * 一頁 20 列就是 21 次查詢。這一段由資料庫在同一次查詢裡完成。
 *
 * **三個 include 站點都要帶上它。** 少帶一個的話，那條路徑回來的
 * `lastSentAt` 會是 `null` —— 而 `null` 的意思是「從未寄出」，
 * 不是「這次沒問」。兩者在型別上長得一模一樣，而畫面會照著它寫字。
 */
const LAST_SENT_INCLUDE = {
  where: { status: SALARY_DELIVERY_STATUS.SENT },
  orderBy: { createdAt: "desc" },
  take: 1,
  select: { createdAt: true, recipientEmail: true },
} as const;

const RECORD_INCLUDE = {
  employee: true,
  paySlipDeliveries: LAST_SENT_INCLUDE,
} as const;

const toSummary = (row: SalaryRecordWithEmployee): ISalaryRecordSummary => ({
  id: row.id,
  year: row.year,
  month: row.month,
  employee: {
    id: row.employee.id,
    name: row.employee.name,
    number: row.employee.number ?? "",
  },
  /**
   * Info: (20260908 - Julian) 這個月試算用的本薪 —— 引擎的 `baseSalaryTaxable`。
   *
   * 引擎把本薪與伙食費分成「應稅／免稅」兩欄（`calculator_context` 的
   * `baseSalaryWithTax` / `mealAllowanceWithoutTax` 對應的就是這兩個），
   * 所以本薪是前者。整份快照本來就已經在記憶體裡，多讀一個欄位不多一次查詢。
   */
  /**
   * Info: (20260908 - Julian) 讀純量欄位，**不從 Json 解析**。
   *
   * 兩者理當一致（`upsertRecord` 從同一份 input 取值），而讀純量的理由是
   * 「這一欄的唯一讀法只有一種」。
   *
   * 刻意**不做**「純量是 0 就退回讀 Json」的保險：那會讓忘記跑回填腳本
   * 這件事被永久遮住，而遮住的代價是兩份實作與一個沒人知道還在的分支。
   * 沒回填的列會顯示本薪 0 —— 大聲、看得見、查得出來。
   */
  baseSalary: toAmount(row.baseSalary),

  /**
   * Info: (20260908 - Julian) 由 `attachBaseSalaryChanges` 補上（需要第二次查詢）。
   *
   * 這裡先給 `null` 而不是把整個 mapper 改成 async：異動要一次撈整頁
   * （N+1 查詢會讓 20 筆變成 21 次往返），所以它是列表組完之後的一步。
   * **三個回傳 summary 的路徑都必須呼叫它** —— 漏掉的那一支會永遠是 `null`，
   * 而 `null` 的意思是「這個月沒有調薪」，不是「我忘了查」。
   */
  baseSalaryDelta: null,
  baseSalaryChange: null,

  totalPayment: toAmount(row.totalPayment),
  totalSalaryTaxable: toAmount(row.totalSalaryTaxable),
  totalEmployerCost: toAmount(row.totalEmployerCost),
  calculatorVersion: row.calculatorVersion,
  createdAt: toUnixSeconds(row.createdAt),
  updatedAt: toUnixSeconds(row.updatedAt),
  // Info: (20260904 - Julian) 關聯已在查詢時限定 SENT 且只取一筆，這裡取的就是「最近一次成功」
  lastSentAt: row.paySlipDeliveries[0]
    ? toUnixSeconds(row.paySlipDeliveries[0].createdAt)
    : null,
  lastSentTo: row.paySlipDeliveries[0]?.recipientEmail ?? null,
});

const toDetail = (row: SalaryRecordWithEmployee): ISalaryRecordDetail => ({
  ...toSummary(row),
  input: fromJsonSnapshot<ISalaryCalculatorOptions>(row.inputSnapshot),
  result: fromJsonSnapshot<ISalaryCalculatorUI>(row.resultSnapshot),
});

/**
 * Info: (20260908 - Julian) 把 (年, 月) 壓成一個可比較的整數。
 *
 * 直接比 `year` 再比 `month` 的寫法在每個呼叫點都要寫兩層條件，
 * 而寫錯的方向是「跨年的比較反了」—— 2025-12 與 2026-01 誰在前，
 * 只有跨年那一次會錯，而測試資料多半在同一年裡。
 */
const periodIndex = (year: number, month: number): number => year * 12 + month;

/**
 * Info: (20260908 - Julian) 快照裡的本薪。異動表存的是員工檔的形狀（`baseSalary`），
 * 不是引擎的形狀（`baseSalaryTaxable`）—— 兩邊名字不同是既有的分歧，不在這裡收斂。
 */
const snapshotBaseSalary = (snapshot: unknown): number => {
  const value = (snapshot as { baseSalary?: unknown } | null)?.baseSalary;
  return typeof value === "number" ? value : 0;
};

export class SalaryRecordRepository implements ISalaryRecordRepository {
  /**
   * Info: (20260908 - Julian) 把「這個月生效的本薪異動」補到一批 summary 上。
   *
   * 計劃書 §15。
   *
   * ## 一次撈整批，不是逐筆查
   *
   * 逐筆查是 N+1：一頁 20 筆就是 21 次往返。這裡用整批的
   * `(employeeId, effectiveYear, effectiveMonth)` 組成一個 `OR`，一次查完。
   * 頁面大小上限是 100，所以 `OR` 最多 100 個子句 —— 那在 Postgres 上不是問題。
   *
   * ## 只認 `UPDATE`，**不認 `CREATE`**
   *
   * 建檔的 `changedFields` 是全部欄位、`before` 是 null。算進來的話，
   * 新員工的第一筆薪資紀錄會顯示 `+29,000` —— 而那讀起來像一次巨額調薪，
   * 實際上只是「這個人被建立了」。建檔不是調薪。
   *
   * ## 同一個月多筆異動時取淨變動
   *
   * `before` 取最早那筆的前值、`after` 取最晚那筆的後值，並回報 `count`。
   * 只取其中一筆的話，「29,000 → 31,000 → 30,000」會顯示成 `+2,000` 或
   * `-1,000`，兩個都不是這個月實際發生的事（淨變動是 `+1,000`）。
   * 而 `count` 讓畫面說得出「本月有 2 筆」—— 沒有它，淨變動會被讀成一次調整。
   */
  private async attachBaseSalaryChanges(
    accountBookId: string,
    summaries: ISalaryRecordSummary[],
  ): Promise<ISalaryRecordSummary[]> {
    if (summaries.length === 0) return summaries;

    const keyOf = (employeeId: string, year: number, month: number): string =>
      `${employeeId}|${year}|${month}`;

    // Info: (20260908 - Julian) 同一個 (人, 年, 月) 在一頁裡只會有一筆紀錄（唯一鍵），但去重不花錢
    const wanted = new Map<
      string,
      { employeeId: string; year: number; month: number }
    >();
    for (const summary of summaries) {
      wanted.set(keyOf(summary.employee.id, summary.year, summary.month), {
        employeeId: summary.employee.id,
        year: summary.year,
        month: summary.month,
      });
    }

    const rows = await prisma.salaryEmployeeProfileChange.findMany({
      // Info: (20260908 - Julian) 租戶過濾永遠是 where 的第一個 key
      where: {
        accountBookId,
        action: SalaryProfileChangeAction.UPDATE,
        changedFields: { has: "baseSalary" },
        OR: [...wanted.values()].map((key) => ({
          employeeId: key.employeeId,
          effectiveYear: key.year,
          effectiveMonth: key.month,
        })),
      },
      // Info: (20260908 - Julian) 由舊到新 —— 下面取「第一筆的前值、最後一筆的後值」靠這個順序
      orderBy: { recordedAt: "asc" },
      include: { changedBy: { select: { id: true, name: true } } },
    });

    const byKey = new Map<string, ISalaryBaseSalaryChange>();
    for (const row of rows) {
      const key = keyOf(row.employeeId, row.effectiveYear, row.effectiveMonth);
      const existing = byKey.get(key);
      const after = snapshotBaseSalary(row.afterSnapshot);

      byKey.set(key, {
        before: existing
          ? existing.before
          : snapshotBaseSalary(row.beforeSnapshot),
        after,
        delta:
          after -
          (existing ? existing.before : snapshotBaseSalary(row.beforeSnapshot)),
        count: (existing?.count ?? 0) + 1,
        // Info: (20260908 - Julian) 歸因取**最後**一筆：那是這個月最終的決定
        reason: row.reason,
        changedBy: row.changedBy,
        recordedAt: toUnixSeconds(row.recordedAt),
      });
    }

    return summaries.map((summary) => ({
      ...summary,
      baseSalaryChange:
        byKey.get(keyOf(summary.employee.id, summary.year, summary.month)) ??
        null,
    }));
  }

  /**
   * Info: (20260908 - Julian) 把「本薪較上一筆多／少多少」補到一批 summary 上。
   *
   * 計劃書 §16。
   *
   * ## 為什麼不能只用當前這一頁的資料算
   *
   * 列表是按 (年, 月) 跨員工排序的。一頁 20 筆、三十位員工的話，
   * 一頁連一個月都放不完 —— 於是**沒有任何員工的上一筆會在同一頁**。
   * 就算放得下，每一頁的最後一列也永遠沒有前一筆。
   * 頁內計算會在小資料量下「看起來對」，而那是最糟的一種對。
   *
   * ## 所以另外查，而且只查三個純量欄位
   *
   * 本薪原本只在 `inputSnapshot` 這個 Json 裡，而 Json 取不出單一欄位 ——
   * 要拿上一筆的本薪就得撈回那些員工所有紀錄的完整快照（一本三年三十人的帳
   * 約一千列、每列兩 KB）。這是 `SalaryRecord.baseSalary` 這個純量欄位
   * 存在的唯一理由。
   *
   * ## 上界：不撈比這一頁最新那筆更新的紀錄
   *
   * 我們要的是「每一列的前一筆」，所以任何比這一頁最新期間**更新**的紀錄
   * 都用不到。加這個條件不影響正確性，只是不白撈 ——
   * 而一本用了很多年的帳，那個「白撈」會隨時間線性成長。
   */
  private async attachBaseSalaryDeltas(
    accountBookId: string,
    summaries: ISalaryRecordSummary[],
  ): Promise<ISalaryRecordSummary[]> {
    if (summaries.length === 0) return summaries;

    const employeeIds = [
      ...new Set(summaries.map((summary) => summary.employee.id)),
    ];
    const newest = Math.max(
      ...summaries.map((summary) => periodIndex(summary.year, summary.month)),
    );
    const newestYear = Math.floor((newest - 1) / 12);
    const newestMonth = newest - newestYear * 12;

    const rows = await prisma.salaryRecord.findMany({
      // Info: (20260908 - Julian) 租戶過濾永遠是 where 的第一個 key
      where: {
        accountBookId,
        employeeId: { in: employeeIds },
        OR: [
          { year: { lt: newestYear } },
          { year: newestYear, month: { lte: newestMonth } },
        ],
      },
      select: { employeeId: true, year: true, month: true, baseSalary: true },
    });

    /**
     * Info: (20260908 - Julian) 每位員工一條「新到舊」的期間清單。
     *
     * 在記憶體裡排序而不是交給資料庫的 `orderBy`：反正整批都要讀進來，
     * 而排序條件是壓成整數之後的單一鍵（見 `periodIndex`）——
     * 交給資料庫得寫成兩層 `orderBy`，而那個寫法在跨年時容易寫反。
     */
    const byEmployee = new Map<
      string,
      { period: number; year: number; month: number; baseSalary: number }[]
    >();
    for (const row of rows) {
      const list = byEmployee.get(row.employeeId) ?? [];
      list.push({
        period: periodIndex(row.year, row.month),
        year: row.year,
        month: row.month,
        baseSalary: toAmount(row.baseSalary),
      });
      byEmployee.set(row.employeeId, list);
    }
    for (const list of byEmployee.values()) {
      list.sort((a, b) => b.period - a.period);
    }

    return summaries.map((summary) => {
      const list = byEmployee.get(summary.employee.id) ?? [];
      const current = periodIndex(summary.year, summary.month);

      /**
       * Info: (20260908 - Julian) 「前一筆」＝期間**嚴格小於**這一筆的第一個。
       *
       * 用 `<` 而不是 `<=`：自己不能當自己的前一筆。
       * 而「第一個」在新到舊的清單上就是最接近的那一個 ——
       * 不是「上個月」，是**上一筆存在的紀錄**。八月沒存的話它就是七月，
       * 而那個事實由 `previousYear` / `previousMonth` 帶到畫面上。
       */
      const previous = list.find((entry) => entry.period < current);

      if (previous === undefined) {
        return { ...summary, baseSalaryDelta: null };
      }

      const delta: ISalaryBaseSalaryDelta = {
        previousYear: previous.year,
        previousMonth: previous.month,
        previous: previous.baseSalary,
        delta: summary.baseSalary - previous.baseSalary,
      };

      return { ...summary, baseSalaryDelta: delta };
    });
  }

  // Info: (20260831 - Julian) 租戶過濾永遠是 where 的第一個 key
  private buildWhereClause(
    options: ISalaryRecordQueryOptions,
  ): Prisma.SalaryRecordWhereInput {
    const where: Prisma.SalaryRecordWhereInput = {
      accountBookId: options.accountBookId,
    };

    // Info: (20260831 - Julian) 逐一判斷而不是整包展開：Prisma 會靜默忽略 undefined 條件
    if (options.employeeId !== undefined) where.employeeId = options.employeeId;
    if (options.year !== undefined) where.year = options.year;
    if (options.month !== undefined) where.month = options.month;

    /**
     * Info: (20260901 - Julian) 關鍵字比對員工的姓名與編號。
     *
     * 走關聯過濾而不是把姓名冗餘存進 salary_record：員工改名之後，
     * 冗餘欄位會讓舊紀錄用舊名字才搜得到，而畫面上顯示的是現在的名字。
     * `mode: "insensitive"` 是 PostgreSQL 專屬的，本專案的資料庫就是 PostgreSQL。
     */
    if (options.keyword !== undefined && options.keyword !== "") {
      where.employee = {
        OR: [
          { name: { contains: options.keyword, mode: "insensitive" } },
          { number: { contains: options.keyword, mode: "insensitive" } },
        ],
      };
    }

    return where;
  }

  public async upsertRecord({
    accountBookId,
    employeeId,
    createdByUserId,
    year,
    month,
    input,
    result,
    calculatorVersion,
    totalPayment,
    totalSalaryTaxable,
    totalEmployerCost,
  }: {
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
  }): Promise<ISalaryRecordDetail> {
    const snapshot = {
      inputSnapshot: toJsonSnapshot(input),
      resultSnapshot: toJsonSnapshot(result),
      totalPayment,
      totalSalaryTaxable,
      totalEmployerCost,
      calculatorVersion,

      /**
       * Info: (20260908 - Julian) 本薪的純量投影，**從同一份 `input` 取值**。
       *
       * 不由呼叫端另外傳一個 `baseSalary` 參數：那會讓「純量欄位」與
       * 「Json 裡的那一欄」變成兩份可以分岔的事實，而分岔的症狀是
       * 列表上的本薪與點開薪資單看到的本薪不一樣 —— 沒有任何錯誤訊息。
       *
       * 這裡取值、上面 `toJsonSnapshot(input)` 也是同一個 `input`，
       * 所以它們不可能不一致。
       */
      baseSalary: BigInt(Math.round(input.baseSalaryTaxable ?? 0)),
    };

    const row = await prisma.salaryRecord.upsert({
      /**
       * Info: (20260831 - Julian) 覆寫語意直接靠 `@@unique([accountBookId, employeeId, year, month])`。
       * 先查再決定要 create 還是 update 的寫法會留下一個競態視窗，
       * 而在薪資上那個視窗的後果是同一個月出現兩筆。
       */
      where: {
        accountBookId_employeeId_year_month: {
          accountBookId,
          employeeId,
          year,
          month,
        },
      },
      create: {
        accountBookId,
        employeeId,
        createdByUserId,
        year,
        month,
        ...snapshot,
      },
      // Info: (20260831 - Julian) 覆寫時不改 createdByUserId：那一欄記的是這筆紀錄的來源，不是最後動它的人
      update: snapshot,
      include: RECORD_INCLUDE,
    });

    return toDetail(row);
  }

  public async listRecords(
    options: ISalaryRecordQueryOptions,
  ): Promise<ISalaryRecordPageResult> {
    const where = this.buildWhereClause(options);
    const skip = (options.page - 1) * options.pageSize;

    const [rows, totalCount, periodRows] = await Promise.all([
      prisma.salaryRecord.findMany({
        where,
        include: RECORD_INCLUDE,
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
        skip,
        take: options.pageSize,
      }),
      prisma.salaryRecord.count({ where }),
      /**
       * Info: (20260901 - Julian) 期間篩選的選項來源。
       *
       * 只看 `accountBookId`，**不套 where** —— 套了的話，選定一個期間之後
       * 選單裡就只剩那一個期間，使用者換不回去也看不到還有哪些月份。
       */
      prisma.salaryRecord.groupBy({
        by: ["year", "month"],
        where: { accountBookId: options.accountBookId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
    ]);

    return {
      data: await this.attachBaseSalaryChanges(
        options.accountBookId,
        await this.attachBaseSalaryDeltas(
          options.accountBookId,
          rows.map(toSummary),
        ),
      ),
      page: options.page,
      pageSize: options.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / options.pageSize),
      periods: periodRows.map((row) => ({ year: row.year, month: row.month })),
    };
  }

  public async listRecordsByIds(
    accountBookId: string,
    recordIds: readonly string[],
  ): Promise<ISalaryRecordDetail[]> {
    // Info: (20260904 - Julian) 空清單不打資料庫 —— `in: []` 是合法查詢，但它是一次白跑
    if (recordIds.length === 0) return [];

    const rows = await prisma.salaryRecord.findMany({
      // Info: (20260904 - Julian) 租戶過濾永遠是 where 的第一個 key
      where: { accountBookId, id: { in: [...recordIds] } },
      include: RECORD_INCLUDE,
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    });

    /**
     * Info: (20260908 - Julian) 匯出走這一支，所以它也要帶本薪異動。
     *
     * 少了這一行，匯出的 CSV 會每一列都是「沒有調薪」—— 而那不是空白，
     * 是**錯的值**：`null` 的意思是「這個月沒有調薪」。
     */
    const withChanges = await this.attachBaseSalaryChanges(
      accountBookId,
      await this.attachBaseSalaryDeltas(accountBookId, rows.map(toDetail)),
    );

    return withChanges as ISalaryRecordDetail[];
  }

  public async getRecordById(
    accountBookId: string,
    recordId: string,
  ): Promise<ISalaryRecordDetail | null> {
    const row = await prisma.salaryRecord.findFirst({
      where: { accountBookId, id: recordId },
      include: RECORD_INCLUDE,
    });

    return row ? toDetail(row) : null;
  }

  public async deleteRecord({
    accountBookId,
    recordId,
  }: {
    accountBookId: string;
    recordId: string;
  }): Promise<boolean> {
    // Info: (20260831 - Julian) deleteMany 才吃得下帳本條件（同 updateMany 的理由）
    const result = await prisma.salaryRecord.deleteMany({
      where: { accountBookId, id: recordId },
    });

    return result.count > 0;
  }
}

export const salaryRecordRepo: ISalaryRecordRepository =
  new SalaryRecordRepository();
