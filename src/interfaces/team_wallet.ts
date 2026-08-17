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

/**
 * Info: (20260817 - Luphia) 全隊用量合計（PR #6652 第二輪 C-1）。
 *
 * 額度是一人一池，因此 `limit` 是「每人上限 × 目前人數」——它回答的是
 * 「這個團隊這一期買到的總量用掉多少」，而不是任何一個人的進度。
 *
 * **刻意沒有逐人明細**：成員各自用了多少 AI 是相當個人的資料，
 * 而付費者要問的問題用一個總和就回答得了（產品決定 20260817）。
 */
export interface ITeamQuotaTotals {
  memberCount: number;
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
  // Info: (20260817 - Luphia) 觀看者本人的額度（一人一池）
  quota: IQuotaStatus;
  /**
   * Info: (20260818 - Luphia) 全隊合計（第二輪 C-1）；**限管理職**（OWNER / ADMIN，產品決定 20260818）。
   * 一般成員的回應不含此欄——動用團隊錢包的人才需要這個數字，
   * 而它加上人數就能推估同事的平均用量。
   */
  teamTotals?: ITeamQuotaTotals;
  // Info: (20260807 - Luphia) 定價揭露（設計書 §5.3）：費思費率與 env 同源，前端插值渲染
  faithTokensPerCredit: number;
}

/**
 * Info: (20260813 - Luphia) 帳本情境下的額度檢視（費思常駐儀表用）。
 * 附 allocationBalance：拆帳後（設計書 §5.4）額度見底會自動接續扣分配點數，
 * 只給訂閱額度會讓用戶把 0% 誤讀成「不能用了」。
 */
export interface IAccountBookQuotaView {
  teamId: string;
  planId: TeamPlanId;
  quota: IQuotaStatus;
  allocationBalance: string;
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
  /**
   * Info: (20260814 - Luphia) 實際記帳所用的冪等鍵。重試（前一次已全額退還）會改用
   * 衍生鍵，因此**結算與退款必須用這把回傳的鍵**，不能拿呼叫端原本那把。
   */
  idempotencyKey: string;
  /**
   * Info: (20260814 - Luphia) 這次呼叫命中了尚未退還的既有扣款（冪等重放）。
   *
   * 冪等鍵保護的是「扣款」，不是「工作」：早退回傳成功後，呼叫端若照常執行，
   * 同一把鍵重送 N 次就是 1 次扣款 + N 次 LLM。因此重放必須是呼叫端看得見的狀態，
   * 由它決定要不要重跑。
   */
  replayed: boolean;
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
  /**
   * Info: (20260815 - Luphia) 本筆金額**超過整個視窗上限**（PR #6652 第二輪 C-5）。
   *
   * 固定價格的消費（分析報告、物流查詢）失敗時，原因常常不是「這段時間用得太多」，
   * 而是「這張單本來就比整個視窗的額度貴」——免費版每 5 小時 10 點，而一張分析報告
   * 要 50 點。這種情況等重置永遠不會好，畫面卻顯示「將於 X 重置」，
   * 等於請用戶去等一件不會發生的事。
   *
   * 為 true 時 `options` 不含 `WAIT_RESET`。
   */
  exceedsWindowLimit: boolean;
}

export interface ILedgerAnchorView {
  anchorDate: string;
  entryCount: number;
  dayMerkleRoot: string;
  chainedRoot: string;
  txHash: string | null;
  status: TeamLedgerAnchorStatus;
}
