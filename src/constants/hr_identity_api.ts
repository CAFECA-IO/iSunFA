import { DEMO_ACCOUNT_BOOK_ID } from "@/constants/attendance";

/**
 * Info: (20260818 - Julian) 身分端點。比照 `LEAVE_API` / `OVERTIME_API` 各自一個檔。
 *
 * Deprecated: (20260818 - Julian) 綁死 `DEMO_ACCOUNT_BOOK_ID` 是 demo 的簡化，
 * 與 `ATTENDANCE_API`、`LEAVE_API`、`OVERTIME_API` 是同一個缺口。
 * 正式版帳本可切換時，這裡改成 `hrIdentityApiOf(accountBookId)`。
 */
export const HR_IDENTITY_API = {
  ME: `/api/v1/user/account_book/${DEMO_ACCOUNT_BOOK_ID}/hr/me`,
} as const;
