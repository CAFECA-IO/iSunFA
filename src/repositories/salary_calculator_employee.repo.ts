import { Prisma, SalaryCalculatorEmployee } from "@/generated";
import { prisma } from "@/lib/prisma";
import { MoneyUtil } from "@/lib/utils/money";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
  ISalaryEmployeeLeave,
  ISalaryEmployeeProfile,
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
  getActiveEmployeeById(
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

// Info: (20260902 - Julian) DateTime → Unix 秒（沿用 IVoucher 的前端時間戳慣例），null 原樣帶出
const toUnixSecondsOrNull = (value: Date | null): number | null =>
  value === null ? null : Math.floor(value.getTime() / 1000);

// Info: (20260902 - Julian) Unix 秒 → DateTime。null 是「沒有這個日期」，不是 1970
const toDateOrNull = (value: number | null): Date | null =>
  value === null ? null : new Date(value * 1000);

/**
 * Info: (20260902 - Julian) 員工檔的常態屬性 → 前端格式。
 *
 * 與 `toWriteData` 成對維護：這 15 欄任何一邊漏接，症狀都是
 * 「選了員工，某一欄沒被帶進計算機」—— 而畫面上那一欄會是計算機的預設值，
 * 看起來完全正常。`ISalaryEmployeeProfile` 是把兩邊綁在一起的型別。
 */
const toProfile = (row: SalaryCalculatorEmployee): ISalaryEmployeeProfile => ({
  baseSalary: toAmount(row.baseSalary),
  mealAllowance: toAmount(row.mealAllowance),
  otherAllowanceTaxable: toAmount(row.otherAllowanceTaxable),
  otherAllowanceTaxFree: toAmount(row.otherAllowanceTaxFree),
  industryCode: row.industryCode,
  isForeignWorker: row.isForeignWorker,
  employmentType: row.employmentType,
  baseSalary30Days: row.baseSalary30Days,
  isLaborInsured: row.isLaborInsured,
  isHealthInsured: row.isHealthInsured,
  isPensionInsured: row.isPensionInsured,
  dependentsCount: row.dependentsCount,
  // Info: (20260902 - Julian) 落地是百分點整數，前端也是百分點整數；轉小數是 UI 那一層的事
  voluntaryPensionRate: row.voluntaryPensionRate,
  hireDate: toUnixSecondsOrNull(row.hireDate),
  resignDate: toUnixSecondsOrNull(row.resignDate),
});

/**
 * Info: (20260905 - Luphia) 留職停薪的起訖 → 前端格式（#6774）。
 *
 * 與 `toProfile` 分開：那一組是「自動匯入計算機」的契約（見
 * `ISalaryEmployeeProfile`），留停不在其中。合併會讓那個型別
 * 與計算機表單的對拍測試變紅。
 */
const toLeave = (row: SalaryCalculatorEmployee): ISalaryEmployeeLeave => ({
  leaveStartDate: toUnixSecondsOrNull(row.leaveStartDate),
  leaveEndDate: toUnixSecondsOrNull(row.leaveEndDate),
});

// Info: (20260902 - Julian) 寫入方向。與 toProfile 成對，理由見該函式
const toWriteData = (input: ISalaryCalculatorEmployeeWriteInput) => ({
  baseSalary: BigInt(input.baseSalary),
  mealAllowance: BigInt(input.mealAllowance),
  otherAllowanceTaxable: BigInt(input.otherAllowanceTaxable),
  otherAllowanceTaxFree: BigInt(input.otherAllowanceTaxFree),
  industryCode: input.industryCode,
  isForeignWorker: input.isForeignWorker,
  employmentType: input.employmentType,
  baseSalary30Days: input.baseSalary30Days,
  isLaborInsured: input.isLaborInsured,
  isHealthInsured: input.isHealthInsured,
  isPensionInsured: input.isPensionInsured,
  dependentsCount: input.dependentsCount,
  /**
   * Info: (20260902 - Julian) **不是 BigInt。** 這一欄是費率的百分點（0–6）。
   * 寫成 `BigInt(input.voluntaryPensionRate)` 在型別上會過（它是 number），
   * 但 schema 那一欄是 Int —— Prisma 會在執行期才抱怨，而且訊息不會提到「費率」。
   */
  voluntaryPensionRate: input.voluntaryPensionRate,
  hireDate: toDateOrNull(input.hireDate),
  resignDate: toDateOrNull(input.resignDate),
  // Info: (20260905 - Luphia) 留職停薪（#6774）。與 toLeave 成對
  leaveStartDate: toDateOrNull(input.leaveStartDate),
  leaveEndDate: toDateOrNull(input.leaveEndDate),
});

const toFrontendFormat = (
  row: SalaryCalculatorEmployee,
): ISalaryCalculatorEmployee => ({
  id: row.id,
  name: row.name,
  // Info: (20260831 - Julian) 編號是身分鍵，schema 上是必填，直接帶出
  number: row.number,
  // Info: (20260831 - Julian) Email 可空，null 打平成空字串（沿用 IVoucher.note 的既有慣例）
  email: row.email ?? "",
  ...toProfile(row),
  ...toLeave(row),
  /**
   * Info: (20260905 - Luphia) 完整度是**跨表**的問題（要對照薪資紀錄的分佈），
   * 而這一層一次只看得到員工這一列。空陣列是「還沒算」，由 service 覆蓋
   *（`salary_record.service.ts` 的 `listEmployees`）。
   *
   * 給預設而不是讓它可選：可選的話，忘了覆蓋的那條路徑會是 `undefined`，
   * 而畫面上 `undefined` 與「完整」長得一模一樣。
   */
  missingPeriods: [],
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

  /**
   * Info: (20260905 - Luphia) 名稱說出承諾：**存活中**的員工（review #6769）。
   *
   * 原名 `getEmployeeById` 沒有講出 `deletedAt: null` 這一半，於是
   * 「為什麼要濾軟刪除」變成一件要讀實作才知道的事 —— 而讀不到的人
   * 想放寬顯示範圍時，最順手的動作是把那個條件拿掉。
   *
   * 它今天的兩個呼叫端都是**動作**路徑：
   *
   * - `saveRecord`：替已移除的員工建立新的薪資紀錄
   * - `deliver`：把薪資單 PDF 寄給已經離開的人
   *
   * 兩者都不該對已刪除的員工成立，所以這一支恆濾。要列出含已刪除的
   * 員工（歷史清單之類）請另開一支 `findEmployeeById`，不要放寬這一支 ——
   * 放寬的話上面兩件事會一起靜靜變成可能，而畫面上看不出來。
   *
   * `accountBookId` 是**授權**不是識別：`employeeId` 是 uuid 主鍵，
   * 拿它就找得到列；帶帳本才讓「別人家的員工」變成查無此人。
   * `saveRecord` 的 `employeeId` 來自 request body，所以這一層是走得到的。
   */
  public async getActiveEmployeeById(
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
      ...toWriteData(input),
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
    /**
     * Info: (20260902 - Julian) `...toWriteData(input)` 曾經在這裡被 merge 靜默吃掉。
     *
     * 20260902 把 develop 併進來時，這一段被 `9dc404ff0`（把斷言接到真正的寫入）
     * 整塊取代，而那一版是在 15 個常態屬性落地**之前**寫的 ——
     * 於是編輯員工只寫得進姓名、編號、Email 與兩個金額，
     * 行業別、投保狀態、扶養人數、自提比例、到離職日全部原地不動。
     *
     * 症狀完全靜默：`updateEmployee` 回傳的是重新查出來的那一列，所以畫面
     * 「更新成功」；使用者要等到下次打開員工表單才發現剛才改的東西沒進去。
     * 抓到它的是 `salary_repo.e2e.test.ts` 的「更新會把 15 欄一起改掉」——
     * 而那一支只在 CI 的獨立步驟跑。`salary_repo_scope.test.ts` 現在也守著
     * 交給資料庫的 `data`，那一支在預設套件裡。
     */
    const data = {
      name: input.name,
      number: input.number,
      email: input.email ?? null,
      activeNumber: activeNumberFor(input.number, null),
      ...toWriteData(input),
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

      return await this.getActiveEmployeeById(accountBookId, employeeId);
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
