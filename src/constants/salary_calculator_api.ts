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
    // Info: (20260904 - Julian) 「已寄出」分頁：整本帳的薪資單寄送歷史
    DELIVERY: `${salaryCalculatorApiBase(accountBookId)}/delivery`,
  }) as const;

export const salaryEmployeeItemApi = (
  accountBookId: string,
  employeeId: string,
): string => `${salaryCalculatorApiOf(accountBookId).EMPLOYEE}/${employeeId}`;

export const salaryRecordItemApi = (
  accountBookId: string,
  recordId: string,
): string => `${salaryCalculatorApiOf(accountBookId).RECORD}/${recordId}`;

/**
 * Info: (20260904 - Julian) 寄出某一筆薪資紀錄的薪資單。
 *
 * 掛在紀錄底下而不是另開一支：寄送的對象就是那一筆，`recordId` 是它唯一需要的輸入。
 * 收件人由伺服器從那一筆推導，前端指定不了（計畫書 D3）。
 */
export const salaryRecordDeliverApi = (
  accountBookId: string,
  recordId: string,
): string => `${salaryRecordItemApi(accountBookId, recordId)}/deliver`;
