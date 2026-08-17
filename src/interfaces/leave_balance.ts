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

export interface ILeaveBalanceView {
  employeeId: string;
  /** Info: (20260817 - Julian) 查詢基準日，供畫面標示「截至 X 日的餘額」 */
  asOfDate: string;
  balances: IEmployeeGrantSummary[];
}
