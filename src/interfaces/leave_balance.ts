import { LeaveLedgerEntryType, LeaveQuotaMode } from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 額度查詢的 DTO（L7 / L8 / L9）。
 *
 * 一律以「分鐘」為單位往外送，「天」只出現在授予與折現兩個端點（ADR 022 §2）。
 * 前端要顯示「還有 3.5 天」時自己除以該假別的日約當分鐘 ——
 * 那個換算依假別、依班別而不同，在 API 層折成天會丟掉它。
 */

export interface IEmployeeGrantSummary {
  leavePolicyId: string;
  leavePolicyCode: string;
  leavePolicyName: string;
  quotaMode: LeaveQuotaMode;
  remainingMinutes: number;
  /** Info: (20260817 - Julian) 30 日內即將到期的分鐘數。派生值，供畫面提示 */
  expiringSoonMinutes: number;
  /** Info: (20260817 - Julian) 最近一批的到期日；沒有任何批次時為 null */
  nextExpiresOn: string | null;
  /**
   * Info: (20260818 - Julian) 該假別最新一批的日約當分鐘，供畫面把分鐘換算成天。
   *
   * 這不違反上面那條「一律以分鐘往外送」—— 送出去的仍是分鐘，這一欄是
   * **換算依據**本身。不給它的話，畫面只能等 L17 試算才知道一天是幾分鐘，
   * 而使用者在選日期之前就想看到自己還有幾天。沒有任何批次時為 null。
   */
  dayEquivalentMinutes: number | null;
  /**
   * Info: (20260817 - Julian) 最後一次與帳本勾稽的時間。
   * null 表示「從未勾稽過」 —— 那與「勾稽過且相符」是兩件事
   * （`LeaveBalanceHealth.STALE` 與 `OK` 刻意分開的同一個理由）。
   */
  reconciledAt: string | null;
}

export interface ILedgerEntryView {
  id: string;
  entryType: LeaveLedgerEntryType;
  /** Info: (20260817 - Julian) 有號：GRANT / RESTORE 為正，CONSUME / EXPIRE / CASH_OUT 為負 */
  deltaMinutes: number;
  grantBalanceAfterMinutes: number;
  leavePolicyId: string;
  grantExpiresOn: string;
  /** Info: (20260817 - Julian) CONSUME / RESTORE 才有值 */
  workDate: string | null;
  reason: string | null;
  /** Info: (20260817 - Julian) 系統排程產生者為 null */
  actorEmployeeNo: string | null;
  actorName: string | null;
  createdAt: string;
}

/**
 * Info: (20260824 - Julian) 一組「帳本 × 員工 × 假別」——勾稽的最小單位。
 *
 * 快取的唯一鍵是 `employeeId + leavePolicyId`，但重建要知道帳本
 * （帳本層級 scoping），所以三欄一起走。
 */
export interface ILeaveBalanceScope {
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
}

/**
 * Info: (20260824 - Julian) 勾稽前的快取原值（review 阻擋 2）。
 *
 * 勾稽必須在重建**之前**先讀一次快取：只呼叫重建的話，排程會安靜地修好
 * 每一件事，而「快取與帳本分岔過幾次」正是 ADR 022 §8.2 要的那個訊號。
 * 因此這是一個獨立的讀取端，不能靠重建的回傳值代替。
 */
export interface ILeaveBalanceCacheSnapshot {
  remainingMinutes: number;
  expiringSoonMinutes: number;
  /** Info: (20260824 - Julian) null ＝ 這一列從授予那一刻起就沒有人對過帳 */
  reconciledAt: Date | null;
}

export interface ILeaveBalanceView {
  employeeId: string;
  /** Info: (20260817 - Julian) 查詢基準日，供畫面標示「截至 X 日的餘額」 */
  asOfDate: string;
  balances: IEmployeeGrantSummary[];
}
