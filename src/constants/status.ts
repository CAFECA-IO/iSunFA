export const ORDER_STATUS = {
  PENDING: "PENDING",
  PAYING: "PAYING",
  PAID: "PAID",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  EXECUTING: "EXECUTING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  MINT_FAILED: "MINT_FAILED",
  CANCEL: "CANCEL",
} as const;

/**
 * Info: (20260826 - Julian) 訂單的**終態**：到了這裡就不該再被自動流程改寫（review）。
 *
 * `IssueRecorder` 是全站唯一寫入訂單終態的地方，而它的兩處守門原本都寫成
 * 「不是 FAILED 就寫成 FAILED」——那個條件擋得住重複標記，擋不住**覆寫**：
 *
 * - 多任務訂單已經 `COMPLETED`，其中一個任務的檔案後來被判定放棄
 *   → 整張訂單被改回 FAILED，並發一則「你的分析失敗了」
 * - 使用者已經 `CANCEL`
 *   → 一樣被改成 FAILED，等於系統把使用者的決定推翻
 * - `MINT_FAILED` 是**完成之後**上鏈那一步失敗
 *   → 覆寫成 FAILED 會抹掉「分析其實跑完了」這個事實
 *
 * 反過來說，`PENDING` / `PAYING` / `PAID` / `EXECUTING` 是在途狀態，
 * 本來就等著被寫成終態 —— 那條路徑不能被這道守門擋住。
 *
 * 列舉終態而不是列舉在途狀態：新增一個在途狀態時，忘了登記的後果是
 * 「訂單卡住不動」（看得見）；新增一個終態時忘了登記的後果是
 * 「終態被安靜覆寫」（看不見）。讓看不見的那一種需要主動維護。
 */
export const TERMINAL_ORDER_STATUSES: readonly string[] = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.FAILED,
  ORDER_STATUS.CANCEL,
  ORDER_STATUS.PAYMENT_FAILED,
  ORDER_STATUS.MINT_FAILED,
] as const;

export function isTerminalOrderStatus(
  status: string | null | undefined,
): boolean {
  return typeof status === "string" && TERMINAL_ORDER_STATUSES.includes(status);
}

export const PAYMENT_TRANSACTION_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export const PAYMENT_STATUS = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export const TEAM_INVITATION_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  /**
   * Info: (20260818 - Luphia) 由管理者撤回（第三輪 D）。
   *
   * 與 `REJECTED` 分開：那是**受邀者**說不用了，這是**團隊**收回邀請。
   * 兩者對席次的效果相同（都不再佔用），但在稽核上是完全不同的事件——
   * 混成一個狀態就答不出「這封邀請是對方拒絕的，還是我們自己撤掉的」。
   */
  REVOKED: "REVOKED",
} as const;

/**
 * Info: (20260817 - Luphia) 受邀信箱與接受者已驗證信箱的比對結果。
 *
 * 只記錄、不阻擋——工作信箱收到邀請、用個人 Google 帳號登入是正常行為，
 * 擋下來只會製造客訴。但稽核時「相符」與「查無可比對信箱」是兩件事，
 * 混成一個布林值就分不出來了。
 */
export const INVITE_EMAIL_MATCH = {
  // Info: (20260817 - Luphia) 接受者的某個已驗證信箱等於受邀信箱
  MATCHED: "MATCHED",
  // Info: (20260817 - Luphia) 有已驗證信箱，但沒有一個等於受邀信箱
  MISMATCHED: "MISMATCHED",
  /**
   * Info: (20260817 - Luphia) 接受者沒有任何已驗證信箱可比對。
   * 這是常態而非異常：passkey 註冊全程不問 email。
   */
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type InviteEmailMatch =
  (typeof INVITE_EMAIL_MATCH)[keyof typeof INVITE_EMAIL_MATCH];

export const ORDER_TYPE = {
  OEN_BINDING: "OEN_BINDING",
  OEN_PAYMENT: "OEN_PAYMENT",
  REGISTRATION_REWARD: "REGISTRATION_REWARD",
  ADMIN_ISSUED: "ADMIN_ISSUED",
  CHECK_IN_REWARD: "CHECK_IN_REWARD",
  ANALYSIS: "ANALYSIS",
  BILLING_ON_PREMISE: "BILLING_ON_PREMISE",
  BILLING_SOLUTION: "BILLING_SOLUTION",
  BILLING_SUBSCRIBE: "BILLING_SUBSCRIBE",
  BILLING_POINT: "BILLING_POINT",
  // Info: (20260807 - Luphia) 團隊錢包購點：付款成功後入池（離鏈 Ledger），不 mint 鏈上點數
  BILLING_TEAM_POINT: "BILLING_TEAM_POINT",
  /**
   * Info: (20260814 - Luphia) 期中增加席次的比例補收（規範 P3）：
   * 以團隊記錄在案的綁定卡即時扣款，成功才建立邀請，不 mint 鏈上點數。
   */
  BILLING_SEAT_ADDITION: "BILLING_SEAT_ADDITION",
} as const;

export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];

export const PAYMENT_PROVIDER = {
  OEN_CALLBACK: "OEN_CALLBACK",
} as const;

export const SYSTEM_STATUS = {
  HEALTHY: "HEALTHY",
  UNHEALTHY: "UNHEALTHY",
  CHECKING: "CHECKING",
  UNCONFIGURED: "UNCONFIGURED",
} as const;

export const DPP_SKU_STATUS = {
  READY: "READY",
  AUDITING: "AUDITING",
  INCOMPLETE: "INCOMPLETE",
} as const;

export const COUPON_STATUS = {
  ACTIVE: "ACTIVE",
  USED: "USED",
  EXPIRED: "EXPIRED",
} as const;

export const MANAGEMENT_TYPE = {
  TASK: "TASK",
  ORDER: "ORDER",
  ALL: "ALL",
} as const;

export type ManagementType =
  (typeof MANAGEMENT_TYPE)[keyof typeof MANAGEMENT_TYPE];

export const ORDER_TYPE_PREFIX = {
  BILLING: "BILLING_",
} as const;

export const APPLICATION_STATUS = {
  CONTACTING: "CONTACTING",
  EVALUATING: "EVALUATING",
  CONTRACTING: "CONTRACTING",
  EXECUTING: "EXECUTING",
  CLOSED: "CLOSED",
} as const;
