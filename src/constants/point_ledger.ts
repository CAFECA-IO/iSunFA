/**
 * Info: (20261015 - Luphia) 個人點數帳本（`PointLedger`）的常數。
 *
 * 區塊鏈損毀後退役（見 `services/point_ledger.service.ts`）：個人點數不再是
 * CreditPoint ERC-20 的鏈上餘額，而是 DB 帳本的加總，`User.pointBalance` 為其快取。
 */

/**
 * Info: (20261015 - Luphia) 分錄型別。帳本 append-only，更正只寫反向分錄。
 */
export const POINT_LEDGER_ENTRY_TYPE = {
  // Info: (20261015 - Luphia) 刷卡購點（OEN_PAYMENT）
  PURCHASE: "PURCHASE",
  // Info: (20261015 - Luphia) 後台發放給個人（ADMIN_ISSUED，無 data.teamId）
  ADMIN_ISSUED: "ADMIN_ISSUED",
  // Info: (20261015 - Luphia) 註冊獎勵（原本由 MembershipSystem.registerUser 鑄造）
  REGISTRATION_REWARD: "REGISTRATION_REWARD",
  // Info: (20261015 - Luphia) 已停用的每日簽到獎勵；只會由復原指令依歷史訂單寫入
  CHECK_IN_REWARD: "CHECK_IN_REWARD",
  // Info: (20261015 - Luphia) 活動報名贈點（Campaign.bonusPoints）
  CAMPAIGN_BONUS: "CAMPAIGN_BONUS",
  // Info: (20261015 - Luphia) 團隊分配到成員個人（ADR 015 修訂後的 ALLOCATE）
  TEAM_ALLOCATION: "TEAM_ALLOCATION",
  // Info: (20261015 - Luphia) 個人點數消費（ANALYSIS 訂單）
  CONSUME: "CONSUME",
  // Info: (20261015 - Luphia) 工作失敗退還個人點數
  REFUND: "REFUND",
  // Info: (20261015 - Luphia) 人工調整（反向分錄）
  ADJUST: "ADJUST",
} as const;

export type PointLedgerEntryType =
  (typeof POINT_LEDGER_ENTRY_TYPE)[keyof typeof POINT_LEDGER_ENTRY_TYPE];

/**
 * Info: (20261015 - Luphia) 單筆入帳／出帳的結果。
 */
export const POINT_LEDGER_OUTCOME = {
  OK: "OK",
  // Info: (20261015 - Luphia) 冪等重放：同一把鍵已入帳，本次未重複異動餘額
  DUPLICATE: "DUPLICATE",
  INSUFFICIENT: "INSUFFICIENT",
  USER_NOT_FOUND: "USER_NOT_FOUND",
} as const;

export type PointLedgerOutcome =
  (typeof POINT_LEDGER_OUTCOME)[keyof typeof POINT_LEDGER_OUTCOME];

/**
 * Info: (20261015 - Luphia) 冪等鍵。**以來源命名**而不是以「哪段程式寫的」命名：
 * 線上流程與 `scripts/restore_points_from_db.ts` 對同一個來源產生同一把鍵，
 * 唯一約束保證兩邊無論誰先寫、寫幾次，都只入帳一次。
 */
export const POINT_LEDGER_KEY = {
  orderCredit: (orderId: string) => `order-credit:${orderId}`,
  orderDebit: (orderId: string) => `order-debit:${orderId}`,
  orderRefund: (orderId: string) => `order-refund:${orderId}`,
  registration: (userId: string) => `registration:${userId}`,
  campaign: (registrationId: string) => `campaign:${registrationId}`,
  teamAllocation: (teamLedgerId: string) => `team-allocate:${teamLedgerId}`,
  teamMigration: (teamLedgerId: string) => `team-migrate:${teamLedgerId}`,
  // Info: (20261015 - Luphia) 撤銷依舊規則誤發的團隊分配（遷移前的離鏈分配被重複計入）
  teamAllocationReversal: (pointLedgerId: string) =>
    `team-allocate-reversal:${pointLedgerId}`,
} as const;
