import { DEMO_ACCOUNT_BOOK_ID } from "@/constants/attendance";

/**
 * Info: (20260817 - Julian) 假勤 API 的端點集中處，比照 `ATTENDANCE_API` 的做法。
 *
 * 與簽到分開一個檔：兩個模組的端點會各自演進，寫在一起會讓
 * 「改假勤的路徑」變成「動到簽到頁在用的常數」。
 *
 * Deprecated: (20260817 - Julian) 綁死 `DEMO_ACCOUNT_BOOK_ID` 是 demo 的簡化，
 * 與 `ATTENDANCE_API` 是同一個缺口（接線守則 §4 第 12 項）。正式版帳本可切換時
 * 這裡要改成 `leaveApiOf(accountBookId)`，呼叫端從常數改為函式呼叫。
 */
const LEAVE_API_BASE = `/api/v1/user/account_book/${DEMO_ACCOUNT_BOOK_ID}/hr/leave`;

export const LEAVE_API = {
  // Info: (20260817 - Julian) L1：可請的假別
  POLICY: `${LEAVE_API_BASE}/policy`,
  // Info: (20260817 - Julian) L7 / L8：餘額與帳本
  BALANCE: `${LEAVE_API_BASE}/balance`,
  BALANCE_LEDGER: `${LEAVE_API_BASE}/balance/ledger`,
  // Info: (20260817 - Julian) L10 / L11：我的假單、送出
  REQUEST: `${LEAVE_API_BASE}/request`,
  // Info: (20260817 - Julian) L17：試算
  REQUEST_PREVIEW: `${LEAVE_API_BASE}/request/preview`,
  // Info: (20260817 - Julian) L16：待我簽核
  REQUEST_PENDING: `${LEAVE_API_BASE}/request/pending`,
} as const;

// Info: (20260817 - Julian) 帶路徑參數的端點寫成函式，避免呼叫端自己接字串
export const leaveRequestApi = (requestId: string): string =>
  `${LEAVE_API_BASE}/request/${requestId}`;

export const leaveRequestApproveApi = (requestId: string): string =>
  `${LEAVE_API_BASE}/request/${requestId}/approve`;

export const leaveRequestRejectApi = (requestId: string): string =>
  `${LEAVE_API_BASE}/request/${requestId}/reject`;
