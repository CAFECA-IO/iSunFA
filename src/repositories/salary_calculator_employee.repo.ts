import { Prisma, SalaryCalculatorEmployee } from "@/generated";
import { prisma } from "@/lib/prisma";
import { MoneyUtil } from "@/lib/utils/money";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
} from "@/interfaces/salary_record";
import {
  activeNumberFor,
  assertActiveNumberPairing,
} from "@/repositories/salary_calculator_employee_invariant";

/**
 * Info: (20260831 - Julian) 薪資計算機輕量員工名單的存取層。
 *
 * ## 租戶隔離不靠呼叫端記得
 *
 * 每一支方法都收 `accountBookId`，而且它一律是 `where` 的第一個 key ——
 * 包含單筆查詢。只用 `id` 查再由呼叫端比對帳本，是一個猜到別人的 uuid
 * 就能讀到別的帳本員工的設計（同 `leave_policy.repo.ts` 對 `replaceTiers` 的處置）。
 */
export interface ISalaryCalculatorEmployeeRepository {
  listEmployees(accountBookId: string): Promise<ISalaryCalculatorEmployee[]>;
  getEmployeeById(
    accountBookId: string,
    employeeId: string,
  ): Promise<ISalaryCalculatorEmployee | null>;
  createEmployee(params: {
    accountBookId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
  }): Promise<ISalaryCalculatorEmployee>;
  updateEmployee(params: {
    accountBookId: string;
    employeeId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
  }): Promise<ISalaryCalculatorEmployee | null>;
  /** Info: (20260831 - Julian) soft delete。回 false 表示那一列不存在（或已被刪） */
  softDeleteEmployee(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<boolean>;
}

/**
 * Info: (20260831 - Julian) 員工編號在這個帳本已經有存活中的員工在用。
 *
 * 丟具名型別而不是讓 P2002 冒出去：編號重複是使用者的輸入問題，
 * 而原始的 Prisma 錯誤讀起來像故障（coding_guidelines §5.2）。
 */
export class SalaryEmployeeNumberTakenError extends Error {
  constructor(public readonly employeeNumber: string) {
    super(
      `SalaryCalculatorEmployee: employee number already used (number=${employeeNumber})`,
    );
    this.name = "SalaryEmployeeNumberTakenError";
  }
}

// Info: (20260831 - Julian) P2002 是唯一鍵衝突。不用 instanceof：Prisma 的錯誤類別跨版本換過位置
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "P2002";

/**
 * Info: (20260831 - Julian) BigInt → number。
 *
 * 薪資是整數元，`Number()` 在這個值域內不會失真；走 `MoneyUtil` 是為了
 * 讓「金額轉換都經由同一個入口」這件事在 grep 上看得見（precision guideline §4）。
 */
const toAmount = (value: bigint): number =>
  MoneyUtil.toDecimal(value.toString()).toNumber();

const toFrontendFormat = (
  row: SalaryCalculatorEmployee,
): ISalaryCalculatorEmployee => ({
  id: row.id,
  name: row.name,
  // Info: (20260831 - Julian) 編號是身分鍵，schema 上是必填，直接帶出
  number: row.number,
  // Info: (20260831 - Julian) Email 可空，null 打平成空字串（沿用 IVoucher.note 的既有慣例）
  email: row.email ?? "",
  baseSalary: toAmount(row.baseSalary),
  mealAllowance: toAmount(row.mealAllowance),
});

export class SalaryCalculatorEmployeeRepository implements ISalaryCalculatorEmployeeRepository {
  public async listEmployees(
    accountBookId: string,
  ): Promise<ISalaryCalculatorEmployee[]> {
    const rows = await prisma.salaryCalculatorEmployee.findMany({
      where: { accountBookId, deletedAt: null },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });

    return rows.map(toFrontendFormat);
  }

  public async getEmployeeById(
    accountBookId: string,
    employeeId: string,
  ): Promise<ISalaryCalculatorEmployee | null> {
    const row = await prisma.salaryCalculatorEmployee.findFirst({
      where: { accountBookId, id: employeeId, deletedAt: null },
    });

    return row ? toFrontendFormat(row) : null;
  }

  public async createEmployee({
    accountBookId,
    input,
  }: {
    accountBookId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
  }): Promise<ISalaryCalculatorEmployee> {
    const data: Prisma.SalaryCalculatorEmployeeUncheckedCreateInput = {
      accountBookId,
      name: input.name,
      number: input.number,
      email: input.email ?? null,
      activeNumber: activeNumberFor(input.number, null),
      baseSalary: BigInt(input.baseSalary),
      mealAllowance: BigInt(input.mealAllowance),
    };

    assertActiveNumberPairing({
      number: data.number,
      activeNumber: data.activeNumber ?? null,
      deletedAt: null,
    });

    try {
      const row = await prisma.salaryCalculatorEmployee.create({ data });
      return toFrontendFormat(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SalaryEmployeeNumberTakenError(input.number);
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
  }): Promise<ISalaryCalculatorEmployee | null> {
    assertActiveNumberPairing({
      number: input.number,
      activeNumber: activeNumberFor(input.number, null),
      deletedAt: null,
    });

    try {
      /**
       * Info: (20260831 - Julian) 用 `updateMany` 而不是 `update`：
       * `update` 的 where 只吃唯一鍵，帳本 id 進不去，會退化成「先用 id 查、再比對帳本」。
       * 這裡要的是「這一列同時屬於這個帳本才更新」，一個查詢就要能表達完。
       */
      const result = await prisma.salaryCalculatorEmployee.updateMany({
        where: { accountBookId, id: employeeId, deletedAt: null },
        data: {
          name: input.name,
          number: input.number,
          email: input.email ?? null,
          activeNumber: activeNumberFor(input.number, null),
          baseSalary: BigInt(input.baseSalary),
          mealAllowance: BigInt(input.mealAllowance),
        },
      });

      if (result.count === 0) return null;

      return await this.getEmployeeById(accountBookId, employeeId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SalaryEmployeeNumberTakenError(input.number);
      }
      throw error;
    }
  }

  public async softDeleteEmployee({
    accountBookId,
    employeeId,
  }: {
    accountBookId: string;
    employeeId: string;
  }): Promise<boolean> {
    const deletedAt = new Date();

    assertActiveNumberPairing({
      // Info: (20260831 - Julian) 刪除路徑不碰 number 本身，這裡只是把不變式的兩邊擺出來檢查
      number: "",
      activeNumber: activeNumberFor("", deletedAt),
      deletedAt,
    });

    const result = await prisma.salaryCalculatorEmployee.updateMany({
      where: { accountBookId, id: employeeId, deletedAt: null },
      // Info: (20260831 - Julian) 讓出 activeNumber，同一個編號之後才能重新加入
      data: { deletedAt, activeNumber: null },
    });

    return result.count > 0;
  }
}

export const salaryCalculatorEmployeeRepo: ISalaryCalculatorEmployeeRepository =
  new SalaryCalculatorEmployeeRepository();
