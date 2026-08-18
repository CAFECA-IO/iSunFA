import { WorkDayType } from "@/constants/attendance";
import {
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";

/**
 * Info: (20260817 - Julian) 加班引擎的型別。純函數的輸入輸出，不是 API 的 DTO。
 */

/**
 * Info: (20260817 - Julian) 切段的輸入。
 *
 * `priorRecognizedMinutes` 由呼叫端查好後傳入，引擎不查 DB ——
 * 一個會自己查資料的判定函數，其結果無法在測試裡完整重現，
 * 也就無法在爭議時重算（同 `evaluateAttendanceDay` 的邊界）。
 */
export interface IOvertimeSegmentInput {
  /** Info: (20260817 - Julian) 當日排班的性質。決定走平日、休息日或休假日的加成 */
  workDayType: WorkDayType;
  /** Info: (20260817 - Julian) §32 IV 天災事變等情形且已報備。優先於其他所有判定 */
  isEmergency: boolean;
  /** Info: (20260817 - Julian) 本次要切段的認列分鐘（已是 min(核准, 事實) 的結果） */
  minutes: number;
  /** Info: (20260817 - Julian) 當日先前已認列的加班分鐘。決定本段從第幾小時起算 */
  priorRecognizedMinutes: number;
}

export interface IOvertimeSegment {
  order: number;
  tier: OvertimePremiumTier;
  minutes: number;
}

/**
 * Info: (20260817 - Julian) 工時上限的檢查輸入。
 *
 * 三個累計值都由呼叫端提供：引擎不知道「這個月」是哪個月，
 * 那牽涉政策時區與週期定義，屬 service。
 */
export interface IOvertimeLimitInput {
  /** Info: (20260817 - Julian) 當日正常工作分鐘（班別的 requiredWorkMinutes） */
  regularWorkMinutes: number;
  /** Info: (20260817 - Julian) 含本次在內的當日延長工時累計 */
  dailyOvertimeMinutes: number;
  /** Info: (20260817 - Julian) 含本次在內的當月延長工時累計 */
  monthlyOvertimeMinutes: number;
  /** Info: (20260817 - Julian) 含本次在內的滾動三個月延長工時累計 */
  quarterlyOvertimeMinutes: number;
  /**
   * Info: (20260817 - Julian) 帳本是否已記載工會或勞資會議同意（§32 III）。
   * 為真才適用 54 小時／138 小時；**且該記載必須有 URL 與日期**，
   * 那條不變式在 repository，不在這裡 —— 引擎只認一個布林值。
   */
  extendedLimitAgreed: boolean;
}

// Info: (20260817 - Julian) 被違反的上限種類。回傳清單而非單一值：一次申請可能同時破三條
export enum OvertimeLimitKind {
  DAILY_TOTAL = "DAILY_TOTAL",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
}

export interface IOvertimeLimitViolation {
  kind: OvertimeLimitKind;
  limitMinutes: number;
  actualMinutes: number;
}

/**
 * Info: (20260817 - Julian) 上限檢查結果。
 *
 * 引擎回傳違反清單，由 service 丟對應的 `AppError` ——
 * 純函數不該知道 HTTP 狀態碼，而 service 需要知道破的是哪一條才能給出正確錯誤碼。
 */
export interface IOvertimeLimitResult {
  violations: IOvertimeLimitViolation[];
}

// Info: (20260818 - Julian) ===== 認列與接線用的型別（不是引擎的輸入輸出）=====

/**
 * Info: (20260818 - Julian) 一段以「當日 00:00 起算分鐘」表示的區間，右端不含。
 * 與 `ShiftPattern` / `OvertimeRequest.requestedStartMinute` 同型別同語意，
 * >= 1440 表次日。
 */
export interface IMinuteInterval {
  startMinute: number;
  endMinute: number;
}

/**
 * Info: (20260818 - Julian) 核准一張加班單所需的全部外部事實。
 *
 * 由 repository 一次查齊後傳給 service —— service 不自己拼查詢，
 * 而引擎完全不碰它（引擎只收已經算好的分鐘數）。三層的邊界因此看得出來。
 */
export interface IOvertimeApprovalContext {
  /**
   * Info: (20260818 - Julian) 該日排班性質。決定走哪一組加成級距。
   *
   * **`null` 代表那一天根本沒有排班**，不是某種日別 —— `WorkDayType` 沒有
   * 也不該有 `NO_SCHEDULE` 那個值（它是判定引擎的輸出，不是排班的性質）。
   * 兩者的下一步不同：沒排班要找人資補排班，停工日則是等法源核對，
   * 所以 service 對它們回不同的錯誤碼。
   */
  workDayType: WorkDayType | null;
  /** Info: (20260818 - Julian) 該日應工作分鐘（`ShiftPattern.requiredWorkMinutes`）。非上班日為 0 */
  regularWorkMinutes: number;
  /**
   * Info: (20260818 - Julian) 補休批次「日」欄位的換算基準。
   *
   * 不能直接用 `regularWorkMinutes`：休息日與國定假日沒有班別，那一天的
   * 應工作分鐘是 0，而 0 會讓 `assertGrantSource` 的驗算式失去意義
   * （零長度的一天算不出天數）。因此取該員最近一個有班別的上班日長度 ——
   * 「他的一天有多長」問的是這個人的常態，不是加班那一天的性質。
   *
   * 真正的量始終是分鐘（ADR 022 §2），這一欄只服務可驗算性。
   */
  compensatoryDayEquivalentMinutes: number | null;
  /**
   * Info: (20260818 - Julian) 打卡推出的在場區間。空陣列代表當日沒有任何成對打卡 ——
   * 那是 `MANUAL_DECLARATION` 的觸發條件，不是「加班 0 分鐘」。
   */
  punchIntervals: IMinuteInterval[];
  /** Info: (20260818 - Julian) 當日先前已認列的加班分鐘。決定本段從第幾小時起算 */
  priorRecognizedMinutes: number;
  /** Info: (20260818 - Julian) 不含本次的當月延長工時累計 */
  priorMonthlyMinutes: number;
  /** Info: (20260818 - Julian) 不含本次的滾動三個月延長工時累計 */
  priorQuarterlyMinutes: number;
  extendedLimitAgreed: boolean;
  /**
   * Info: (20260818 - Julian) 補休假別與期限。**兩者都可能為 null**：
   * 前者是帳本沒有種到內建的補休假別，後者是尚未協商期限（§32-1）。
   * 選 `COMPENSATORY_LEAVE` 時任一為 null 都必須擋下，不可退而求其次。
   */
  compensatoryPolicyId: string | null;
  compensatoryExpiryMonths: number | null;
}

// Info: (20260818 - Julian) 加班單清單／明細的扁平 DTO。不回 Prisma 實體，理由同 `ILeaveRequestSummary`
export interface IOvertimeSegmentView {
  order: number;
  tier: OvertimePremiumTier;
  minutes: number;
}

export interface IOvertimeRequestSummary {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  workDate: string;
  filingType: OvertimeFilingType;
  compensationMode: OvertimeCompensationMode;
  evidenceBasis: OvertimeEvidenceBasis;
  requestedStartMinute: number;
  requestedEndMinute: number;
  /** Info: (20260818 - Julian) 核准前為 null —— 0 與「還沒核准」是兩件事 */
  approvedMinutes: number | null;
  recognizedMinutes: number | null;
  reason: string;
  status: OvertimeRequestStatus;
  isEmergency: boolean;
  segments: IOvertimeSegmentView[];
  createdAt: string;
}

/**
 * Info: (20260818 - Julian) 核准的結果。
 *
 * `unapprovedMinutes` 一定要交出去：待了 3 小時只核准 1 小時，超出的 2 小時
 * 事實仍存在於 `AttendancePunch` 裡（ADR 024 §2.1）。它在 L29 會被完整列出，
 * 這裡先讓決行者當場看到 —— 一個要等到查清單才看得到的事實，多半不會有人去查。
 */
export interface IOvertimeApprovalResult {
  request: IOvertimeRequestSummary;
  recognizedMinutes: number;
  unapprovedMinutes: number;
  /** Info: (20260818 - Julian) 換成補休時新增的批次數；選 `PAYMENT` 時為 0 */
  compensatoryGrantCount: number;
  /**
   * Info: (20260818 - Julian) 選 `PAYMENT` 時產生的折現事件 id，**一段一筆**。
   * `LeaveCashOutEvent` 只有單一 `premiumTier` 與單一 `minutes`，
   * 把三小時併成一筆就說不出「哪兩小時是 1/3、哪一小時是 2/3」——
   * 與補休分批入帳同一個理由（ADR 024 §5.2）。選補休時為空陣列。
   */
  cashOutEventIds: string[];
}

/**
 * Info: (20260818 - Julian) 決行的結局。
 *
 * `ALREADY_REVIEWED` 不是故障：兩個分頁同時按核准，第二個會落在這裡
 * （同 `LeaveApprovalOutcome.ALREADY_REVIEWED` 的理由）。用回傳值表達
 * 而非丟例外，呼叫端才無法忘記處理。
 */
export enum OvertimeDecisionOutcome {
  DECIDED = "DECIDED",
  ALREADY_REVIEWED = "ALREADY_REVIEWED",
}
