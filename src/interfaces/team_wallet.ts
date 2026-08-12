import type {
  BillableFeatureCode,
  QuotaExceededOption,
  QuotaWindow,
  SpendSource,
  TeamLedgerAnchorStatus,
  TeamPlanId,
  TeamSubscriptionStatus,
  TeamWalletEntryType,
  TeamWalletStatus,
} from "@/constants/subscription_quota";

/**
 * Info: (20260807 - Luphia) 團隊錢包與訂閱額度的 API DTO。
 * 設計書 §3 / §5 / §7；金額一律以字串傳輸（BigInt 零誤差，避免 JSON number 精度陷阱），
 * 時間一律 epoch 秒（number），與視窗純函式（src/lib/quota/window.ts）同單位。
 */

export interface IQuotaWindowStatus {
  limit: string;
  used: string;
  resetAt: number;
}

export interface IQuotaStatus {
  quota5h: IQuotaWindowStatus;
  quotaWeek: IQuotaWindowStatus;
}

export interface ITeamSubscriptionView {
  teamId: string;
  planId: TeamPlanId;
  status: TeamSubscriptionStatus;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  autoRenew: boolean;
  quota: IQuotaStatus;
  // Info: (20260807 - Luphia) 定價揭露（設計書 §5.3）：費思費率與 env 同源，前端插值渲染
  faithTokensPerCredit: number;
}

export interface ITeamWalletView {
  teamId: string;
  status: TeamWalletStatus;
  /**
   * Info: (20260809 - Luphia) 未分配池餘額為管理職資訊：僅 OWNER / ADMIN 回傳，
   * 一般成員視角省略此欄位（後端就不給，非僅前端隱藏——零信任）
   */
  unallocatedBalance?: string;
  // Info: (20260807 - Luphia) 呼叫者自己的分配餘額；管理者視角另以 allocations 列表取全員
  myAllocationBalance: string;
}

export interface IAllocationView {
  userId: string;
  balance: string;
  updatedAt: number;
}

export interface ILedgerEntryView {
  id: string;
  entryType: TeamWalletEntryType;
  amount: string;
  poolBalanceAfter: string | null;
  allocationBalanceAfter: string | null;
  targetUserId: string | null;
  operatorUserId: string;
  orderId: string | null;
  featureCode: BillableFeatureCode | null;
  createdAt: number;
}

export interface ISpendResult {
  source: SpendSource;
  // Info: (20260813 - Luphia) 本次實際預扣總額（= quotaAmount + allocationAmount）
  amount: string;
  // Info: (20260813 - Luphia) 拆帳明細（設計書 §5.4）：分別記錄兩個來源各扣多少
  quotaAmount: string;
  allocationAmount: string;
  idempotencyKey: string;
}

/**
 * Info: (20260807 - Luphia) 額度用罄時 402 回應的 data payload（設計書 §5）：
 * 附三條出路所需的全部資訊（等待重置 / 用分配點數 / 用個人錢包）。
 */
export interface IQuotaExceededPayload {
  exceeded: QuotaWindow;
  quota5h: IQuotaWindowStatus;
  quotaWeek: IQuotaWindowStatus;
  allocationBalance: string;
  options: QuotaExceededOption[];
}

export interface ILedgerAnchorView {
  anchorDate: string;
  entryCount: number;
  dayMerkleRoot: string;
  chainedRoot: string;
  txHash: string | null;
  status: TeamLedgerAnchorStatus;
}
