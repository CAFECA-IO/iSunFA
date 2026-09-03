/**
 * Info: (20260831 - Julian) 薪資計算機的 API 位址。
 *
 * 形狀照 `src/constants/leave_api.ts`：帶路徑參數的一律寫成函式，不讓呼叫端自己接字串。
 * 差別是這裡**不硬編碼 demo 帳本** —— 帳本 id 由呼叫端從路由參數傳入，
 * 也就是那四支 HR `*_api.ts` 的 `Deprecated` 標記所指向的解法。
 */

const salaryCalculatorApiBase = (accountBookId: string): string =>
  `/api/v1/user/account_book/${accountBookId}/salary_calculator`;

export const salaryCalculatorApiOf = (accountBookId: string) =>
  ({
    EMPLOYEE: `${salaryCalculatorApiBase(accountBookId)}/employee`,
    RECORD: `${salaryCalculatorApiBase(accountBookId)}/record`,
  }) as const;

export const salaryEmployeeItemApi = (
  accountBookId: string,
  employeeId: string,
): string => `${salaryCalculatorApiOf(accountBookId).EMPLOYEE}/${employeeId}`;

export const salaryRecordItemApi = (
  accountBookId: string,
  recordId: string,
): string => `${salaryCalculatorApiOf(accountBookId).RECORD}/${recordId}`;
