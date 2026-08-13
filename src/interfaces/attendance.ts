import {
  AttendanceDayPhase,
  AttendanceDayStatus,
  AttendanceExceptionType,
  PunchType,
  ShiftPatternKind,
  WorkDayType,
} from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 簽到系統的資料結構。
 *
 * 判定引擎（`@/lib/attendance_rules`）的輸入與輸出都在這裡，
 * 而它們刻意**不含任何 `Date`**：時區換算屬於 service 層，
 * 引擎只做整數運算。理由見 `attendance_rules.ts` 的檔頭。
 */

/**
 * Info: (20260813 - Julian) 班別的時間窗。對應 `ShiftPattern` 的六個欄位。
 *
 * 全部必填 —— 沒有「只對某一種制度有意義」的欄位。
 * 固定班表就是 `windowStart === coreStart && windowEnd === coreEnd` 的特例，
 * 因此判定引擎不需要任何分支去區分固定班與彈性班。
 *
 * 分鐘值以「當地當日 00:00 起算」計，`>= MINUTES_PER_DAY` 表次日
 * （夜間施工班 20:00→次日 05:00 = 1200→1740）。
 */
export interface IShiftWindow {
  /** Info: (20260813 - Julian) 最早可認列的上班時刻 */
  windowStartMinute: number;
  /** Info: (20260813 - Julian) 最晚可認列的下班時刻 */
  windowEndMinute: number;
  /** Info: (20260813 - Julian) 遲到判定基準 */
  coreStartMinute: number;
  /** Info: (20260813 - Julian) 早退判定基準 */
  coreEndMinute: number;
  /** Info: (20260813 - Julian) 應工作分鐘（不含休息） */
  requiredWorkMinutes: number;
  /** Info: (20260813 - Julian) 法定／約定休息分鐘 */
  breakMinutes: number;
}

/**
 * Info: (20260813 - Julian) 上班日的排班：**必定帶班別**。
 *
 * 與 `IOffDaySchedule` 組成一個可辨識聯集，讓「排了上班日卻沒有班別」
 * 在型別層就無法表示 —— 同 ADR 019 的判準，只是這裡發生在 TypeScript
 * 而不是 schema（schema 端由 `assertSchedulableDay` 擋在 repository）。
 */
export interface IWorkDaySchedule {
  dayType: WorkDayType.WORK;
  shift: IShiftWindow;
}

// Info: (20260813 - Julian) 非上班日的排班：例假、休息日、國定假日、請假。不可能有班別
export interface IOffDaySchedule {
  dayType: Exclude<WorkDayType, WorkDayType.WORK>;
  shift?: undefined;
}

export type IDaySchedule = IWorkDaySchedule | IOffDaySchedule;

/**
 * Info: (20260813 - Julian) 一筆打卡在判定引擎眼中的樣子。
 *
 * 只有兩個欄位：判定不需要知道地點、定位精度或誰打的 ——
 * 那些在打卡當下就已經被護欄處理完（圍欄外的打卡根本進不了資料庫）。
 * 把它們帶進引擎只會讓測試要準備一堆與結論無關的資料。
 */
export interface IPunchSnapshot {
  punchType: PunchType;
  /** Info: (20260813 - Julian) 以工作日當地 00:00 起算的分鐘數，跨日者 >= 1440 */
  minuteOfDay: number;
}

/**
 * Info: (20260813 - Julian) 判定所需的政策參數。
 *
 * 三個寬限值分開帶而不是共用一個：它們服務於不同的目的，
 * 合成一個等於假設「安全」與「工時計算」要的是同一個數字（見 §D10.3）。
 */
export interface IAttendancePolicySnapshot {
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  missingClockOutGraceMinutes: number;
}

/**
 * Info: (20260813 - Julian) 判定引擎的輸入。
 *
 * `schedule` 為 `null` 表示**當日完全沒有排班紀錄** —— 那與「排了休假」
 * 是兩件事：前者代表系統沒有比較基準（不判曠職），後者代表明確免除出勤義務。
 */
export interface IAttendanceDayInput {
  /** Info: (20260813 - Julian) "YYYY-MM-DD"，僅供輸出回填，引擎不解析它 */
  workDate: string;
  schedule: IDaySchedule | null;
  /** Info: (20260813 - Julian) 已過濾 supersededById IS NULL 的當日打卡，順序不拘 */
  punches: IPunchSnapshot[];
  policy: IAttendancePolicySnapshot;
  /**
   * Info: (20260813 - Julian) 「現在」相對於本工作日當地 00:00 的分鐘數。
   *
   * 由呼叫端注入而不是在引擎內取 `Date.now()`：那會讓同一組輸入在不同時刻
   * 得到不同結果，而可重算是這個引擎唯一的驗收方式。
   * 評估過去的日子時此值會大於 1440（例如評估三天前，相當於 4320 以上）。
   */
  nowMinuteOfDay: number;
}

/**
 * Info: (20260813 - Julian) 單一筆異常。
 *
 * `minutes` 是該異常的量值（遲到／早退／不足的分鐘數）；
 * 對 `ABSENT` 與 `MISSING_*` 這類「有或沒有」的異常固定為 0 ——
 * 用 0 而不是 null，是因為呼叫端要加總各類異常分鐘時不必先判空。
 */
export interface IAttendanceExceptionItem {
  type: AttendanceExceptionType;
  minutes: number;
}

// Info: (20260813 - Julian) 判定引擎的輸出。同一組輸入永遠得到同一組輸出
export interface IAttendanceEvaluation {
  workDate: string;
  status: AttendanceDayStatus;
  /** Info: (20260813 - Julian) 認列工時；當日尚未結束或無法計算時為 0 */
  workedMinutes: number;
  firstInMinute: number | null;
  lastOutMinute: number | null;
  /** Info: (20260813 - Julian) 可同時有多筆；`status` 為 EXCEPTION 時必不為空 */
  exceptions: IAttendanceExceptionItem[];
  /**
   * Info: (20260813 - Julian) 產生本結果的規則引擎版本。
   *
   * 規則改版時舊結果不就地改寫，而是重算並更新此值 —— 稽核問
   * 「為什麼去年這天判成遲到、今年同樣的打卡判成正常」時，
   * 答案在欄位裡，不在某個人的記憶裡。心智模型同 `piiAlgorithm`。
   */
  engineVersion: number;
}

/**
 * Info: (20260813 - Julian) ===== 打卡流程（W3）=====
 */

/**
 * Info: (20260813 - Julian) 打卡請求。**刻意沒有時間欄位。**
 *
 * `punchedAt` 一律由伺服器產生（護欄 G1）—— 竄改打卡時間是這個系統
 * 價值最高的攻擊，而只要 client 傳得進來，它就永遠擋不住。
 */
export interface IPunchRequest {
  punchType: PunchType;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

// Info: (20260813 - Julian) 地點清單（A5）。前端用它畫地圖圓圈與顯示「距離 X 公尺」
export interface IWorkLocationSummary {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/**
 * Info: (20260813 - Julian) 圍欄外被拒時一併回傳的資訊（403 payload）。
 *
 * 收到這個 403 的人正站在某處試圖上班。回應必須讓他立刻知道
 * 「我離大漢溪橋梁工區 340 公尺，要再走近一點」，而不是「系統說我不能打卡」。
 * 這兩個欄位免解密就拿得到 —— `distanceMeters` 是「有多接近」不是「在哪裡」。
 */
export interface IOutOfFencePayload {
  nearestLocationName: string;
  distanceMeters: number;
  radiusMeters: number;
}

// Info: (20260813 - Julian) 今日狀態（A1 成功後與 A2）
export interface ITodayStatus {
  employeeId: string;
  employeeNo: string;
  name: string;
  workDate: string;
  /** Info: (20260813 - Julian) 當日班別；無排班時為 null，此時前端顯示「今日無排班」 */
  shift: IShiftWindow | null;
  shiftName: string | null;
  shiftKind: ShiftPatternKind | null;
  /** Info: (20260813 - Julian) 已上班且未下班 */
  onSite: boolean;
  firstInMinute: number | null;
  lastOutMinute: number | null;
  workLocationName: string | null;
}

/**
 * Info: (20260813 - Julian) ===== 判定結果矩陣（W6）=====
 */

/**
 * Info: (20260813 - Julian) 矩陣裡的一格：一位員工的一個工作日。
 *
 * 刻意**不帶 `engineVersion`** —— 整張矩陣由同一次呼叫、同一版引擎算出，
 * 那是矩陣的屬性不是格子的屬性。每格重複一次只是把一個事實講 372 遍。
 */
export interface IAttendanceDayResult {
  workDate: string;
  status: AttendanceDayStatus;
  /**
   * Info: (20260813 - Julian) 這一天算完了沒。**上色前必須看它。**
   * `status: NORMAL` 加 `phase: UPCOMING` 的意思是「還沒開始」，不是「正常出勤」。
   */
  phase: AttendanceDayPhase;
  /** Info: (20260813 - Julian) null 表示當日完全沒有排班紀錄，與「排了休假」是兩件事 */
  dayType: WorkDayType | null;
  shiftName: string | null;
  shiftKind: ShiftPatternKind | null;
  workedMinutes: number;
  firstInMinute: number | null;
  lastOutMinute: number | null;
  exceptions: IAttendanceExceptionItem[];
}

// Info: (20260813 - Julian) 單一異常型別在期間內的累計
export interface IAttendanceExceptionTally {
  type: AttendanceExceptionType;
  /** Info: (20260813 - Julian) 發生天數；同一天有兩種異常時，各自計一天 */
  days: number;
  /** Info: (20260813 - Julian) 分鐘數總和；ABSENT / MISSING_* 這類無量值的恆為 0 */
  minutes: number;
}

/**
 * Info: (20260813 - Julian) 一位員工在期間內的統計。
 *
 * `normalDays` 只數 `phase === CONCLUDED` 的那些 —— 一天還沒過完就記一筆「正常」，
 * 是拿一個尚未成立的事實去墊高分母。未結束的日子另計於 `pendingDays`。
 */
export interface IAttendanceResultSummary {
  /** Info: (20260813 - Julian) 期間內排定的上班日數（dayType = WORK） */
  scheduledWorkDays: number;
  /** Info: (20260813 - Julian) 上班日中已過完且無異常者 */
  normalDays: number;
  /** Info: (20260813 - Julian) 判定為異常的天數；進行中的日子也可能已經成立（例如已早退） */
  exceptionDays: number;
  /** Info: (20260813 - Julian) 上班日中尚未過完者 —— 它們的「無異常」還不是結論 */
  pendingDays: number;
  offDays: number;
  noScheduleDays: number;
  workedMinutes: number;
  /**
   * Info: (20260813 - Julian) **只列出真的發生過的型別。**
   *
   * 不補上 `{ type: SUSPICIOUS_JUMP, days: 0 }` 這種零筆記錄：瞬移偵測（G5）
   * 本期未實作，回一個 0 等於宣稱「查過了、沒有」，而系統根本沒查。
   * 「沒發生」與「沒檢查」不能長成同一個樣子。
   */
  exceptions: IAttendanceExceptionTally[];
}

export interface IAttendanceResultRow {
  employeeId: string;
  employeeNo: string;
  name: string;
  departmentName: string | null;
  jobTitle: string | null;
  /** Info: (20260813 - Julian) 長度與順序與 `IAttendanceResultMatrix.workDates` 逐一對應 */
  days: IAttendanceDayResult[];
  summary: IAttendanceResultSummary;
}

/**
 * Info: (20260813 - Julian) A9 的回應：期間 × 員工的判定矩陣。**即時計算，不讀結果表。**
 *
 * `evaluatedAt` 不是裝飾。整張矩陣的判定都以這一個時間點為準（進行中的日子
 * 判定會隨時間改變），因此「這份結果是幾點算出來的」與結果本身同等重要 ——
 * 同 A10 現場名單要求產出時間戳的理由。
 */
export interface IAttendanceResultMatrix {
  from: string;
  to: string;
  /** Info: (20260813 - Julian) 連續日曆日；由 from/to 展開，不由資料決定，缺漏的一天不會整欄消失 */
  workDates: string[];
  /** Info: (20260813 - Julian) 分鐘數的解讀基準；前端據此把 minute 轉成 HH:mm */
  timeZone: string;
  evaluatedAt: string;
  engineVersion: number;
  rows: IAttendanceResultRow[];
}
