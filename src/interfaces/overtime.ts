import { WorkDayType } from "@/constants/attendance";
import {
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeExceptionType,
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
  /**
   * Info: (20260819 - Julian) §32 IV 天災事變等情形且已報備查。
   * 優先於**例假日以外**的所有判定 —— 例假日走 §40 的核備，是另一套程序
   * 且尚未實作，因此排在它之前擋下（review B7）。
   */
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
  /**
   * Info: (20260819 - Julian) §32 IV 的認定，由 `HR_ADMIN` 在核准**之前**登記。
   * 為真時 `emergencyReportUrl` / `emergencyReportedAt` 必有值 ——
   * 由 `assertOvertimeEmergencyRecord` 雙向保證（review B7）。
   */
  isEmergency: boolean;
  emergencyReportUrl: string | null;
  /** Info: (20260819 - Julian) ISO 8601 字串 */
  emergencyReportedAt: string | null;
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
  /**
   * Info: (20260820 - Julian) 核准算到一半，這張單被 §32 IV 認定改寫了（review 第 3 條）。
   *
   * 與 `ALREADY_REVIEWED` 分開，因為**下一步不一樣**：已決行是「別人先按了，
   * 你什麼都不用做」；重新分類是「這張單還在等你，但工資標準已經不是你剛才
   * 看到的那個」—— 主管必須重新看一次再按。兩者共用一句「已決行」的話，
   * 主管會照字面理解成不用管，而那張單會一直停在待簽清單上沒有人動。
   */
  RECLASSIFIED = "RECLASSIFIED",
  /**
   * Info: (20260820 - Julian) 這張單已經有一份有效的 §32 IV 認定（review 第 3 輪第 2 條）。
   *
   * 與 `ALREADY_REVIEWED` 分開：後者的下一步是「不用管了」，這一個是
   * 「要先撤回既有的那份」。合成同一句話的話，人資會以為是主管先決行了，
   * 而實際上那份報備紀錄還在，且他正要覆寫它。
   */
  ALREADY_DECLARED = "ALREADY_DECLARED",
  /**
   * Info: (20260820 - Julian) 這張單沒有可撤回的認定（review 第 3 輪第 2 條）。
   * 撤回一份不存在的認定不是成功 —— 回 `DECIDED` 會讓畫面顯示「已撤回」，
   * 而其實什麼都沒有發生。
   */
  NOT_DECLARED = "NOT_DECLARED",
}

// Info: (20260818 - Julian) ===== 查詢類端點的 DTO（L24 / L28 / L29 / L30）=====

/** Info: (20260818 - Julian) 報表一律帶工號與姓名：只有 id 的一份報表，主管看不懂 */
export interface IOvertimeEmployeeRef {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
}

export interface IOvertimeTierTotal {
  tier: OvertimePremiumTier;
  minutes: number;
}

/**
 * Info: (20260818 - Julian) L28：加班時數統計（月／季，含上限使用率）。
 *
 * ## 為什麼回分鐘與上限，而不回一個「使用率」
 *
 * 使用率是 `minutes / limit`，一個浮點數。在 API 折成比例會丟掉兩件事：
 * 分母是 46 還是 54 小時（取決於有沒有記載的同意），以及還剩幾分鐘 ——
 * 而主管要回答的問題是「這個月還能讓他加幾小時」。理由同 ADR 022 §2
 * 不在 API 把分鐘折成天。
 *
 * ## 為什麼佐證來源要分開統計
 *
 * 勞動檢查會問「你們有多少加班是沒有出勤紀錄佐證的」，
 * 而一個答不出這題的系統，等於默認全部都是（ADR 024 §2.2）。
 */
export interface IOvertimeSummaryView extends IOvertimeEmployeeRef {
  /** Info: (20260818 - Julian) "YYYY-MM" */
  month: string;
  monthlyMinutes: number;
  monthlyLimitMinutes: number;
  /** Info: (20260818 - Julian) 滾動三個月窗的兩端，讓「這一季」是可驗算的而不是一個說法 */
  quarterFrom: string;
  quarterTo: string;
  quarterlyMinutes: number;
  /**
   * Info: (20260818 - Julian) 未經同意放寬時為 null —— 那不是「上限無限大」，
   * 而是這條線根本不適用（每月 46 小時本身就讓三個月不可能超過 138）。
   * 回 0 或回 138 都會讓畫面說出一個法律上不存在的限制。
   */
  quarterlyLimitMinutes: number | null;
  extendedLimitAgreed: boolean;
  /** Info: (20260818 - Julian) 有打卡佐證的認列分鐘 */
  punchBackedMinutes: number;
  /** Info: (20260818 - Julian) 自陳（無打卡）的認列分鐘 */
  declaredMinutes: number;
  byTier: IOvertimeTierTotal[];
}

/**
 * Info: (20260818 - Julian) L29：有打卡但無核准加班單的時段。
 *
 * **不落地**（ADR 024 §9.5）：它由 `AttendancePunch` 與加班單即時推導，
 * 不是一張表。因此它永遠反映當下的事實 —— 補了核准之後它就會消失，
 * 而那正是它存在的目的。
 */
export interface IOvertimeExceptionView {
  workDate: string;
  type: OvertimeExceptionType;
  minutes: number;
  /** Info: (20260818 - Julian) `UNAPPROVED_OVERTIME` 才有值；自陳缺佐證時為空陣列 */
  intervals: IMinuteInterval[];
  /** Info: (20260818 - Julian) `MISSING_PUNCH_EVIDENCE` 指向那張自陳的單 */
  overtimeRequestId: string | null;
}

export interface IOvertimeExceptionReport extends IOvertimeEmployeeRef {
  from: string;
  to: string;
  exceptions: IOvertimeExceptionView[];
}

/**
 * Info: (20260818 - Julian) L30：加班政策。
 *
 * 三條上限一併回出去（法定的那條不可設定，另兩條取決於 `extendedLimitAgreed`）——
 * 設定畫面上「我改了這個開關會發生什麼」必須當場看得到，
 * 否則使用者得自己去記 46／54／138 這三個數字。
 */
export interface IOvertimePolicyView {
  extendedLimitAgreed: boolean;
  agreementRecordUrl: string | null;
  /** Info: (20260818 - Julian) ISO 字串。null 表尚未記載 */
  agreedAt: string | null;
  compensatoryExpiryMonths: number | null;
  dailyTotalLimitMinutes: number;
  monthlyLimitMinutes: number;
  quarterlyLimitMinutes: number | null;
}
