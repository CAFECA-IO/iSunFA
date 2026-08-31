import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
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
import {
  assertAccountBookMember,
  mapServiceError,
} from "@/services/account_book_access.guard";

/**
 * Info: (20260831 - Julian) 薪資計算機的員工名單與薪資紀錄。
 *
 * ## 授權用 `assertAccountBookMember`，不用 `resolveEmployee`
 *
 * 帳本底下的 HR 端點都用 `attendanceIdentityService.resolveEmployee()`
 * 把登入者換成 `Employee`，而它在「這個帳本沒有你的員工檔」時丟
 * `NF_EMPLOYEE_FOR_USER`（404）。
 *
 * 薪資計算機的使用者是帳本的**團隊成員**（老闆、會計、記帳士），
 * 不必是 HR 員工檔上的人 —— 照抄那一套會把正確的使用者全部擋在門外。
 */

/**
 * Info: (20260831 - Julian) 授權閘的薄包裝。
 *
 * `assertAccountBookMember` 丟的是裸 `Error`（哨兵字串），
 * 而 route 的 catch 只認得 `AppError`。在這裡轉一次，
 * 每支 route 的 catch 才能與其他模組一字不差。
 */
export async function assertSalaryAccountBookAccess(
  accountBookId: string,
  userId: string,
): Promise<void> {
  try {
    await assertAccountBookMember(accountBookId, userId);
  } catch (error) {
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

export class SalaryRecordService {
  constructor(
    private readonly employees: ISalaryCalculatorEmployeeRepository,
    private readonly records: ISalaryRecordRepository,
  ) {}

  public async listEmployees(
    accountBookId: string,
  ): Promise<ISalaryCalculatorEmployee[]> {
    return this.employees.listEmployees(accountBookId);
  }

  public async createEmployee({
    accountBookId,
    input,
  }: {
    accountBookId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
  }): Promise<ISalaryCalculatorEmployee> {
    try {
      return await this.employees.createEmployee({ accountBookId, input });
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
  }: {
    accountBookId: string;
    employeeId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
  }): Promise<ISalaryCalculatorEmployee> {
    try {
      const updated = await this.employees.updateEmployee({
        accountBookId,
        employeeId,
        input,
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
  }: {
    accountBookId: string;
    employeeId: string;
  }): Promise<void> {
    const deleted = await this.employees.softDeleteEmployee({
      accountBookId,
      employeeId,
    });
    if (!deleted) {
      throw new AppError(API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE);
    }
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
    const employee = await this.employees.getEmployeeById(
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

  public async deleteRecord({
    accountBookId,
    recordId,
  }: {
    accountBookId: string;
    recordId: string;
  }): Promise<void> {
    const deleted = await this.records.deleteRecord({
      accountBookId,
      recordId,
    });
    if (!deleted) {
      throw new AppError(API_ERRORS.NF_SALARY_RECORD);
    }
  }
}

export const salaryRecordService = new SalaryRecordService(
  salaryCalculatorEmployeeRepo,
  salaryRecordRepo,
);
