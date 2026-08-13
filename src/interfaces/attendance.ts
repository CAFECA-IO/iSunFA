import {
  AttendanceDayStatus,
  AttendanceExceptionType,
  PunchType,
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
