import { AppError } from "@/lib/utils/error";
import {
  ISalaryEmployeeProfileSnapshot,
  profileChangesFor,
} from "@/lib/utils/salary_profile_diff";
import {
  missingSalaryPeriods,
  type ISalaryPeriod,
} from "@/lib/utils/salary_coverage";
import { buildSalaryRecordCsv } from "@/lib/utils/salary_record_csv";
import { SALARY_EXPORT_MAX_RECORDS } from "@/constants/salary_export";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
  ISalaryProfileChangeContext,
  ISalaryProfileChangePageResult,
  ISalaryProfileChangeQueryOptions,
  ISalaryRecordDetail,
  ISalaryRecordPageResult,
  ISalaryRecordQueryOptions,
  ISalaryRecordWriteInput,
} from "@/interfaces/salary_record";
import {
  ISalaryCalculatorEmployeeRepository,
  salaryCalculatorEmployeeRepo,
  SalaryEmployeeNumberTakenError,
} from "@/repositories/salary_calculator_employee.repo";
import {
  ISalaryRecordRepository,
  salaryRecordRepo,
} from "@/repositories/salary_record.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import {
  mapServiceError,
  resolveAccountBookMembership,
} from "@/services/account_book_access.guard";
import { isSalaryAccessAllowed, SalaryAccess } from "@/constants/salary_access";

/**
 * Info: (20260831 - Julian) 薪資計算機的員工名單與薪資紀錄。
 *
 * ## 授權用團隊成員身分，不用 `resolveEmployee`
 *
 * 帳本底下的 HR 端點都用 `attendanceIdentityService.resolveEmployee()`
 * 把登入者換成 `Employee`，而它在「這個帳本沒有你的員工檔」時丟
 * `NF_EMPLOYEE_FOR_USER`（404）。
 *
 * 薪資計算機的使用者是帳本的**團隊成員**（老闆、會計、記帳士），
 * 不必是 HR 員工檔上的人 —— 照抄那一套會把正確的使用者全部擋在門外。
 *
 * 「是成員」只回答了誰進得來，**沒有回答哪些角色可以做什麼** ——
 * 那一半由下面的 `SALARY_ACCESS_ROLES` 回答，八支 route 各自宣告
 * 自己要的是讀還是寫。
 */

/**
 * Info: (20260831 - Julian) 授權閘的薄包裝。
 *
 * `resolveAccountBookMembership` 丟的是裸 `Error`（哨兵字串），
 * 而 route 的 catch 只認得 `AppError`。在這裡轉一次，
 * 每支 route 的 catch 才能與其他模組一字不差。
 *
 * Info: (20260901 - Julian) `access` **沒有預設值**，八支 route 各自要講出來。
 * 給預設值的話，新增端點時漏填會靜靜地落到比較寬鬆的那一邊，
 * 而漏填是最容易發生的事（§4.3：「拼錯的方向通常是放寬」）。
 */
export async function assertSalaryAccountBookAccess(
  accountBookId: string,
  userId: string,
  access: SalaryAccess,
): Promise<void> {
  try {
    const { member } = await resolveAccountBookMembership(
      accountBookId,
      userId,
    );

    if (!isSalaryAccessAllowed(member.role, access)) {
      throw new AppError(API_ERRORS.AUTH_PERMISSION_DENIED);
    }
  } catch (error) {
    // Info: (20260901 - Julian) 已經是 AppError 的（角色不足）原樣往上，不要被再包一層變成 500
    if (error instanceof AppError) throw error;
    throw new AppError(mapServiceError(error));
  }
}

/**
 * Info: (20260831 - Julian) number → BigInt，非整數就爆。
 *
 * 計算引擎對外的金額都經過 `Math.round`（`salary_calculator.ts` 有 19 處），
 * 但那是引擎的內部承諾，不是型別保證。非整數代表引擎改了而落地這一側沒跟上 ——
 * 讓它在寫入前就停下來，而不是靜默 truncate 出一筆對不起來的薪資
 * （CLAUDE.md §6 Fail Fast）。
 */
const toWholeAmount = (value: number): bigint => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new AppError(API_ERRORS.VA_SALARY_AMOUNT_NOT_INTEGER);
  }
  return BigInt(value);
};

/**
 * Info: (20260907 - Julian) 這支 service 對帳本只需要一件事：它何時建立。
 *
 * 宣告一個窄埠而不是注入整個 `IAccountBookRepository`（七支方法）——
 * 後者會讓每一個測試替身多背六支用不到的方法，而那正是替身開始
 * 「替程式回答問題」的起點（檢查清單 §1.8）。
 * `AccountBookRepository` 在結構上就滿足這個介面，不必額外接線。
 */
export interface IAccountBookCreatedAtReader {
  getCreatedAt(accountBookId: string): Promise<Date | null>;
}

export class SalaryRecordService {
  constructor(
    private readonly employees: ISalaryCalculatorEmployeeRepository,
    private readonly records: ISalaryRecordRepository,
    private readonly accountBooks: IAccountBookCreatedAtReader,
  ) {}

  /**
   * Info: (20260905 - Luphia) 名單，並帶上每個人缺哪幾個月（#6774）。
   *
   * 三支查詢並行：名單一支、整本帳的年月分佈一支、帳本的建立時間一支。
   * **不逐位員工問** —— 一百位員工的帳本那樣會打一百次 DB，
   * 而這一頁是進去就會載入的。
   *
   * Info: (20260907 - Julian) 第三支是起算的下限（產品決策 20260907）。
   * 帳本引入使用之前的月份不可能有薪資單，所以不列進缺漏 ——
   * 少了它，中途導入的帳本會在有人補上到職日的那一刻冒出上百個月，
   * 而那份清單一個都補不了。它與名單、分佈並行，不多一次往返。
   *
   * 完整度算不出來時（沒有到職日、範圍超過上限）回空陣列，畫面就不標示。
   * 「不知道」與「完整」對使用者的處置相同，而猜一個起點會讓舊資料
   * 全部被標成缺一大片。
   */
  public async listEmployees(
    accountBookId: string,
  ): Promise<ISalaryCalculatorEmployee[]> {
    const [employees, covered, bookCreatedAt] = await Promise.all([
      this.employees.listEmployees(accountBookId),
      this.records.listCoveredPeriods(accountBookId),
      this.accountBooks.getCreatedAt(accountBookId),
    ]);

    const byEmployee = new Map<string, ISalaryPeriod[]>();
    for (const row of covered) {
      const list = byEmployee.get(row.employeeId) ?? [];
      list.push({ year: row.year, month: row.month });
      byEmployee.set(row.employeeId, list);
    }

    const nowMs = Date.now();

    return employees.map((employee) => ({
      ...employee,
      missingPeriods: missingSalaryPeriods({
        hireDate: employee.hireDate,
        /**
         * Info: (20260907 - Julian) 秒，與其他日期同單位。
         *
         * 讀不到帳本時給 `null` = **少掉這個候選**，不是「沒有下限」——
         * 那時下限退回這位員工最早一筆紀錄（見 `missingSalaryPeriods`
         * 的 `dataStart`）。不猜一個下限，因為猜錯的方向會是漏報。
         *
         * Info: (20260908 - Luphia) 原本這裡寫「退回只看到職日」，與純函式那一側
         * 的說明不一致（review 應修-1）—— 程式做的是後者，而照這句話去改
         * 會讓有回填紀錄的舊員工多出一大段補不了的月份。
         */
        bookCreatedAt:
          bookCreatedAt === null
            ? null
            : Math.floor(bookCreatedAt.getTime() / 1000),
        resignDate: employee.resignDate,
        leaveStartDate: employee.leaveStartDate,
        leaveEndDate: employee.leaveEndDate,
        existing: byEmployee.get(employee.id) ?? [],
        nowMs,
      }),
    }));
  }

  /**
   * Info: (20260908 - Julian) 三支寫入方法都轉傳 `change`（誰改的、何時生效、為什麼）。
   *
   * 服務層只是轉傳，**不在這裡組 change** —— `changedByUserId` 只有 route
   * 拿得到（來自 DeWT），而生效月份的補值需要一個時鐘。
   * 兩者都在 route 那一層決定，服務層碰它只會多一個可以不一致的地方。
   */
  public async createEmployee({
    accountBookId,
    input,
    change,
  }: {
    accountBookId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
    change: ISalaryProfileChangeContext;
  }): Promise<ISalaryCalculatorEmployee> {
    try {
      return await this.employees.createEmployee({
        accountBookId,
        input,
        change,
      });
    } catch (error) {
      if (error instanceof SalaryEmployeeNumberTakenError) {
        throw new AppError(API_ERRORS.CF_SALARY_EMPLOYEE_NUMBER_TAKEN);
      }
      throw error;
    }
  }

  public async updateEmployee({
    accountBookId,
    employeeId,
    input,
    change,
  }: {
    accountBookId: string;
    employeeId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
    change: ISalaryProfileChangeContext;
  }): Promise<ISalaryCalculatorEmployee> {
    try {
      const updated = await this.employees.updateEmployee({
        accountBookId,
        employeeId,
        input,
        change,
      });
      if (!updated) {
        throw new AppError(API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE);
      }
      return updated;
    } catch (error) {
      if (error instanceof SalaryEmployeeNumberTakenError) {
        throw new AppError(API_ERRORS.CF_SALARY_EMPLOYEE_NUMBER_TAKEN);
      }
      throw error;
    }
  }

  public async deleteEmployee({
    accountBookId,
    employeeId,
    change,
  }: {
    accountBookId: string;
    employeeId: string;
    change: ISalaryProfileChangeContext;
  }): Promise<void> {
    const deleted = await this.employees.softDeleteEmployee({
      accountBookId,
      employeeId,
      change,
    });
    if (!deleted) {
      throw new AppError(API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE);
    }
  }

  /**
   * Info: (20260908 - Julian) 某位員工的調薪歷程。
   *
   * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §6
   *
   * repository 回的是原始列（前後快照還是 Json），**diff 在這裡算** ——
   * 不丟給前端，因為「哪些欄位算變動、金額怎麼正規化」的規則只能有一份實作，
   * 而它必須在有測試的那一側（`salary_profile_diff.ts`）。
   * 丟給前端的話，日後多一個呼叫端就多一份規則。
   */
  public async listProfileChanges({
    accountBookId,
    employeeId,
    fields,
    page,
    pageSize,
  }: ISalaryProfileChangeQueryOptions): Promise<ISalaryProfileChangePageResult> {
    const { rows, totalCount, recordedSince } =
      await this.employees.listProfileChanges({
        accountBookId,
        employeeId,
        fields,
        page,
        pageSize,
      });

    return {
      data: rows.map((row) => ({
        id: row.id,
        action: row.action as "CREATE" | "UPDATE" | "DELETE",
        effectiveYear: row.effectiveYear,
        effectiveMonth: row.effectiveMonth,
        // Info: (20260908 - Julian) Unix 秒，沿用本模組的前端時間戳慣例
        recordedAt: Math.floor(row.recordedAt.getTime() / 1000),
        reason: row.reason,
        changedBy: row.changedBy,
        changes: profileChangesFor(
          row.action,
          row.beforeSnapshot as ISalaryEmployeeProfileSnapshot | null,
          row.afterSnapshot as ISalaryEmployeeProfileSnapshot | null,
        ),
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      recordedSince:
        recordedSince === null
          ? null
          : Math.floor(recordedSince.getTime() / 1000),
    };
  }

  public async listRecords(
    options: ISalaryRecordQueryOptions,
  ): Promise<ISalaryRecordPageResult> {
    return this.records.listRecords(options);
  }

  public async getRecord({
    accountBookId,
    recordId,
  }: {
    accountBookId: string;
    recordId: string;
  }): Promise<ISalaryRecordDetail> {
    const record = await this.records.getRecordById(accountBookId, recordId);
    if (!record) {
      throw new AppError(API_ERRORS.NF_SALARY_RECORD);
    }
    return record;
  }

  /**
   * Info: (20260831 - Julian) 儲存（重存即覆寫）。
   *
   * 先確認員工屬於這本帳，再落地。少了這一步，一個帶著別的帳本的 employeeId
   * 的請求會在本帳建立一筆指向外部員工的薪資紀錄 —— 唯一鍵擋不住那件事，
   * 因為 `(accountBookId, employeeId, year, month)` 的組合確實是新的。
   */
  public async saveRecord({
    accountBookId,
    userId,
    input,
  }: {
    accountBookId: string;
    userId: string;
    input: ISalaryRecordWriteInput;
  }): Promise<ISalaryRecordDetail> {
    const employee = await this.employees.getActiveEmployeeById(
      accountBookId,
      input.employeeId,
    );
    if (!employee) {
      throw new AppError(API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE);
    }

    return this.records.upsertRecord({
      accountBookId,
      employeeId: employee.id,
      createdByUserId: userId,
      year: input.year,
      month: input.month,
      input: input.input,
      result: input.result,
      calculatorVersion: input.calculatorVersion,
      totalPayment: toWholeAmount(input.result.totalPayment),
      totalSalaryTaxable: toWholeAmount(input.result.totalSalaryTaxable),
      totalEmployerCost: toWholeAmount(
        input.result.employerContribution.totalEmployerCost,
      ),
    });
  }

  /**
   * Info: (20260904 - Julian) 把選定的幾筆薪資紀錄變成一份 CSV。
   *
   * ## 為什麼在伺服器產，而不是前端組
   *
   * CSV 要的是薪資單上的每一格，而列表刻意不帶 `resultSnapshot`
   * （見 `ISalaryPaySlipDeliveryListItem` 的同一個理由：那會把整本帳的
   * 薪資明細送進瀏覽器）。前端要自己組就得先把每一筆的明細抓下來 ——
   * 那正是我們避開的東西。
   *
   * ## 找不到的 id 直接略過，不報錯
   *
   * 勾選之後、按下匯出之前，別人可能刪掉了其中一筆。為此整個匯出失敗，
   * 使用者要重新勾一次十幾筆而畫面不會告訴他是哪一筆不見了。
   * 少一列是看得出來的（`requested` 與實際列數不符），整份失敗不是。
   */
  public async exportRecordsCsv({
    accountBookId,
    recordIds,
  }: {
    accountBookId: string;
    recordIds: readonly string[];
  }): Promise<{ csv: string; exported: number; requested: number }> {
    if (recordIds.length > SALARY_EXPORT_MAX_RECORDS) {
      throw new AppError(API_ERRORS.VA_SALARY_EXPORT_TOO_MANY);
    }

    // Info: (20260904 - Julian) 重複的 id 只取一次，否則同一筆會在 CSV 裡出現兩列
    const unique = [...new Set(recordIds)];
    const records = await this.records.listRecordsByIds(accountBookId, unique);

    return {
      csv: buildSalaryRecordCsv(records),
      exported: records.length,
      requested: unique.length,
    };
  }

  /**
   * Info: (20260909 - Julian) 刪除是軟刪除，而且會留下 AuditLog（repository 那一層做）。
   *
   * `userId` 由 route 從 DeWT 取，**不收 body** —— 收的話「誰刪的」就可以偽造。
   */
  public async deleteRecord({
    accountBookId,
    recordId,
    userId,
  }: {
    accountBookId: string;
    recordId: string;
    userId: string;
  }): Promise<void> {
    const deleted = await this.records.deleteRecord({
      accountBookId,
      recordId,
      deletedByUserId: userId,
    });
    if (!deleted) {
      throw new AppError(API_ERRORS.NF_SALARY_RECORD);
    }
  }
}

export const salaryRecordService = new SalaryRecordService(
  salaryCalculatorEmployeeRepo,
  salaryRecordRepo,
  accountBookRepo,
);
