import { Prisma, SalaryCalculatorEmployee, SalaryRecord } from "@/generated";
import { prisma } from "@/lib/prisma";
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

const toSummary = (row: SalaryRecordWithEmployee): ISalaryRecordSummary => ({
  id: row.id,
  year: row.year,
  month: row.month,
  employee: {
    id: row.employee.id,
    name: row.employee.name,
    number: row.employee.number ?? "",
  },
  totalPayment: toAmount(row.totalPayment),
  totalSalaryTaxable: toAmount(row.totalSalaryTaxable),
  totalEmployerCost: toAmount(row.totalEmployerCost),
  calculatorVersion: row.calculatorVersion,
  createdAt: toUnixSeconds(row.createdAt),
  updatedAt: toUnixSeconds(row.updatedAt),
});

const toDetail = (row: SalaryRecordWithEmployee): ISalaryRecordDetail => ({
  ...toSummary(row),
  input: fromJsonSnapshot<ISalaryCalculatorOptions>(row.inputSnapshot),
  result: fromJsonSnapshot<ISalaryCalculatorUI>(row.resultSnapshot),
});

export class SalaryRecordRepository implements ISalaryRecordRepository {
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
      include: { employee: true },
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
        include: { employee: true },
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
      data: rows.map(toSummary),
      page: options.page,
      pageSize: options.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / options.pageSize),
      periods: periodRows.map((row) => ({ year: row.year, month: row.month })),
    };
  }

  public async getRecordById(
    accountBookId: string,
    recordId: string,
  ): Promise<ISalaryRecordDetail | null> {
    const row = await prisma.salaryRecord.findFirst({
      where: { accountBookId, id: recordId },
      include: { employee: true },
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
