/**
 * Info: (20260817 - Julian) 假勤模組的假別設定常數（規則引擎、seed、畫面三方的單一來源）。
 *
 * 與 `leave.ts` 的分工：`leave.ts` 承接 Demo 期間的假單與銷假徵詢；本檔承接
 * **假別設定本身**（`LeavePolicy` 與 `LeaveAccrualTier`）。兩者分開是因為
 * 假單引用假別，假別不引用假單 —— 合併會製造一個回頭的相依。
 *
 * enum 刻意不從 `@/generated` 匯入，同步由 `src/__tests__/hr_enum_mirror.test.ts` 保證。
 * 本檔的 enum 全部有 schema 對應物，新增時須登記在該測試的 `MIRRORED`，
 * 並把本檔登記進 `CONSTANT_MODULES`。
 *
 * 決策脈絡見 `documents/architecture/decisions/021_leave_policy_as_data_and_accrual_cycle.md`
 * 與 `documents/architecture/leave_and_overtime_module_plan.md`。
 */

// Info: (20260817 - Julian) 給假方式，對齊 Prisma enum LeaveAccrualMethod
export enum LeaveAccrualMethod {
  // Info: (20260817 - Julian) 不給額度（公傷病假、產假：有多少給多少，由事件決定）
  NONE = "NONE",
  // Info: (20260817 - Julian) 依年資級距表給假（特休，勞基法 §38 I）
  SENIORITY_TIER = "SENIORITY_TIER",
  // Info: (20260817 - Julian) 每週期固定日數（事假 14 日、家庭照顧假 7 日、生理假每月 1 日）
  FIXED_PER_CYCLE = "FIXED_PER_CYCLE",
  // Info: (20260817 - Julian) 逐次事件給假（婚假、喪假：每發生一次給一次）
  PER_EVENT = "PER_EVENT",
}

/**
 * Info: (20260817 - Julian) 給假週期基準，對齊 Prisma enum LeaveCycleBasis。
 *
 * ToDo: (20260817 - Julian) 週年制／曆年制的授權依據為勞動基準法施行細則 §24，條號待法務複核。
 */
export enum LeaveCycleBasis {
  // Info: (20260817 - Julian) 週年制：週期起點為到職日
  HIRE_ANNIVERSARY = "HIRE_ANNIVERSARY",
  // Info: (20260817 - Julian) 曆年制：週期起點為 1/1，首年與跨級距年須比例給假
  CALENDAR_YEAR = "CALENDAR_YEAR",
  /**
   * Info: (20260817 - Julian) 曆月制：週期起點為每月 1 日。
   *
   * 生理假是「每月得請一日」（性平法 §14），年度週期表達不了它 ——
   * 用年度額度 12 日會讓一個人在一月請完全年份，那不是這條規定的意思。
   */
  CALENDAR_MONTH = "CALENDAR_MONTH",
}

/**
 * Info: (20260817 - Julian) 最小請假單位的基準，對齊 Prisma enum LeaveUnitBasis。
 *
 * **「半天」不是 240 分鐘。** 它是「該日應工作分鐘的一半」，而
 * `ShiftPattern.requiredWorkMinutes` 因班別而異。寫成固定分鐘等於宣稱
 * 所有人的一天都是 8 小時 —— 同 `ShiftPattern` 拒絕 `shiftType` 的理由。
 */
export enum LeaveUnitBasis {
  FIXED_MINUTES = "FIXED_MINUTES",
  HALF_WORKDAY = "HALF_WORKDAY",
  FULL_WORKDAY = "FULL_WORKDAY",
}

/**
 * Info: (20260817 - Julian) 請假時數的捨入方向，對齊 Prisma enum LeaveRoundingMode。
 *
 * 預設 `UP`（不足一單位以一單位計）是**對勞工不利**的預設，必須載明於工作規則。
 * 刻意沒有 `DOWN`：往下捨的結果會被 `assertCycleNotDisadvantageous` 擋掉並 throw，
 * 提供一個必然觸發例外的設定值，只會讓租戶以為那是可用的選項。
 */
export enum LeaveRoundingMode {
  UP = "UP",
  NEAREST = "NEAREST",
}

// Info: (20260817 - Julian) 是否受額度限制，對齊 Prisma enum LeaveQuotaMode
export enum LeaveQuotaMode {
  QUOTA = "QUOTA",
  UNLIMITED = "UNLIMITED",
}

// Info: (20260817 - Julian) 證明文件要求，對齊 Prisma enum LeaveProofRequirement
export enum LeaveProofRequirement {
  NONE = "NONE",
  OPTIONAL = "OPTIONAL",
  REQUIRED_OVER_THRESHOLD = "REQUIRED_OVER_THRESHOLD",
}

// Info: (20260817 - Julian) 額度來源，對齊 Prisma enum LeaveGrantSource
export enum LeaveGrantSource {
  SENIORITY_ACCRUAL = "SENIORITY_ACCRUAL",
  CARRY_FORWARD = "CARRY_FORWARD",
  OVERTIME_CONVERSION = "OVERTIME_CONVERSION",
  MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT",
}

/**
 * Info: (20260817 - Julian) 帳本異動類型，對齊 Prisma enum LeaveLedgerEntryType。
 *
 * 撤銷是寫反向的 `RESTORE` / `ADJUST`，**不是刪列**：刪掉的話
 * 「他曾經被扣過、後來退回」這個事實就消失了。
 */
export enum LeaveLedgerEntryType {
  GRANT = "GRANT",
  CONSUME = "CONSUME",
  RESTORE = "RESTORE",
  EXPIRE = "EXPIRE",
  CASH_OUT = "CASH_OUT",
  ADJUST = "ADJUST",
}

// Info: (20260817 - Julian) 簽核節點型別，對齊 Prisma enum LeaveApprovalNodeKind
export enum LeaveApprovalNodeKind {
  DIRECT_MANAGER = "DIRECT_MANAGER",
  DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER",
  HR = "HR",
  SPECIFIC_EMPLOYEE = "SPECIFIC_EMPLOYEE",
}

// Info: (20260817 - Julian) 單一簽核節點狀態，對齊 Prisma enum LeaveApprovalStepStatus
export enum LeaveApprovalStepStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  // Info: (20260817 - Julian) 相鄰去重後被併掉的節點（直屬主管恰好就是部門經理）
  SKIPPED = "SKIPPED",
}

/**
 * Info: (20260817 - Julian) 一天請假的時段型態，對齊 Prisma enum LeaveDaySegment。
 *
 * `MORNING` / `AFTERNOON` 的分界由該日班別的 `coreStartMinute` 與
 * `requiredWorkMinutes` 推出，**不是固定的 12:00** —— 夜班的「上半天」
 * 在日曆上是前一天晚上。
 */
export enum LeaveDaySegment {
  FULL = "FULL",
  MORNING = "MORNING",
  AFTERNOON = "AFTERNOON",
  CUSTOM = "CUSTOM",
}

// Info: (20260817 - Julian) 折現事件成因，對齊 Prisma enum LeaveCashOutReason
export enum LeaveCashOutReason {
  OVERTIME_PAYMENT = "OVERTIME_PAYMENT",
  ANNUAL_YEAR_END = "ANNUAL_YEAR_END",
  ANNUAL_CARRY_FORWARD_END = "ANNUAL_CARRY_FORWARD_END",
  COMPENSATORY_EXPIRED = "COMPENSATORY_EXPIRED",
  TERMINATION_SETTLEMENT = "TERMINATION_SETTLEMENT",
}

/**
 * Info: (20260817 - Julian) 併休超限的處置，對齊 Prisma enum LeaveConcurrencyAction。
 *
 * **對特休只能是 `WARN`。** 勞基法 §38 II 明定期日由勞工排定，雇主只能「協商調整」；
 * 在送出端硬擋等於用技術手段行使一個法律上沒有的否決權。
 */
export enum LeaveConcurrencyAction {
  WARN = "WARN",
  BLOCK = "BLOCK",
}

/**
 * Info: (20260817 - Julian) 額度帳本的健康度。**沒有 schema 對應物**，是勾稽的輸出，
 * 登記於 `hr_enum_mirror.test.ts` 的 `UI_ONLY`。
 *
 * `STALE`（從未勾稽過）與 `MISMATCH`（勾稽過且不符）刻意分開 ——
 * 不知道不等於沒問題，語意同 `PresenceStatus.STALE`。
 */
export enum LeaveBalanceHealth {
  OK = "OK",
  STALE = "STALE",
  MISMATCH = "MISMATCH",
}

/**
 * Info: (20260817 - Julian) 內建假別的代號。
 *
 * **這些值嚴禁被規則引擎以 if/switch 比對**（ADR 021 §2.1）——
 * 它們只供 seed 建立、i18n 對照與跨帳本統計。租戶自訂的假別有自己的 code，
 * 一旦引擎開始讀 code，那些假別就會靜默掉進一段沒有為它們寫過的分支。
 * 由 `leave_policy_no_code_branching.test.ts` 釘住。
 */
export const LEAVE_POLICY_CODE = {
  ANNUAL: "ANNUAL",
  PERSONAL: "PERSONAL",
  SICK: "SICK",
  OCCUPATIONAL_INJURY: "OCCUPATIONAL_INJURY",
  OFFICIAL: "OFFICIAL",
  MARRIAGE: "MARRIAGE",
  BEREAVEMENT: "BEREAVEMENT",
  MENSTRUAL: "MENSTRUAL",
  MATERNITY: "MATERNITY",
  PRENATAL_CHECKUP: "PRENATAL_CHECKUP",
  PATERNITY: "PATERNITY",
  FAMILY_CARE: "FAMILY_CARE",
  COMPENSATORY: "COMPENSATORY",
} as const;

export type LeavePolicyCode =
  (typeof LEAVE_POLICY_CODE)[keyof typeof LEAVE_POLICY_CODE];

// Info: (20260817 - Julian) 內建假別的 i18n key。租戶自訂假別查無對照時回退顯示 LeavePolicy.name
export const LEAVE_POLICY_I18N_KEY: Record<LeavePolicyCode, string> = {
  [LEAVE_POLICY_CODE.ANNUAL]: "hr_management.leave.policy_annual",
  [LEAVE_POLICY_CODE.PERSONAL]: "hr_management.leave.policy_personal",
  [LEAVE_POLICY_CODE.SICK]: "hr_management.leave.policy_sick",
  [LEAVE_POLICY_CODE.OCCUPATIONAL_INJURY]:
    "hr_management.leave.policy_occupational_injury",
  [LEAVE_POLICY_CODE.OFFICIAL]: "hr_management.leave.policy_official",
  [LEAVE_POLICY_CODE.MARRIAGE]: "hr_management.leave.policy_marriage",
  [LEAVE_POLICY_CODE.BEREAVEMENT]: "hr_management.leave.policy_bereavement",
  [LEAVE_POLICY_CODE.MENSTRUAL]: "hr_management.leave.policy_menstrual",
  [LEAVE_POLICY_CODE.MATERNITY]: "hr_management.leave.policy_maternity",
  [LEAVE_POLICY_CODE.PRENATAL_CHECKUP]:
    "hr_management.leave.policy_prenatal_checkup",
  [LEAVE_POLICY_CODE.PATERNITY]: "hr_management.leave.policy_paternity",
  [LEAVE_POLICY_CODE.FAMILY_CARE]: "hr_management.leave.policy_family_care",
  [LEAVE_POLICY_CODE.COMPENSATORY]: "hr_management.leave.policy_compensatory",
};

/**
 * Info: (20260817 - Julian) 特別休假的年資級距（勞動基準法 §38 I）。
 *
 * 查證日期 2026-08-17，出處：勞動部「特別休假日數、排定原則及遞延」。
 * 這是 `LeaveAccrualTier` 的 seed 內容，**不是程式碼** —— 它會修法，
 * 2016 年那次修法改的就是這張表。
 *
 * ToDo: (20260817 - Julian) §38 I ⑥「十年以上者，每一年加給一日」自滿 10 年當年
 * 或次年起算，實務見解不一，差一日。此處暫以滿 10 年當年 16 日落地，待法務複核。
 */
export interface ILeaveAccrualTierSeed {
  /** Info: (20260817 - Julian) 年資下界（含），以月為單位。「六個月以上一年未滿」=> 6 */
  readonly minSeniorityMonths: number;
  readonly days: number;
  /** Info: (20260817 - Julian) 超過本級距後每滿一年再加的日數（§38 I ⑥） */
  readonly incrementDaysPerYear: number | null;
  /** Info: (20260817 - Julian) 加給的上限（§38 I ⑥ 的「加至三十日為止」） */
  readonly maxDays: number | null;
}

export const ANNUAL_LEAVE_TIER_SEED: readonly ILeaveAccrualTierSeed[] = [
  { minSeniorityMonths: 6, days: 3, incrementDaysPerYear: null, maxDays: null },
  { minSeniorityMonths: 12, days: 7, incrementDaysPerYear: null, maxDays: null },
  {
    minSeniorityMonths: 24,
    days: 10,
    incrementDaysPerYear: null,
    maxDays: null,
  },
  {
    minSeniorityMonths: 36,
    days: 14,
    incrementDaysPerYear: null,
    maxDays: null,
  },
  {
    minSeniorityMonths: 60,
    days: 15,
    incrementDaysPerYear: null,
    maxDays: null,
  },
  { minSeniorityMonths: 120, days: 16, incrementDaysPerYear: 1, maxDays: 30 },
];

/**
 * Info: (20260817 - Julian) 內建假別的 seed 規格。
 *
 * ## 只放查證過的數字
 *
 * 每一列的 `legalBasis` 都對應 2026-08-17 查證過的來源（勞動部勞動法令查詢系統
 * 與「勞動基準法暨性別平等工作法相關假別請假及工資權益」）。
 * 未查證的欄位一律留 null 並附 ToDo —— 不猜一個數字填進去。
 *
 * ## 現行模型表達不了的四種假別
 *
 * 喪假（依親等 8/6/3 日）、產假（工資依年資滿六個月與否而異）、
 * 流產假（依妊娠週數 4 星期／1 星期／5 日）、普通傷病假（住院與未住院上限不同、
 * 且二年內合計另有上限）—— 這四種的日數或工資取決於**事件屬性**，
 * 而 `LeavePolicy` 目前只有單一 `annualDays` 與單一 `paidRatio`。
 *
 * 暫行處置：`accrualMethod = PER_EVENT` 且 `annualDays = null`，
 * 實際日數由 HR 於授予時輸入並記於 `LeaveGrant.reason`。
 * ToDo: (20260817 - Julian) 這是一個已知的模型缺口（計畫書 §17 缺口 8）：
 * 正解是把 `LeaveAccrualTier` 從「年資月數」推廣成通用的分級維度。
 * 在推廣之前不要為這四種假別硬填一個數字 —— 填 8 日的喪假會讓
 * 祖父母喪假多給兩日，那不是保守而是錯誤。
 */
export interface ILeavePolicySeed {
  readonly code: LeavePolicyCode;
  readonly accrualMethod: LeaveAccrualMethod;
  readonly cycleBasis: LeaveCycleBasis;
  readonly quotaMode: LeaveQuotaMode;
  readonly annualDays: number | null;
  readonly unitBasis: LeaveUnitBasis;
  readonly minimumUnitMinutes: number | null;
  readonly carryForwardMonths: number;
  readonly cashOutOnExpiry: boolean;
  /** Info: (20260817 - Julian) 工資照給 = 1、折半發給 = 0.5、不給工資 = 0；條件式給付者為 null */
  readonly paidRatio: number | null;
  readonly proofRequirement: LeaveProofRequirement;
  readonly employerMayReject: boolean;
  readonly recallable: boolean;
  readonly mergesIntoCode: LeavePolicyCode | null;
  readonly legalBasis: string;
  readonly tiers: readonly ILeaveAccrualTierSeed[] | null;
}

export const DEFAULT_LEAVE_POLICY_SEED: readonly ILeavePolicySeed[] = [
  {
    // Info: (20260817 - Julian) 特別休假。期日由勞工排定（§38 II），故 employerMayReject = false
    code: LEAVE_POLICY_CODE.ANNUAL,
    accrualMethod: LeaveAccrualMethod.SENIORITY_TIER,
    cycleBasis: LeaveCycleBasis.HIRE_ANNIVERSARY,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: null,
    unitBasis: LeaveUnitBasis.FIXED_MINUTES,
    minimumUnitMinutes: 60,
    // Info: (20260817 - Julian) §38 IV：經勞雇雙方協商同意得遞延一年
    carryForwardMonths: 12,
    cashOutOnExpiry: true,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.NONE,
    employerMayReject: false,
    // Info: (20260817 - Julian) §38 III：雇主基於企業經營上急迫需求得與勞工協商調整
    recallable: true,
    mergesIntoCode: null,
    legalBasis: "勞動基準法 §38",
    tiers: ANNUAL_LEAVE_TIER_SEED,
  },
  {
    // Info: (20260817 - Julian) 事假：一年內不超過 14 日，不給工資（勞工請假規則 §7）
    code: LEAVE_POLICY_CODE.PERSONAL,
    accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 14,
    unitBasis: LeaveUnitBasis.FIXED_MINUTES,
    minimumUnitMinutes: 60,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 0,
    proofRequirement: LeaveProofRequirement.NONE,
    employerMayReject: true,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "勞工請假規則 §7",
    tiers: null,
  },
  {
    /**
     * Info: (20260817 - Julian) 普通傷病假。未住院一年內 30 日、工資折半發給
     * （勞工請假規則 §4）。
     *
     * ToDo: (20260817 - Julian) 住院者二年內不得超過一年、且未住院與住院二年內
     * 合計上限，現行模型表達不了（見本檔上方「四種假別」說明）。
     * ToDo: (20260817 - Julian) 自民國 115 年 1 月 1 日起：一年內請普通傷病假
     * 未超過 10 日者，雇主不得因此為不利處分；全勤獎金應按日數依比例扣發。
     * 相關輸出見計畫書 §6.6。
     */
    code: LEAVE_POLICY_CODE.SICK,
    accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 30,
    unitBasis: LeaveUnitBasis.FIXED_MINUTES,
    minimumUnitMinutes: 60,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 0.5,
    proofRequirement: LeaveProofRequirement.REQUIRED_OVER_THRESHOLD,
    employerMayReject: true,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "勞工請假規則 §4",
    tiers: null,
  },
  {
    // Info: (20260817 - Julian) 公傷病假：治療休養期間，工資照給（勞工請假規則 §6）。期間由職災認定決定，系統只記載不判定
    code: LEAVE_POLICY_CODE.OCCUPATIONAL_INJURY,
    accrualMethod: LeaveAccrualMethod.NONE,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.UNLIMITED,
    annualDays: null,
    unitBasis: LeaveUnitBasis.FULL_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.REQUIRED_OVER_THRESHOLD,
    employerMayReject: false,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "勞工請假規則 §6",
    tiers: null,
  },
  {
    // Info: (20260817 - Julian) 公假（勞工請假規則 §8）。日數依事由，無年度上限
    code: LEAVE_POLICY_CODE.OFFICIAL,
    accrualMethod: LeaveAccrualMethod.NONE,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.UNLIMITED,
    annualDays: null,
    unitBasis: LeaveUnitBasis.FIXED_MINUTES,
    minimumUnitMinutes: 60,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.OPTIONAL,
    employerMayReject: true,
    recallable: false,
    mergesIntoCode: null,
    // Info: (20260817 - Julian) ToDo: (20260817 - Julian) 條號取自勞動部彙整表標註，未逐條回原文核對
    legalBasis: "勞工請假規則 §8",
    tiers: null,
  },
  {
    // Info: (20260817 - Julian) 婚假 8 日、工資照給（勞工請假規則 §2）
    code: LEAVE_POLICY_CODE.MARRIAGE,
    accrualMethod: LeaveAccrualMethod.PER_EVENT,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 8,
    unitBasis: LeaveUnitBasis.HALF_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.REQUIRED_OVER_THRESHOLD,
    employerMayReject: true,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "勞工請假規則 §2",
    tiers: null,
  },
  {
    /**
     * Info: (20260817 - Julian) 喪假：父母等 8 日、祖父母等 6 日、曾祖父母等 3 日，
     * 工資照給（勞工請假規則 §3）。
     *
     * `annualDays` 刻意為 null —— 日數依親等而定，現行模型表達不了。
     * 填 8 會讓祖父母喪假多給兩日，那不是保守而是錯誤。
     */
    code: LEAVE_POLICY_CODE.BEREAVEMENT,
    accrualMethod: LeaveAccrualMethod.PER_EVENT,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: null,
    unitBasis: LeaveUnitBasis.HALF_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.REQUIRED_OVER_THRESHOLD,
    employerMayReject: true,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "勞工請假規則 §3",
    tiers: null,
  },
  {
    /**
     * Info: (20260817 - Julian) 生理假：每月一日，薪資減半（性別平等工作法 §14）。
     * 週期為曆月 —— 用年度額度 12 日會讓一個人在一月請完全年份。
     *
     * ToDo: (20260817 - Julian) 「全年未逾三日不併入病假計算，其餘併入病假」
     * 的條號與計算細節待法務複核，故 `mergesIntoCode` 暫留 null，
     * UI 顯示「本假別的併計規則尚未設定」。**不猜一個數字填進去。**
     *
     * Info: (20260817 - Julian) 性平法明定不得因請生理假而為不利對待，
     * 因此本假別在所有統計端點預設排除，見計畫書 §12.3。
     */
    code: LEAVE_POLICY_CODE.MENSTRUAL,
    accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
    cycleBasis: LeaveCycleBasis.CALENDAR_MONTH,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 1,
    unitBasis: LeaveUnitBasis.HALF_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 0.5,
    proofRequirement: LeaveProofRequirement.NONE,
    employerMayReject: false,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "性別平等工作法 §14",
    tiers: null,
  },
  {
    /**
     * Info: (20260817 - Julian) 產假 8 星期（勞動基準法 §50、性別平等工作法 §15）。
     *
     * `paidRatio` 為 null：受僱六個月以上工資照給、未滿六個月減半發給 ——
     * 條件式給付，現行模型的單一比例表達不了。
     * ToDo: (20260817 - Julian) 同本檔上方「四種假別」的模型缺口。
     * ToDo: (20260817 - Julian) 流產假（4 星期／1 星期／5 日，依妊娠週數）
     * 與安胎休養（二年內不超過一年）尚未建為獨立假別，同一個缺口。
     */
    code: LEAVE_POLICY_CODE.MATERNITY,
    accrualMethod: LeaveAccrualMethod.PER_EVENT,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 56,
    unitBasis: LeaveUnitBasis.FULL_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: null,
    proofRequirement: LeaveProofRequirement.REQUIRED_OVER_THRESHOLD,
    employerMayReject: false,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "勞動基準法 §50、性別平等工作法 §15",
    tiers: null,
  },
  {
    // Info: (20260817 - Julian) 產檢假 7 日，薪資照給（性別平等工作法 §15）
    code: LEAVE_POLICY_CODE.PRENATAL_CHECKUP,
    accrualMethod: LeaveAccrualMethod.PER_EVENT,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 7,
    unitBasis: LeaveUnitBasis.HALF_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.OPTIONAL,
    employerMayReject: false,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "性別平等工作法 §15",
    tiers: null,
  },
  {
    // Info: (20260817 - Julian) 陪產檢及陪產假 7 日，薪資照給；陪產應於配偶分娩當日及前後合計 15 日內請假
    code: LEAVE_POLICY_CODE.PATERNITY,
    accrualMethod: LeaveAccrualMethod.PER_EVENT,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 7,
    unitBasis: LeaveUnitBasis.HALF_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.OPTIONAL,
    employerMayReject: false,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "性別平等工作法 §15",
    tiers: null,
  },
  {
    // Info: (20260817 - Julian) 家庭照顧假 7 日，**併入事假計算**，不給薪；雇主不得視為缺勤而影響全勤獎金（性平法 §20）
    code: LEAVE_POLICY_CODE.FAMILY_CARE,
    accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: 7,
    unitBasis: LeaveUnitBasis.HALF_WORKDAY,
    minimumUnitMinutes: null,
    carryForwardMonths: 0,
    cashOutOnExpiry: false,
    paidRatio: 0,
    proofRequirement: LeaveProofRequirement.NONE,
    employerMayReject: true,
    recallable: false,
    mergesIntoCode: LEAVE_POLICY_CODE.PERSONAL,
    legalBasis: "性別平等工作法 §20",
    tiers: null,
  },
  {
    /**
     * Info: (20260817 - Julian) 補休（勞動基準法 §32-1）。
     *
     * `accrualMethod = NONE`：額度不由年資或週期產生，只來自加班換算 ——
     * `LeaveGrant.source = OVERTIME_CONVERSION`，1:1 不乘倍率。
     * `cashOutOnExpiry = true`：期限屆滿或契約終止未補休者，
     * 依延長工作時間或休息日工作當日之工資計算標準發給工資。
     *
     * ToDo: (20260817 - Julian) 補休期限「由勞雇雙方協商」，法無明文上限。
     * `carryForwardMonths` 此處填 0 代表「不另遞延」，實際期限由授予當下的
     * `LeaveGrant.expiresOn` 依帳本設定決定 —— 該設定尚未建欄位，里程碑 4 補。
     */
    code: LEAVE_POLICY_CODE.COMPENSATORY,
    accrualMethod: LeaveAccrualMethod.NONE,
    cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
    quotaMode: LeaveQuotaMode.QUOTA,
    annualDays: null,
    unitBasis: LeaveUnitBasis.FIXED_MINUTES,
    minimumUnitMinutes: 30,
    carryForwardMonths: 0,
    cashOutOnExpiry: true,
    paidRatio: 1,
    proofRequirement: LeaveProofRequirement.NONE,
    employerMayReject: true,
    recallable: false,
    mergesIntoCode: null,
    legalBasis: "勞動基準法 §32-1",
    tiers: null,
  },
];

/**
 * Info: (20260817 - Julian) 「即將到期」的判定天數。供 `LeaveBalance.expiringSoonMinutes` 與畫面提示。
 * 派生值的參數，不是法定門檻。
 */
export const LEAVE_EXPIRING_SOON_DAYS = 30;

// Info: (20260817 - Julian) 請假事由長度上限。與 LEAVE_RECALL_REASON_MAX_LENGTH 對齊
export const LEAVE_REASON_MAX_LENGTH = 200;

/**
 * Info: (20260817 - Julian) 簽核鏈規則的天數邊界語意：左閉右開。
 *
 * 需求原文「3 天內直屬主管、3 天以上簽至部門經理或 HR」在 3.0 天處重疊，
 * 本專案定為 `[0, 3)` 與 `[3, ∞)`，即**恰好 3 天走長假規則**。
 * 這種邊界不能留給實作者猜，故寫成常數而非散落在比較運算子裡。
 */
export const LEAVE_APPROVAL_RANGE_IS_RIGHT_OPEN = true;

/**
 * Info: (20260817 - Julian) 額度異動的冪等鍵格式。
 *
 * 授予 Worker 每日重跑時靠它擋重複入帳（手法同 ADR 010 的決定性雜湊）。
 * 集中於此而非散寫在 service：格式一旦不一致，冪等就靜默失效，
 * 而失效的症狀是「額度每天多一份」——會被當成計算錯誤而查錯方向。
 */
export const buildLeaveGrantIdempotencyKey = (params: {
  employeeId: string;
  leavePolicyId: string;
  cycleStartDate: string;
}): string =>
  `grant:${params.employeeId}:${params.leavePolicyId}:${params.cycleStartDate}`;
