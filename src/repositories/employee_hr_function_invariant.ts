/**
 * Info: (20260818 - Julian) HR 職能指派的「生效狀態必須自洽」不變式。
 *
 * ## 這條規則守的是什麼
 *
 * `EmployeeHrFunctionAssignment` 用三組欄位表達同一件事的兩種狀態：
 * `revokedAt`（何時撤銷）、`revokedBy*`（誰撤銷）、`activeKey`（是否生效）。
 * 三者若不同步，「四月那張單被簽核時誰有權限」這個問題就會有兩個答案 ——
 * 而那正是選擇用一張指派表而不是一個 enum 陣列的**唯一理由**。
 *
 * 最危險的組合是「`revokedAt` 有值但 `activeKey` 還在」：那個人在紀錄上
 * 已經被撤銷職能，卻仍會被 `listHolders()` 撈出來排進簽核鏈。
 * 反過來「`activeKey` 是 null 但 `revokedAt` 也是 null」則是一筆
 * 既沒生效也沒撤銷的孤兒，它不會出現在任何查詢裡，卻佔著唯一鍵之外的空間。
 *
 * ## 為什麼擋在 repository
 *
 * 指派的寫入路徑目前有兩條（seed 與 repository 方法），而 seed 直接進 Prisma，
 * 繞過 service。ToDo 裡的第三條（L34 指派 API）還會再多一條。
 * 擋在這一層，三條路徑共用同一個判斷（同 `assertSchedulableDay` 的處置）。
 *
 * ## `activeKey` 的組法只有這裡定義
 *
 * 比照 `activeKeyOf()` 的處置：部分唯一索引的值若在兩個地方各組一次，
 * 兩邊遲早分岔，而分岔的症狀是「唯一鍵擋不住重複指派」—— 那要到有人
 * 同時具備兩份同一職能、其中一份被撤銷之後才看得出來。
 */

import { EmployeeHrFunction } from "@/constants/hr_management";

export class EmployeeHrFunctionInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`EmployeeHrFunctionAssignment: ${reason} (${detail})`);
    this.name = "EmployeeHrFunctionInvariantError";
  }
}

/**
 * Info: (20260818 - Julian) 生效中的部分唯一索引值。**只有這一處定義。**
 * 撤銷時填回 null，讓「同一人同一職能不得同時有兩列生效」由資料庫擋，
 * 而不是靠應用層先查後寫（`code_review_checklist.md` §3.2）。
 */
export const activeHrFunctionKeyOf = (
  employeeId: string,
  hrFunction: EmployeeHrFunction,
): string => `${employeeId}:${hrFunction}`;

export interface IStorableHrFunctionAssignment {
  employeeId: string;
  function: EmployeeHrFunction;
  grantedByEmployeeNo: string;
  grantedByName: string;
  revokedAt: Date | null;
  revokedByEmployeeNo: string | null;
  revokedByName: string | null;
  activeKey: string | null;
}

export const assertStorableHrFunctionAssignment = (
  assignment: IStorableHrFunctionAssignment,
): void => {
  /**
   * Info: (20260818 - Julian) 指派者的快照不可為空。
   * 外鍵是 `SetNull`（指派者離職會斷），所以這兩個字串是「誰給的」的**唯一**
   * 長期來源 —— 空字串等於一筆沒有人指派過的權限（ADR 023 §1 第 2 點的失敗模式）。
   */
  if (
    assignment.grantedByEmployeeNo.trim().length === 0 ||
    assignment.grantedByName.trim().length === 0
  ) {
    throw new EmployeeHrFunctionInvariantError(
      "grantedByEmployeeNo and grantedByName must both be non-empty",
      `employeeNo="${assignment.grantedByEmployeeNo}", name="${assignment.grantedByName}"`,
    );
  }

  const revoked = assignment.revokedAt !== null;
  const hasRevoker =
    assignment.revokedByEmployeeNo !== null &&
    assignment.revokedByName !== null;

  // Info: (20260818 - Julian) 雙向：撤銷了就要知道是誰撤的；沒撤銷就不該有撤銷者
  if (revoked !== hasRevoker) {
    throw new EmployeeHrFunctionInvariantError(
      revoked
        ? "revokedAt is set but the revoker snapshot is missing"
        : "a revoker snapshot exists but revokedAt is null",
      `revokedAt=${String(assignment.revokedAt)}, revokedByEmployeeNo=${String(assignment.revokedByEmployeeNo)}`,
    );
  }

  const expectedKey = activeHrFunctionKeyOf(
    assignment.employeeId,
    assignment.function,
  );

  // Info: (20260818 - Julian) 雙向：生效中必須帶正確的 activeKey，撤銷後必須清成 null
  if (revoked) {
    if (assignment.activeKey !== null) {
      throw new EmployeeHrFunctionInvariantError(
        "a revoked assignment must not keep its activeKey; it would still be picked up by listHolders()",
        `activeKey=${assignment.activeKey}`,
      );
    }
    return;
  }

  if (assignment.activeKey !== expectedKey) {
    throw new EmployeeHrFunctionInvariantError(
      "an active assignment must carry activeKeyOf(employeeId, function)",
      `activeKey=${String(assignment.activeKey)}, expected=${expectedKey}`,
    );
  }
};
