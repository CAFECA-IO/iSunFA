import { PLAN } from "@/constants/plans";

/**
 * Info: (20260807 - Luphia) 團隊錢包與訂閱額度常數。
 * 設計書：documents/architecture/team_wallet_and_subscription_quota.md（§4、§5）、ADR 015。
 * 額度採固定視窗（5 小時 + 週雙層），數值可由 env 覆寫（部署調參不改碼），
 * 費率與方案額度的估算依據見設計書 §4.1 / §5.3。
 */

// Info: (20260807 - Luphia) 視窗常數：純數學，禁止依賴系統時區（5h = 18,000 秒、週 = 604,800 秒）
export const FIVE_HOURS_SEC = 5 * 60 * 60;
export const WEEK_SEC = 7 * 24 * 60 * 60;

/**
 * Info: (20260807 - Luphia) 週視窗錨點：2026-01-05（一）00:00 Asia/Taipei 的 epoch 秒。
 * 所有週視窗自此錨點對齊，確保「每週一 00:00（UTC+8）重置」的決定論行為。
 */
export const WEEK_ANCHOR_EPOCH_SEC = 1767542400;

/**
 * Info: (20260812 - Luphia) 雙視窗識別碼（402 payload 的 `exceeded`）。
 * 原先以字面字串散落於 spend.service 與前端判斷，違反 CLAUDE.md §3「拒絕魔法字串」，
 * 收斂至此作為唯一來源；前端據此決定倒數要讀哪一個視窗的 resetAt。
 */
export const QUOTA_WINDOW = {
  PER_5H: "PER_5H",
  PER_WEEK: "PER_WEEK",
} as const;

export type QuotaWindow = (typeof QUOTA_WINDOW)[keyof typeof QUOTA_WINDOW];

/**
 * Info: (20260812 - Luphia) 額度用罄時 402 payload 揭露的出路（設計書 §5 三條出路）。
 */
export const QUOTA_EXCEEDED_OPTION = {
  WAIT_RESET: "WAIT_RESET",
  USE_ALLOCATION: "USE_ALLOCATION",
  USE_PERSONAL_WALLET: "USE_PERSONAL_WALLET",
  /**
   * Info: (20260815 - Luphia) 單筆金額超過整個視窗上限時的出路（PR #6652 第二輪 C-5）：
   * 等重置永遠不會有幫助，只能改用個人點數或升級方案。
   */
  UPGRADE_PLAN: "UPGRADE_PLAN",
} as const;

export type QuotaExceededOption =
  (typeof QUOTA_EXCEEDED_OPTION)[keyof typeof QUOTA_EXCEEDED_OPTION];

// Info: (20260807 - Luphia) 訂閱方案僅適用團隊三階（PLAN.PERSONAL 不參與團隊訂閱）
export const TEAM_PLAN = {
  FREE: PLAN.FREE,
  TEAM: PLAN.TEAM,
  BUSINESS: PLAN.BUSINESS,
} as const;

export type TeamPlanId = (typeof TEAM_PLAN)[keyof typeof TEAM_PLAN];

export interface ISubscriptionQuota {
  per5h: number;
  perWeek: number;
}

/**
 * Info: (20260809 - Luphia) 各方案雙視窗額度的**預設值**（單位：credit，與 ANALYSIS_BASE_COSTS 同）。
 *
 * 正式值為系統設定，保存於 DB 的 `SubscriptionPlanQuota` 表（可由後台調整、留變更軌跡、
 * 多實例一致）；本常數僅在查無設定列時作為 fail-safe 預設。
 * **嚴禁改回 env 覆寫**——非 NEXT_PUBLIC_ 的環境變數在 client bundle 讀不到，
 * 會使 server 與 client 算出不同結果（hydration mismatch）。
 *
 * 數值來源為工程建議值（月額 ÷ 4 ≈ 週額；週額 ÷ 8 ≈ 5h 突發上限）。
 */
export const DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN: Record<
  TeamPlanId,
  ISubscriptionQuota
> = {
  [TEAM_PLAN.FREE]: { per5h: 10, perWeek: 40 },
  [TEAM_PLAN.TEAM]: { per5h: 100, perWeek: 750 },
  [TEAM_PLAN.BUSINESS]: { per5h: 1000, perWeek: 7500 },
};

/**
 * Info: (20260814 - Luphia) 免費版團隊的人數上限預設值（PR #6652 第二輪 B-4）。
 *
 * 額度逐成員計算後，付費方案以「席次 × 單價」自然封頂，免費版沒有這個機制——
 * 席次單價是 0，人數再多帳單都是 0，而每個人各自享有一份額度。
 * 這個上限就是免費版的封頂。正式值為系統設定（可後台調整），此為 fail-safe 預設。
 *
 * Info: (20260818 - Luphia) 上限定為 **1（僅擁有者本人）**（產品決定 20260818）。
 *
 * 免費版是給個人或試用的：要加第二個人就代表這是團隊在用，而團隊用量該由
 * 席次計費承擔。訂為 1 也讓「上限」與「方案的定位」是同一件事——
 * 先前的 5 是一個沒有依據的中間值，既擋不住小型團隊白用，又讓人以為
 * 免費版本來就支援多人協作。
 */
export const DEFAULT_FREE_PLAN_MAX_MEMBERS = 1;

export const TEAM_SUBSCRIPTION_STATUS = {
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
} as const;

export type TeamSubscriptionStatus =
  (typeof TEAM_SUBSCRIPTION_STATUS)[keyof typeof TEAM_SUBSCRIPTION_STATUS];

export const TEAM_WALLET_STATUS = {
  ACTIVE: "ACTIVE",
  // Info: (20260807 - Luphia) 守恆勾稽失敗時凍結，人工介入前禁止任何異動
  FROZEN: "FROZEN",
  // Info: (20260807 - Luphia) 團隊解散後關閉（餘額已以反向分錄歸零）
  CLOSED: "CLOSED",
} as const;

export type TeamWalletStatus =
  (typeof TEAM_WALLET_STATUS)[keyof typeof TEAM_WALLET_STATUS];

/**
 * Info: (20260807 - Luphia) Ledger 分錄型別。帳本為 append-only，
 * 任何更正僅允許以 REFUND / ADJUST 反向分錄表達，嚴禁 UPDATE / DELETE。
 */
export const TEAM_WALLET_ENTRY_TYPE = {
  PURCHASE: "PURCHASE",
  ALLOCATE: "ALLOCATE",
  REVOKE: "REVOKE",
  CONSUME: "CONSUME",
  REFUND: "REFUND",
  ADJUST: "ADJUST",
} as const;

export type TeamWalletEntryType =
  (typeof TEAM_WALLET_ENTRY_TYPE)[keyof typeof TEAM_WALLET_ENTRY_TYPE];

// Info: (20260807 - Luphia) 扣費管線的扣款來源（設計書 §5 三層順序）
export const SPEND_SOURCE = {
  SUBSCRIPTION_QUOTA: "SUBSCRIPTION_QUOTA",
  TEAM_ALLOCATION: "TEAM_ALLOCATION",
  PERSONAL_WALLET: "PERSONAL_WALLET",
  /**
   * Info: (20260813 - Luphia) 拆帳（設計書 §5.4）：同一筆消費同時扣了訂閱額度與分配點數。
   * 額度剩餘不足全額時不再整筆改扣錢包，而是「額度用光、差額扣錢包」，故需要第四種來源。
   */
  MIXED: "MIXED",
} as const;

export type SpendSource = (typeof SPEND_SOURCE)[keyof typeof SPEND_SOURCE];

// Info: (20260807 - Luphia) 計費功能代碼（TeamQuotaUsage.featureCode / Ledger.featureCode）
export const BILLABLE_FEATURE_CODE = {
  FAITH_CHAT: "FAITH_CHAT",
  AI_ANALYSIS: "AI_ANALYSIS",
  CARBON_CHAT: "CARBON_CHAT",
  // Info: (20260813 - Luphia) 物流碳足跡查詢：以專屬代碼記帳，才分得出與對話類的用量
  LOGISTICS_CARBON: "LOGISTICS_CARBON",
  // Info: (20260807 - Luphia) 團隊解散歸零分錄專用（設計書 §6.3），非可消費功能
  TEAM_DISSOLVED: "TEAM_DISSOLVED",
} as const;

export type BillableFeatureCode =
  (typeof BILLABLE_FEATURE_CODE)[keyof typeof BILLABLE_FEATURE_CODE];

/**
 * Info: (20260813 - Luphia) 扣款來源的優先順序（設計書 §5.4）。
 *
 * 預設 QUOTA_FIRST：訂閱額度會週期性重置歸零，錢包點數是買來的資產，
 * 先用會過期的那一份對用戶有利。
 */
export const SPEND_PRIORITY = {
  QUOTA_FIRST: "QUOTA_FIRST",
  ALLOCATION_FIRST: "ALLOCATION_FIRST",
} as const;

export type SpendPriority =
  (typeof SPEND_PRIORITY)[keyof typeof SPEND_PRIORITY];

/**
 * Info: (20260814 - Luphia) 逐功能的扣款順序（`FEATURE_SPEND_PRIORITY` / `resolveSpendPriority`）
 * 已於 2026-08-14 移除（PR #6652 第二輪 A-1）。
 *
 * 它排序的是「訂閱額度」與「團隊分配給成員的離鏈點數」。分配改為鑄到成員自己的錢包後，
 * 第二層變成**成員的個人資產**，而順序就固定了：一律先用團隊買的額度，
 * 不足才動用他自己的點數——先花成員的錢再用團隊額度，沒有任何情境說得通。
 *
 * 純函式 `splitSpend` 仍保留 priority 參數（已有單測涵蓋），供日後真的出現
 * 兩個對等來源時使用。
 */

// Info: (20260807 - Luphia) 訂閱計費週期（對齊既有 Order.data.billingInterval 慣例）
export const BILLING_INTERVAL = {
  MONTH: "month",
  YEAR: "year",
} as const;

export type BillingInterval =
  (typeof BILLING_INTERVAL)[keyof typeof BILLING_INTERVAL];

// Info: (20260807 - Luphia) 分配 API 的操作方向（設計書 §6.2）
export const ALLOCATION_DIRECTION = {
  ALLOCATE: "ALLOCATE",
  REVOKE: "REVOKE",
} as const;

export type AllocationDirection =
  (typeof ALLOCATION_DIRECTION)[keyof typeof ALLOCATION_DIRECTION];

/**
 * Info: (20260807 - Luphia) 錢包原子操作的結果判別（Repository → Service 溝通用），
 * Service 依此轉換為對應的 ApiError，Repository 不直接丟業務錯誤。
 */
export const WALLET_OP_OUTCOME = {
  OK: "OK",
  // Info: (20260807 - Luphia) 冪等重放：同 idempotencyKey 已入帳，未重複扣款
  DUPLICATE: "DUPLICATE",
  NO_WALLET: "NO_WALLET",
  FROZEN: "FROZEN",
  INSUFFICIENT: "INSUFFICIENT",
  NOT_FOUND: "NOT_FOUND",
} as const;

export type WalletOpOutcome =
  (typeof WALLET_OP_OUTCOME)[keyof typeof WALLET_OP_OUTCOME];

// Info: (20260807 - Luphia) C 案 Phase 1 每日 merkle 錨定狀態（ADR 015）
export const TEAM_LEDGER_ANCHOR_STATUS = {
  PENDING: "PENDING",
  ANCHORED: "ANCHORED",
  FAILED: "FAILED",
} as const;

export type TeamLedgerAnchorStatus =
  (typeof TEAM_LEDGER_ANCHOR_STATUS)[keyof typeof TEAM_LEDGER_ANCHOR_STATUS];
