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

export const overtimeRequestWithdrawApi = (requestId: string): string =>
  `${OVERTIME_API_BASE}/request/${requestId}/withdraw`;

export const overtimeRequestRejectApi = (requestId: string): string =>
  `${OVERTIME_API_BASE}/request/${requestId}/reject`;

/**
 * Info: (20260821 - Julian) L27-b：撤銷核准，回到待簽（review 第 7 輪 B1）。
 * 它是 `VA_OVERTIME_EARLIER_THAN_APPROVED` 那句「先撤回較晚那一張」
 * 唯一的執行者 —— 在它之前 `APPROVED` 是終端狀態。
 */
export const overtimeRequestRevokeApprovalApi = (requestId: string): string =>
  `${OVERTIME_API_BASE}/request/${requestId}/revoke_approval`;

/**
 * Info: (20260819 - Julian) §32 IV 天災事變的認定（review B7）。
 * 限 `HR_ADMIN`，且只在待簽核狀態 —— 它不是決行，單子仍要由主管核准。
 */
export const overtimeRequestEmergencyApi = (requestId: string): string =>
  `${OVERTIME_API_BASE}/request/${requestId}/emergency`;
