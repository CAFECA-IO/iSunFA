import { isTeamManagerRole } from "@/constants/team";

/**
 * Info: (20260818 - Luphia) 成員清單上「以信箱不符的邀請加入」的標記（PR #6652 第三輪 C-2）。
 *
 * `TeamInvitation.acceptedEmailMatch` 在此之前是純寫入欄位：DB 老實記下
 * `MISMATCHED`，而沒有任何查詢、API 或畫面讀它——稽核欄位沒有讀者，
 * 稽核價值就是零。
 *
 * 這件事本身不是錯誤：接受邀請不綁身分是刻意的設計（`User` 沒有 email 欄位，
 * passkey 註冊的帳號根本沒有可比對的信箱），所以不符**不擋人加入**。
 * 但它是「連結被轉寄出去、被別人用掉」唯一會留下的痕跡，
 * 而有權處置的人是管理職。
 *
 * 因此非管理職拿到的是**原樣的清單**，連 `emailMismatch: false` 都不給：
 * 少一個欄位比多一個恆為 false 的欄位安全——後者會讓前端以為
 * 「沒有標記」等於「已驗證相符」。
 */
export function attachEmailMismatch<T extends { userId: string }>(
  members: readonly T[],
  viewerRole: string | null | undefined,
  mismatchedUserIds: Iterable<string>,
): (T | (T & { emailMismatch: boolean }))[] {
  if (!isTeamManagerRole(viewerRole)) return [...members];

  const mismatched = new Set(mismatchedUserIds);
  return members.map((member) => ({
    ...member,
    emailMismatch: mismatched.has(member.userId),
  }));
}
