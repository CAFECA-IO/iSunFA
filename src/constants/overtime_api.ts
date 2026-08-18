import { DEMO_ACCOUNT_BOOK_ID } from "@/constants/attendance";

/**
 * Info: (20260818 - Julian) 加班 API 的端點集中處，比照 `LEAVE_API` 的做法。
 *
 * 與假勤分開一個檔：兩者的端點會各自演進，寫在一起會讓「改加班的路徑」
 * 變成「動到請假頁在用的常數」。
 *
 * Deprecated: (20260818 - Julian) 綁死 `DEMO_ACCOUNT_BOOK_ID` 是 demo 的簡化，
 * 與 `ATTENDANCE_API` / `LEAVE_API` 是同一個缺口（接線守則 §4 第 12 項）。
 * 正式版帳本可切換時這裡要改成 `overtimeApiOf(accountBookId)`。
 */
const OVERTIME_API_BASE = `/api/v1/user/account_book/${DEMO_ACCOUNT_BOOK_ID}/hr/overtime`;

export const OVERTIME_API = {
  // Info: (20260818 - Julian) L24 / L25：我的加班單、送出
  REQUEST: `${OVERTIME_API_BASE}/request`,
  // Info: (20260818 - Julian) 待我簽核（§10 未編號，見該 route 的說明）
  REQUEST_PENDING: `${OVERTIME_API_BASE}/request/pending`,
  // Info: (20260818 - Julian) L28：月／季統計與上限
  SUMMARY: `${OVERTIME_API_BASE}/summary`,
  // Info: (20260818 - Julian) L29：有打卡但無核准加班單的時段
  UNAPPROVED: `${OVERTIME_API_BASE}/unapproved`,
  // Info: (20260818 - Julian) L30：加班政策
  POLICY: `${OVERTIME_API_BASE}/policy`,
} as const;

// Info: (20260818 - Julian) 帶路徑參數的端點寫成函式，避免呼叫端自己接字串
export const overtimeRequestApproveApi = (requestId: string): string =>
  `${OVERTIME_API_BASE}/request/${requestId}/approve`;

export const overtimeRequestRejectApi = (requestId: string): string =>
  `${OVERTIME_API_BASE}/request/${requestId}/reject`;
