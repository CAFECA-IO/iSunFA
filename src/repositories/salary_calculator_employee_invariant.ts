/**
 * Info: (20260831 - Julian) `SalaryCalculatorEmployee` 的 `activeNumber` 不變式。
 *
 * ## 這一欄在做什麼
 *
 * 需求是「同一本帳裡，**存活中的**員工編號不得重複」——
 * 員工編號是這張表的身分，薪資實務上認的是編號而不是信箱（信箱可空）。
 * Prisma 表達不了 partial unique index，因此依 `code_review_checklist §5.3`
 * 改用 nullable 唯一欄位：`@@unique([accountBookId, activeNumber])`，
 * 存活時 `activeNumber === number`，soft delete 時 `activeNumber === null`
 * （Postgres 的唯一索引不約束 NULL，所以刪掉的列不會互相打架，
 * 同一個編號也能重新加入）。
 *
 * ## 為什麼抽成獨立模組
 *
 * 這條規則的正確性完全靠「每一條寫入路徑都記得同時維護兩欄」，
 * 而那種靠記性的約束遲早會漏。抽成純函式之後它測得到
 * （`src/__tests__/salary_employee_invariant.test.ts`），
 * repository 的每一條寫入路徑也只能經由這裡取值。
 */

// Info: (20260831 - Julian) 判斷不變式所需的最小欄位集合
export interface ISalaryEmployeeActiveState {
  number: string;
  activeNumber: string | null;
  deletedAt: Date | null;
}

export class SalaryEmployeeInvariantError extends Error {
  constructor(message: string) {
    super(`SalaryCalculatorEmployee: ${message}`);
    this.name = "SalaryEmployeeInvariantError";
  }
}

/**
 * Info: (20260831 - Julian) 由存活狀態推出 `activeNumber` 應有的值。
 * 這是唯一該產生這個值的地方 —— repository 不自己寫 `activeNumber: number`。
 */
export const activeNumberFor = (
  employeeNumber: string,
  deletedAt: Date | null,
): string | null => (deletedAt === null ? employeeNumber : null);

/**
 * Info: (20260831 - Julian) 落地前的最後一道檢查。
 *
 * 存活的列 `activeNumber` 必須等於 `number`；已刪除的列必須是 null。
 * 兩者都違反時，唯一鍵擋不住的是「同一個編號出現兩筆存活列」——
 * 那會讓「這個月的薪資紀錄屬於誰」變成擲骰子。
 */
export const assertActiveNumberPairing = (
  state: ISalaryEmployeeActiveState,
): void => {
  if (state.deletedAt === null) {
    if (state.activeNumber !== state.number) {
      throw new SalaryEmployeeInvariantError(
        `a live employee must carry activeNumber === number (number=${state.number}, activeNumber=${String(state.activeNumber)})`,
      );
    }
    return;
  }

  if (state.activeNumber !== null) {
    throw new SalaryEmployeeInvariantError(
      `a deleted employee must carry activeNumber === null (number=${state.number}, activeNumber=${String(state.activeNumber)})`,
    );
  }
};
