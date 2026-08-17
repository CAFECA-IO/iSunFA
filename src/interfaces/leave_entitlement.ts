import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveDaySegment,
  LeaveGrantSource,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 額度引擎的型別。與 `interfaces/leave.ts` 分開：
 * 那裡是 API 的回應 DTO，這裡是純函數的輸入輸出 —— 兩者的變動理由不同。
 * （出勤模組把兩者放同一個檔，因為它只有一組；假勤的引擎有兩支，故按關注點切開。）
 */

/**
 * Info: (20260817 - Julian) 一天的班別長度資訊。引擎只需要這三個欄位 ——
 * 窗與核心是出勤判定的事，請假只問「這一天該工作多久、上半天到哪裡」。
 */
export interface ILeaveShiftLength {
  /** Info: (20260817 - Julian) 應工作分鐘（不含休息）。日約當分鐘的來源 */
  requiredWorkMinutes: number;
  /** Info: (20260817 - Julian) 法定／約定休息分鐘。CUSTOM 區間的上限判斷需要它 */
  breakMinutes: number;
}

// Info: (20260817 - Julian) 假別設定中與「單位換算」有關的部分。引擎不需要整張 LeavePolicy
export interface ILeaveUnitPolicy {
  unitBasis: LeaveUnitBasis;
  /** Info: (20260817 - Julian) 僅 FIXED_MINUTES 有意義；其餘必須為 null */
  minimumUnitMinutes: number | null;
  roundingMode: LeaveRoundingMode;
}

export interface ILeaveUnitInput {
  policy: ILeaveUnitPolicy;
  shift: ILeaveShiftLength;
  segment: LeaveDaySegment;
  /** Info: (20260817 - Julian) 僅 CUSTOM 有意義。當日 00:00 起算的分鐘數，跨日者 >= 1440 */
  startMinute?: number;
  endMinute?: number;
}

/**
 * Info: (20260817 - Julian) 單日請假的換算結果。
 *
 * `dayEquivalentMinutes` 與 `minutes` 一起回傳而非讓呼叫端自己取 ——
 * 它是這一天的換算依據，會被固化在 `LeaveDay` 上（計畫書 §D3）。
 * 分開取的話，遲早會有一個呼叫點用了另一天的班別。
 */
export interface ILeaveUnitResult {
  minutes: number;
  dayEquivalentMinutes: number;
  /** Info: (20260817 - Julian) 捨入前的原始分鐘。稽核「為什麼扣了一整天」時要它 */
  rawMinutes: number;
}

// Info: (20260817 - Julian) 年資級距。與 LeaveAccrualTier 同構，但不帶 id 與外鍵
export interface ILeaveAccrualTier {
  minSeniorityMonths: number;
  days: number;
  incrementDaysPerYear: number | null;
  maxDays: number | null;
}

// Info: (20260817 - Julian) 授予排程所需的假別設定
export interface ILeaveAccrualPolicy {
  accrualMethod: LeaveAccrualMethod;
  cycleBasis: LeaveCycleBasis;
  /** Info: (20260817 - Julian) FIXED_PER_CYCLE 用；SENIORITY_TIER 時為 null */
  annualDays: number | null;
  /** Info: (20260817 - Julian) SENIORITY_TIER 用，須依 minSeniorityMonths 遞增排序 */
  tiers: readonly ILeaveAccrualTier[];
  /** Info: (20260817 - Julian) §38 IV 的遞延月數；0 表不可遞延 */
  carryForwardMonths: number;
  /** Info: (20260817 - Julian) 比例給假的小數位數。方向固定為無條件進位（ADR 021 §3.2） */
  proratedRoundingScale: number;
}

export interface IGrantScheduleInput {
  /** Info: (20260817 - Julian) "YYYY-MM-DD" */
  hireDate: string;
  /** Info: (20260817 - Julian) "YYYY-MM-DD"。「現在」由呼叫端注入，引擎不呼叫 Date.now() */
  asOfDate: string;
  /** Info: (20260817 - Julian) "YYYY-MM-DD"。已離職者只授予到離職日所屬週期 */
  leaveDate?: string | null;
  policy: ILeaveAccrualPolicy;
  /**
   * Info: (20260817 - Julian) 授予當下的日約當分鐘。由呼叫端依該員工當時的班別提供 ——
   * 引擎不猜「一天是幾分鐘」，那正是 §D3 要求固化的東西。
   */
  dayEquivalentMinutes: number;
}

/**
 * Info: (20260817 - Julian) 一筆應被授予的額度批次。
 *
 * 這是**應然**不是實然：引擎算出「到 asOfDate 為止應該有哪些批次」，
 * 由呼叫端與既有的 `LeaveGrant` 比對後決定要補寫哪幾筆。
 * 因此它是冪等的 —— 同輸入同輸出，Worker 每日重跑不會多給。
 */
export interface IPlannedGrant {
  source: LeaveGrantSource;
  cycleStartDate: string;
  cycleEndDate: string;
  expiresOn: string;
  /** Info: (20260817 - Julian) 法定面額 */
  grantedDays: number;
  dayEquivalentMinutes: number;
  /** Info: (20260817 - Julian) grantedDays × dayEquivalentMinutes，無條件進位 */
  grantedMinutes: number;
  /** Info: (20260817 - Julian) 比例給假時為真。供畫面標示「本年度為按比例給假」 */
  isProrated: boolean;
}

/**
 * Info: (20260817 - Julian) 曆年制與週年制的累計比較結果（ADR 021 §3.1）。
 *
 * 引擎只算，不 throw —— `assertCycleNotDisadvantageous` 是 service 的職責，
 * 因為只有它知道該丟哪一個 `AppError`。引擎回一個可判斷的結構，
 * 呼叫端就無法「忘了檢查」（同 `LeaveRecallResolutionOutcome` 的理由）。
 */
export interface ICycleComparison {
  /**
   * Info: (20260817 - Julian) 被檢出的年資年度序號（0 為到職後第一年）。
   * -1 表示尚無任何完整的年資年度可比，或全部年度皆通過。
   */
  employmentYearIndex: number;
  anniversaryDays: number;
  calendarDays: number;
  /** Info: (20260817 - Julian) 曆年制是否不低於週年制。false 即違反不利益變更禁止 */
  calendarIsAtLeastAnniversary: boolean;
}

/**
 * Info: (20260817 - Julian) 扣減時看得到的一批額度。
 *
 * `createdAt` 為 ISO-8601 字串而非 Date：引擎只拿它排序，
 * 而字串比較對 ISO-8601 是正確的 —— 不必為了排序把時間帶進引擎。
 */
export interface IConsumableGrant {
  grantId: string;
  remainingMinutes: number;
  /** Info: (20260817 - Julian) "YYYY-MM-DD" */
  expiresOn: string;
  createdAt: string;
}

export interface IConsumptionInput {
  grants: readonly IConsumableGrant[];
  requiredMinutes: number;
}

export interface ILeaveAllocation {
  grantId: string;
  minutes: number;
  /** Info: (20260817 - Julian) 本批扣後餘額。直接對應 LeaveLedgerEntry.grantBalanceAfterMinutes */
  grantBalanceAfterMinutes: number;
}

/**
 * Info: (20260817 - Julian) 扣減結果。
 *
 * 額度不足**不丟例外**：那是使用者輸入的正常結局，不是故障。
 * 用回傳值表達，呼叫端才無法忘記處理（同 `LeaveRecallResolutionOutcome`）。
 */
export interface IConsumptionResult {
  allocations: ILeaveAllocation[];
  /** Info: (20260817 - Julian) 不足的分鐘數。0 表額度充足 */
  shortfallMinutes: number;
}
