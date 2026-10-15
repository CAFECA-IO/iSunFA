/**
 * Info: (20261015 - Luphia) 後台「點數明細」（GET /api/v1/admin/user/[user_id]/points、
 * /team_allocations）的常數。判定規則見 `lib/quota/admin_user_points.ts`。
 */

/**
 * Info: (20261015 - Luphia) 一筆指向該用戶的團隊分錄「實際上有沒有給到他」。
 *
 * - CREDITED：`resolveMemberAllocationCredits` 判定給到成員的 ALLOCATE；
 * - MIGRATION：2026-08-14 遷移時以 `migrate-allocation:` 撥給成員的 ADJUST（也算給到）；
 * - COMPENSATED：有 `allocate-failed:` 補償分錄，等於沒給；
 * - PRE_MIGRATION：遷移前的離鏈 ALLOCATE（無 txHash、無 `allocate-offchain-exit:`），
 *   剩餘部分已由 MIGRATION 計入，本筆不再算；
 * - OTHER：REVOKE、其他 ADJUST，或資料不完整而被規則略過的分錄。
 */
export const TEAM_ALLOCATION_RECORD_STATUS = {
  CREDITED: "CREDITED",
  MIGRATION: "MIGRATION",
  COMPENSATED: "COMPENSATED",
  PRE_MIGRATION: "PRE_MIGRATION",
  OTHER: "OTHER",
} as const;

export type TeamAllocationRecordStatus =
  (typeof TEAM_ALLOCATION_RECORD_STATUS)[keyof typeof TEAM_ALLOCATION_RECORD_STATUS];

// Info: (20261015 - Luphia) 「點數明細」清單的預設與上限筆數（validator 與前端共用）
export const ADMIN_USER_POINTS_PAGE_SIZE = {
  DEFAULT: 20,
  MAX: 100,
} as const;

// Info: (20261015 - Luphia) 「點數明細」modal 的分頁籤
export const ADMIN_USER_POINTS_TAB = {
  OVERVIEW: "OVERVIEW",
  LEDGER: "LEDGER",
  TEAM: "TEAM",
} as const;

export type AdminUserPointsTab =
  (typeof ADMIN_USER_POINTS_TAB)[keyof typeof ADMIN_USER_POINTS_TAB];
