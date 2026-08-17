import { WorkDayType } from "@/constants/attendance";
import {
  LeaveApprovalNodeKind,
  LeaveApprovalStepStatus,
  LeaveConcurrencyAction,
  LeaveDaySegment,
  LeaveQuotaMode,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";
import { LeaveRequestStatus } from "@/constants/leave";
import {
  IConsumableGrant,
  ILeaveShiftLength,
} from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) 假單送出與簽核的型別。
 *
 * 簽核鏈的展開結果是**快照**：解析當下的工號與姓名一併寫死，組織異動不改寫歷史
 * （ADR 023 §2）。因此這裡的 `IResolvedApprovalStep` 不只有 employeeId。
 */

/** Info: (20260817 - Julian) 簽核者在快照裡的樣子。三個欄位都是解析當下的值，不隨組織異動 */
export interface IApproverIdentity {
  employeeId: string;
  employeeNo: string;
  name: string;
  jobTitle: string | null;
}

// Info: (20260817 - Julian) 規則表的一條，含其節點序列
export interface IApprovalRuleWithSteps {
  /** Info: (20260817 - Julian) null 表通則；有值則僅適用該假別 */
  leavePolicyId: string | null;
  minDays: number;
  /** Info: (20260817 - Julian) 不含。null 表無上界 */
  maxDays: number | null;
  steps: readonly {
    order: number;
    nodeKind: LeaveApprovalNodeKind;
    specificEmployeeId: string | null;
  }[];
}

/**
 * Info: (20260817 - Julian) 展開簽核鏈所需的組織快照。
 *
 * `departmentManagerId` 已經是「沿部門樹向上找到的第一個有主管的節點」的結果 ——
 * 樹的走訪需要查 DB，屬 repository；純函數只認結果。
 */
export interface IApprovalOrgSnapshot {
  applicantEmployeeId: string;
  directManagerId: string | null;
  departmentManagerId: string | null;
  /** Info: (20260817 - Julian) 具 HR 角色者。任一人簽核即通過，故為清單 */
  hrEmployeeIds: readonly string[];
  /** Info: (20260817 - Julian) employeeId → 身分快照。缺項即視為該人不存在 */
  directory: Readonly<Record<string, IApproverIdentity>>;
}

export interface IApprovalChainInput {
  leavePolicyId: string;
  /** Info: (20260817 - Julian) 本張假單的總日數，用於命中規則區間（左閉右開） */
  totalDays: number;
  rules: readonly IApprovalRuleWithSteps[];
  org: IApprovalOrgSnapshot;
}

export interface IResolvedApprovalStep {
  order: number;
  nodeKind: LeaveApprovalNodeKind;
  approver: IApproverIdentity;
  /**
   * Info: (20260817 - Julian) 相鄰去重時被併掉的節點型別（直屬主管恰好就是部門經理）。
   * 讓「為什麼這張單只有兩關」查得到，而不是看起來像少簽了一關。
   */
  mergedFromKinds: LeaveApprovalNodeKind[];
  /** Info: (20260817 - Julian) 節點解析出申請人本人時自動上升的理由。null 表未上升 */
  escalatedReason: string | null;
}

/**
 * Info: (20260817 - Julian) 展不開的成因。
 *
 * 分得這麼細是因為**錯誤訊息必須指出缺什麼**：解法在 HR 手上不在員工手上，
 * 一句「簽核流程錯誤」會讓員工反覆重送（ADR 023 §3）。
 */
export enum LeaveApprovalUnresolvedReason {
  // Info: (20260817 - Julian) 沒有任何規則涵蓋這個天數 —— 規則表有洞，assertRuleRangesDisjoint 應已擋在寫入端
  NO_MATCHING_RULE = "NO_MATCHING_RULE",
  // Info: (20260817 - Julian) 命中的規則沒有任何節點
  EMPTY_RULE_STEPS = "EMPTY_RULE_STEPS",
  NO_DIRECT_MANAGER = "NO_DIRECT_MANAGER",
  NO_DEPARTMENT_MANAGER = "NO_DEPARTMENT_MANAGER",
  NO_HR = "NO_HR",
  // Info: (20260817 - Julian) 申請人自己就是唯一的 HR，且鏈上沒有其他人可簽
  NO_OTHER_HR = "NO_OTHER_HR",
  // Info: (20260817 - Julian) 指名的簽核者已不在職或不在本帳本
  SPECIFIC_EMPLOYEE_MISSING = "SPECIFIC_EMPLOYEE_MISSING",
}

/**
 * Info: (20260817 - Julian) 展開結果採可辨識聯集。
 *
 * 不丟例外：純函數丟例外會讓呼叫端只能用 try/catch 分辨成因，
 * 而成因決定要顯示哪一句話給誰看。回傳結構，呼叫端就無法忘記處理失敗那一半。
 */
export type IApprovalChainResolution =
  | { ok: true; steps: IResolvedApprovalStep[] }
  | {
      ok: false;
      reason: LeaveApprovalUnresolvedReason;
      detail: string;
    };

// Info: (20260817 - Julian) ===== 送出與試算 =====

export interface ILeaveDayInput {
  /** Info: (20260817 - Julian) "YYYY-MM-DD" */
  workDate: string;
  segment: LeaveDaySegment;
  startMinute?: number;
  endMinute?: number;
}

export interface ILeaveRequestInput {
  leavePolicyId: string;
  reason: string;
  days: readonly ILeaveDayInput[];
}

/** Info: (20260817 - Julian) 逐日的換算結果，會被固化在 `LeaveDay` 上 */
export interface ILeaveDayPlan {
  workDate: string;
  segment: LeaveDaySegment;
  startMinute: number | null;
  endMinute: number | null;
  minutes: number;
  dayEquivalentMinutes: number;
}

/**
 * Info: (20260817 - Julian) 試算結果（L17）。**純計算、不寫入、不預扣。**
 *
 * 這支端點的存在理由：若送出前看不到「這樣請會發生什麼」，員工只能靠試錯，
 * 而每一次試錯都是一張要有人去駁回的單。
 */
export interface ILeaveRequestPreview {
  days: ILeaveDayPlan[];
  totalMinutes: number;
  totalDays: number;
  /** Info: (20260817 - Julian) 不受額度限制的假別為 null */
  remainingMinutesBefore: number | null;
  remainingMinutesAfter: number | null;
  shortfallMinutes: number;
  /** Info: (20260817 - Julian) 展不開時為空陣列，成因見 unresolvedReason */
  approvalSteps: IResolvedApprovalStep[];
  unresolvedReason: LeaveApprovalUnresolvedReason | null;
  /** Info: (20260817 - Julian) 併休超限的日期。特休只警示不擋（計畫書 §D14） */
  concurrencyWarnings: {
    workDate: string;
    observedCount: number;
    limitValue: number;
    blocking: boolean;
  }[];
}

// Info: (20260817 - Julian) ===== 送出、簽核與扣額度的存取層契約 =====

/** Info: (20260817 - Julian) 引擎與 service 需要的假別設定切片，不是整張 LeavePolicy */
export interface ILeavePolicySnapshot {
  id: string;
  code: string;
  quotaMode: LeaveQuotaMode;
  unitBasis: LeaveUnitBasis;
  minimumUnitMinutes: number | null;
  roundingMode: LeaveRoundingMode;
  /** Info: (20260817 - Julian) 決定併休超限能不能硬擋（計畫書 §D14） */
  employerMayReject: boolean;
}

/** Info: (20260817 - Julian) 某一天的排班在請假眼中的樣子 */
export interface ILeaveDaySchedule {
  dayType: WorkDayType;
  /** Info: (20260817 - Julian) 非上班日為 null */
  shift: ILeaveShiftLength | null;
}

export interface ILeaveConcurrencyStatus {
  workDate: string;
  observedCount: number;
  limitValue: number;
  action: LeaveConcurrencyAction;
}

/**
 * Info: (20260817 - Julian) 送出與簽核所需的**唯讀**查詢。
 *
 * 與 `ILeaveRequestRepository`（寫入）分開：讀的部分在測試裡要造很多種組合，
 * 寫的部分只需要驗「有沒有照著算好的結果去寫」。混在一個介面裡，
 * 每個測試都得把整組寫入方法也假造一遍。
 */
export interface ILeaveRequestContext {
  findActivePolicy(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<ILeavePolicySnapshot | null>;
  findApprovalRules(params: {
    accountBookId: string;
  }): Promise<IApprovalRuleWithSteps[]>;
  buildOrgSnapshot(params: {
    accountBookId: string;
    applicantEmployeeId: string;
  }): Promise<IApprovalOrgSnapshot>;
  findSchedules(params: {
    accountBookId: string;
    employeeId: string;
    workDates: readonly string[];
  }): Promise<Readonly<Record<string, ILeaveDaySchedule | undefined>>>;
  findConsumableGrants(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    asOfDate: string;
  }): Promise<IConsumableGrant[]>;
  findConcurrencyStatus(params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    workDates: readonly string[];
  }): Promise<ILeaveConcurrencyStatus[]>;
}

/** Info: (20260817 - Julian) 單據上的一個簽核節點（讀出來的樣子） */
export interface ILeaveApprovalStepRecord {
  id: string;
  order: number;
  nodeKind: LeaveApprovalNodeKind;
  approverEmployeeId: string | null;
  approverEmployeeNo: string;
  approverName: string;
  status: LeaveApprovalStepStatus;
  isPending: boolean;
}

export interface ILeaveRequestRecord {
  id: string;
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
  status: LeaveRequestStatus;
  totalMinutes: number;
  totalDays: number;
  days: readonly { id: string; workDate: string; minutes: number }[];
  steps: readonly ILeaveApprovalStepRecord[];
}

/**
 * Info: (20260817 - Julian) 最後一關通過的結局。
 *
 * `BALANCE_RACE` 不是故障：兩張單同時送出、都通過送出時的檢查、先後核准，
 * 第二張在核准時才失敗（ADR 023 §6.3）。用回傳值表達而非丟例外，
 * 呼叫端才無法忘記處理。
 */
export enum LeaveApprovalOutcome {
  ADVANCED = "ADVANCED",
  COMPLETED = "COMPLETED",
  BALANCE_RACE = "BALANCE_RACE",
  ALREADY_REVIEWED = "ALREADY_REVIEWED",
}

/**
 * Info: (20260817 - Julian) 寫入端。三個方法都是 unit-of-work ——
 * 少任一步就會留下永久說謊的中間狀態，而原子性只有 DB 給得起
 * （同 `leave.repo.ts` 的 `resolveRecall`，理由見 attendance_demo_plan.md §7.4）。
 */
export interface ILeaveRequestRepository {
  findById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<ILeaveRequestRecord | null>;
  findSummaryById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<ILeaveRequestSummary | null>;
  /**
   * Info: (20260817 - Julian) 依員工列出假單。可見範圍由 service 決定，
   * repository 只照著 `employeeId` 查 —— 把授權判斷放進查詢條件，
   * 就會有一天有人寫出一個「忘了帶那個條件」的新查詢。
   */
  listByEmployee(params: {
    accountBookId: string;
    employeeId: string;
    from?: string;
    to?: string;
  }): Promise<ILeaveRequestSummary[]>;
  /** Info: (20260817 - Julian) 待我簽核：`pendingKey` 非 null 且簽核者是我 */
  listPendingForApprover(params: {
    accountBookId: string;
    approverEmployeeId: string;
  }): Promise<ILeaveRequestSummary[]>;
  createWithChain(params: {
    /**
     * Info: (20260817 - Julian) 由 service 產生，不是 `@default(uuid())`。
     * `reasonCipher` 的 AAD 綁定 `LeaveRequest:{id}:reasonCipher:{keyVersion}`，
     * 因此加密（也就是 id）必須先於 insert（ADR 018 §3）。
     */
    id: string;
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    // Info: (20260817 - Julian) 事由密文入庫（ADR 018 Tier 2）：病名、家屬狀況、司法事由都寫在這裡
    reasonCipher: string;
    piiAlgorithm: string;
    piiKeyVersion: number;
    totalMinutes: number;
    totalDays: number;
    days: readonly ILeaveDayPlan[];
    steps: readonly IResolvedApprovalStep[];
    concurrencyWarned: boolean;
  }): Promise<ILeaveRequestRecord>;
  advanceStep(params: {
    requestId: string;
    stepId: string;
    actorEmployeeId: string;
    decidedAt: Date;
    comment?: string;
  }): Promise<LeaveApprovalOutcome>;
  completeApproval(params: {
    accountBookId: string;
    requestId: string;
    stepId: string;
    actorEmployeeId: string;
    decidedAt: Date;
    comment?: string;
    employeeId: string;
    leavePolicyId: string;
    /**
     * Info: (20260817 - Julian) 只傳總量，**不傳分配結果**。
     *
     * 分配必須在交易內、依交易內讀到的餘額重算：service 算好再傳進來的那一份，
     * 在另一張單先扣走之後就是舊的，而寫進帳本的 `grantBalanceAfterMinutes`
     * 會因此對不上 —— 那正是每日勾稽要抓的東西，不該由我們自己製造。
     * service 端算一次只是為了在開交易之前就給出「額度不足」這個較友善的失敗。
     */
    totalMinutes: number;
  }): Promise<LeaveApprovalOutcome>;
  rejectStep(params: {
    requestId: string;
    stepId: string;
    actorEmployeeId: string;
    decidedAt: Date;
    comment?: string;
  }): Promise<LeaveApprovalOutcome>;
  withdraw(params: {
    requestId: string;
    decidedAt: Date;
  }): Promise<LeaveApprovalOutcome>;
}

// Info: (20260817 - Julian) ===== 清單與明細 =====

/**
 * Info: (20260817 - Julian) 假單清單的一列。扁平 DTO，不是 Prisma 實體 ——
 * 直接回實體等於讓 API 形狀跟著資料表漂移（同 `IAttendanceRosterRow` 的理由）。
 */
export interface ILeaveRequestSummary {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  leavePolicyId: string;
  leavePolicyCode: string;
  leavePolicyName: string;
  status: LeaveRequestStatus;
  totalMinutes: number;
  totalDays: number;
  /** Info: (20260817 - Julian) 逐日展開的第一天與最後一天，供清單顯示區間 */
  firstWorkDate: string;
  lastWorkDate: string;
  /** Info: (20260817 - Julian) 目前卡在第幾關（0 起算）。已決之單為 null */
  pendingStepOrder: number | null;
  pendingApproverName: string | null;
  totalSteps: number;
  createdAt: string;
}

export interface ILeaveRequestListQuery {
  from?: string;
  to?: string;
  /** Info: (20260817 - Julian) 未指定即為自己。指定他人須為該單的簽核者，否則擋下 */
  employeeId?: string;
}
