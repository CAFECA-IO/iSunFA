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
