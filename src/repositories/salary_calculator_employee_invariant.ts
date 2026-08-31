/**
 * Info: (20260831 - Julian) `SalaryCalculatorEmployee` 的 `activeEmail` 不變式。
 *
 * ## 這一欄在做什麼
 *
 * 需求是「同一本帳裡，**存活中的**員工 Email 不得重複」。
 * Prisma 表達不了 partial unique index，因此依 `code_review_checklist §5.3`
 * 改用 nullable 唯一欄位：`@@unique([accountBookId, activeEmail])`，
 * 存活時 `activeEmail === email`，soft delete 時 `activeEmail === null`
 * （Postgres 的唯一索引不約束 NULL，所以刪掉的列不會互相打架，
 * 同一個 Email 也能重新加入）。
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
  email: string;
  activeEmail: string | null;
  deletedAt: Date | null;
}

export class SalaryEmployeeInvariantError extends Error {
  constructor(message: string) {
    super(`SalaryCalculatorEmployee: ${message}`);
    this.name = "SalaryEmployeeInvariantError";
  }
}

/**
 * Info: (20260831 - Julian) 由存活狀態推出 `activeEmail` 應有的值。
 * 這是唯一該產生這個值的地方 —— repository 不自己寫 `activeEmail: email`。
 */
export const activeEmailFor = (
  email: string,
  deletedAt: Date | null,
): string | null => (deletedAt === null ? email : null);

/**
 * Info: (20260831 - Julian) 落地前的最後一道檢查。
 *
 * 存活的列 `activeEmail` 必須等於 `email`；已刪除的列必須是 null。
 * 兩者都違反時，唯一鍵擋不住的是「同一個 Email 出現兩筆存活列」——
 * 那會讓寄薪資單這件事變成擲骰子。
 */
export const assertActiveEmailPairing = (
  state: ISalaryEmployeeActiveState,
): void => {
  if (state.deletedAt === null) {
    if (state.activeEmail !== state.email) {
      throw new SalaryEmployeeInvariantError(
        `a live employee must carry activeEmail === email (email=${state.email}, activeEmail=${String(state.activeEmail)})`,
      );
    }
    return;
  }

  if (state.activeEmail !== null) {
    throw new SalaryEmployeeInvariantError(
      `a deleted employee must carry activeEmail === null (email=${state.email}, activeEmail=${String(state.activeEmail)})`,
    );
  }
};
