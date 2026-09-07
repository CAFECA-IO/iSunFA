import {
  AttendanceDayPhase,
  AttendanceDayStatus,
  AttendanceExceptionType,
  AuthProviderStatus,
  PresenceStatus,
  PunchType,
  ShiftPatternKind,
  WorkDayType,
} from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 簽到系統的資料結構。判定引擎（`@/lib/attendance_rules`）的輸入輸出都在這裡，
 * 刻意不含任何 `Date`：時區換算屬於 service 層，引擎只做整數運算（見 `attendance_rules.ts`）。
 */

/**
 * Info: (20260813 - Julian) 班別的時間窗，對應 `ShiftPattern` 的六個欄位，全部必填。
 * 固定班表是 `windowStart === coreStart && windowEnd === coreEnd` 的特例，引擎因此不需分支處理。
 * 分鐘值以「當地當日 00:00 起算」計，`>= MINUTES_PER_DAY` 表次日。
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
 * Info: (20260813 - Julian) 上班日的排班：**必定帶班別**。與 `IOffDaySchedule` 組成可辨識聯集（同 ADR 019 判準），
 * 讓「排了上班日卻沒有班別」在型別層就無法表示；schema 端由 `assertSchedulableDay` 擋在 repository。
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
 * Info: (20260813 - Julian) 一筆打卡在判定引擎眼中的樣子，只有兩個欄位——
 * 地點、精度、打卡人等已在打卡當下被護欄處理完，帶進引擎只會讓測試準備無關資料。
 */
export interface IPunchSnapshot {
  punchType: PunchType;
  /** Info: (20260813 - Julian) 以工作日當地 00:00 起算的分鐘數，跨日者 >= 1440 */
  minuteOfDay: number;
}

/**
 * Info: (20260813 - Julian) 判定所需的政策參數。三個寬限值分開帶——服務於不同目的，
 * 合成一個等於假設「安全」與「工時計算」要的是同一個數字。
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
   * Info: (20260813 - Julian) 「現在」相對於本工作日當地 00:00 的分鐘數，由呼叫端注入而非引擎內取 `Date.now()`——
   * 可重算是這個引擎唯一的驗收方式。評估過去的日子時此值會大於 1440。
   */
  nowMinuteOfDay: number;
}

/**
 * Info: (20260813 - Julian) 單一筆異常。`minutes` 是量值；`ABSENT`／`MISSING_*` 這類固定為 0（非 null），
 * 讓呼叫端加總時不必先判空。
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
   * Info: (20260813 - Julian) 產生本結果的規則引擎版本。規則改版時舊結果不就地改寫，而是重算並更新此值——
   * 稽核時答案在欄位裡，不在某人的記憶裡。心智模型同 `piiAlgorithm`。
   */
  engineVersion: number;
}

/**
 * Info: (20260813 - Julian) ===== 打卡流程（W3）=====
 */

/**
 * Info: (20260813 - Julian) 打卡請求。**刻意沒有時間欄位。**`punchedAt` 一律由伺服器產生（護欄 G1）——
 * 竄改打卡時間是本系統價值最高的攻擊，只要 client 傳得進來就永遠擋不住。
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
 * 回應須讓使用者知道「離某地點多遠、要再走近多少」，而非只說「不能打卡」。
 */
export interface IOutOfFencePayload {
  nearestLocationName: string;
  distanceMeters: number;
  radiusMeters: number;
  /**
   * Info: (20260814 - Julian) 距離扣掉 client 回報的定位誤差之後就落在圈內 ——
   * 也就是「可能只是定位不準」而不是「這個人不在工區」。
   *
   * **只用來決定訊息措辭，不用來放行**：誤差是 client 說了算，拿它放寬圍欄
   * 等於讓使用者自己決定圍欄多大（護欄 G2）。同 G3 的處置：拒收，但講「請重試」。
   */
  withinAccuracyMargin: boolean;
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
  /**
   * Info: (20260813 - Julian) 產生這個回應的**伺服器時刻**（ISO-8601），是前端秒錶的校時基準（護欄 G1：
   * `punchedAt` 一律由伺服器產生，不可信瀏覽器時鐘）。前端算出與本機時鐘的差後每秒遞增，
   * A1、A2 都回傳此欄位，每次打卡即重新校時。
   */
  serverNowIso: string;
}

/**
 * Info: (20260813 - Julian) ===== 判定結果矩陣（W6）=====
 */

/**
 * Info: (20260813 - Julian) 矩陣裡的一格：一位員工的一個工作日。刻意不帶 `engineVersion`——
 * 那是整張矩陣（同一次呼叫、同一版引擎）的屬性，不是格子的屬性。
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
 * Info: (20260813 - Julian) 一位員工在期間內的統計。`normalDays` 只數 `phase === CONCLUDED` 者——
 * 未過完的日子不能記一筆「正常」，另計於 `pendingDays`。
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
   * Info: (20260813 - Julian) 只列出真的發生過的型別，不補 `{ type: SUSPICIOUS_JUMP, days: 0 }` 這種零筆記錄——
   * 瞬移偵測（G5）本期未實作，回 0 等於宣稱「查過了、沒有」。「沒發生」與「沒檢查」不可混同。
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
 * `evaluatedAt` 不是裝飾：進行中的日子判定會隨時間改變，因此產出時刻與結果本身同等重要。
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

/**
 * Info: (20260813 - Julian) ===== 現場在班狀態（W7）=====
 * Demo 版不落地 `AttendancePresence`，改為讀取時由 `AttendancePunch` 即時推導；
 * 這裡的推導邏輯即正式版 `rebuildPresence` 的內容，正式版改為落地是因為效能，demo 沒有那個壓力。
 */

// Info: (20260813 - Julian) 名單上的一個人。欄位即 §D10.5 要求的六項
export interface IPresenceEntry {
  employeeId: string;
  employeeNo: string;
  name: string;
  departmentName: string | null;
  jobTitle: string | null;
  status: PresenceStatus;
  /** Info: (20260813 - Julian) 這筆在班屬於哪個工作日；跨夜班會是昨天 */
  workDate: string;
  /** Info: (20260813 - Julian) 上班打卡時刻，以 `workDate` 當地 00:00 起算 */
  sinceMinute: number;
  workLocationId: string;
  workLocationName: string;
}

/**
 * Info: (20260813 - Julian) 排了上班日、時間到了卻沒有任何打卡的人。**這個數字是必要的，不是加分項**——
 * 只顯示「在班 42 人」會讓人誤以為現場就是 42 人，須一併顯示未到工者才誠實。
 */
export interface IPresenceExpectedAbsentee {
  employeeId: string;
  employeeNo: string;
  name: string;
  departmentName: string | null;
  jobTitle: string | null;
  shiftName: string | null;
  /** Info: (20260813 - Julian) 遲到判定基準；看板據此說明「他該在幾點前到」 */
  coreStartMinute: number;
}

// Info: (20260813 - Julian) 單一地點的人數。含圓心與半徑，供 W9 直接畫地圖
export interface IPresenceLocationSummary {
  workLocationId: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onSiteCount: number;
  staleCount: number;
}

/**
 * Info: (20260813 - Julian) 現場人數總覽（A3）。`observedAt` 與判定矩陣的 `evaluatedAt` 同角色，
 * 但這裡更重要：現場狀態每分每秒都在變，沒有時間戳的名單在事故調查時無法採信。
 */
export interface IPresenceSummary {
  observedAt: string;
  timeZone: string;
  /**
   * Info: (20260814 - Julian) 呼叫者是否為部門主管，決定看不看得到地圖與匯出（計畫書 §8.5）。
   * 未帶呼叫者時一律 false —— 視野分級 fail-closed。
   */
  viewerIsSupervisor: boolean;
  /** Info: (20260813 - Julian) 觀測當下的當地日期，未到工以此日的排班認定 */
  workDate: string;
  locations: IPresenceLocationSummary[];
  onSiteTotal: number;
  staleTotal: number;
  /**
   * Info: (20260813 - Julian) 未到工**不分地點**——沒有打卡就沒有座標可歸屬工區，`EmployeeShiftDay` 也無地點欄位。
   *
   * ToDo: (20260813 - Julian) 正式版讓排班帶上預定工區，屆時未到工才分得了地點。
   */
  expectedAbsentees: IPresenceExpectedAbsentee[];
}

// Info: (20260813 - Julian) 單一地點的到班名單（A4）
export interface IPresenceRoster {
  workLocationId: string;
  code: string;
  name: string;
  observedAt: string;
  timeZone: string;
  entries: IPresenceEntry[];
}

/**
 * Info: (20260813 - Julian) ===== 班別與排班（W5）=====
 */

// Info: (20260813 - Julian) 班別清單（A6）。`kind` 是衍生值，不是欄位 —— 見 §D1
export interface IShiftPatternSummary {
  id: string;
  code: string;
  name: string;
  kind: ShiftPatternKind;
  window: IShiftWindow;
}

// Info: (20260813 - Julian) 排班月曆的一格
export interface IScheduleDayCell {
  workDate: string;
  /** Info: (20260813 - Julian) null 表示這一天完全沒有排班紀錄，與「排了休假」是兩件事 */
  dayType: WorkDayType | null;
  shiftPatternId: string | null;
  shiftCode: string | null;
  shiftName: string | null;
  shiftKind: ShiftPatternKind | null;
}

export interface IScheduleRow {
  employeeId: string;
  employeeNo: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  jobTitle: string | null;
  /** Info: (20260813 - Julian) 長度與順序與 `IScheduleCalendar.workDates` 逐一對應 */
  days: IScheduleDayCell[];
}

/**
 * Info: (20260813 - Julian) 排班月曆（A7）。與判定矩陣（A9）刻意分成兩支端點：這一支是輸入（人排的），
 * 那一支是輸出（系統算的），排班畫面須能在判定之外獨立存在（例如下月班表先排好，還沒有打卡可判）。
 */
export interface IScheduleCalendar {
  from: string;
  to: string;
  workDates: string[];
  rows: IScheduleRow[];
}

/**
 * Info: (20260814 - Julian) 登入方式的偵測結果。用可辨識聯集而非「status + 可空欄位」，
 * 是為了讓「已可用卻同時帶著錯誤原因」這種狀態寫不出來（ADR 019）。
 */
export type IAuthProviderState =
  | { status: AuthProviderStatus.CHECKING }
  | { status: AuthProviderStatus.AVAILABLE }
  | { status: AuthProviderStatus.UNCONFIGURED }
  | { status: AuthProviderStatus.UNREACHABLE };
