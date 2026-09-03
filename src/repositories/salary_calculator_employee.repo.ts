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
    /**
     * Info: (20260901 - Luphia) 先組 `data`，再拿**它**餵斷言（review 異常 2）。
     *
     * 斷言與寫入必須讀同一個物件。分開寫時兩邊各自呼叫一次
     * `activeNumberFor(input.number, null)`，於是斷言驗的是它自己算的值、
     * 不是真的要寫進去的值 —— 那種斷言在寫入被改壞時照樣通過。
     * `createEmployee` 一直是這樣做的，這裡與軟刪除是後來才對齊的。
     */
    const data = {
      name: input.name,
      number: input.number,
      email: input.email ?? null,
      activeNumber: activeNumberFor(input.number, null),
      baseSalary: BigInt(input.baseSalary),
      mealAllowance: BigInt(input.mealAllowance),
    };

    assertActiveNumberPairing({
      number: data.number,
      activeNumber: data.activeNumber,
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
        data,
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

    /**
     * Info: (20260901 - Luphia) 斷言讀的是**要寫出去的那個物件**（review 異常 2）。
     *
     * 這裡原本傳的是三個就地造出來的常數（`number: ""`、
     * `activeNumberFor("", deletedAt)`、`deletedAt`），與下面的 `data` 沒有
     * 任何關係 —— 而 `activeNumberFor` 在 `deletedAt` 非空時恆回 `null`，
     * 所以那個斷言恆真。實測：把 `activeNumber: null` 從 `data` 拿掉，
     * 斷言照樣通過、5,441 條測試全綠。
     *
     * 寫對與寫錯被同一個觀測量塌成同一個值，正是檢查清單 §1.9 的形狀；
     * 而它守的那件事有具體後果：`activeNumber` 沒讓出，同一個編號就
     * 再也加不回來，使用者看到的是「這個人明明不在名單上卻加不進來」。
     *
     * `number` 仍傳空字串：刪除路徑本來就不碰它，而不變式在已刪除的分支
     * 只看 `activeNumber`（`number` 只進錯誤訊息）。真正要綁住的是下面那一欄。
     */
    const data = {
      deletedAt,
      // Info: (20260831 - Julian) 讓出 activeNumber，同一個編號之後才能重新加入
      activeNumber: activeNumberFor("", deletedAt),
    };

    assertActiveNumberPairing({
      number: "",
      activeNumber: data.activeNumber,
      deletedAt: data.deletedAt,
    });

    const result = await prisma.salaryCalculatorEmployee.updateMany({
      where: { accountBookId, id: employeeId, deletedAt: null },
      data,
    });

    return result.count > 0;
  }
}

export const salaryCalculatorEmployeeRepo: ISalaryCalculatorEmployeeRepository =
  new SalaryCalculatorEmployeeRepository();
