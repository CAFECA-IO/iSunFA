/**
 * Info: (20260813 - Julian) 簽到系統的共用常數。與 `model Checkin`（使用者登入簽到）無關，本模組一律用 `Attendance*` 前綴。
 *
 * enum 刻意不從 `@/generated` 匯入，同步由 `src/__tests__/hr_enum_mirror.test.ts` 保證：
 * `PunchType` / `PunchVerification` / `WorkDayType` 登記在 `MIRRORED`；
 * `ShiftPatternKind` / `AttendanceDayStatus` / `AttendanceExceptionType` / `PresenceStatus` 無 schema 對應物，登記在 `UI_ONLY`。
 * 新增鏡像 enum 須同步登記。
 */

// Info: (20260813 - Julian) 打卡類型，對齊 Prisma enum PunchType
export enum PunchType {
  CLOCK_IN = "CLOCK_IN",
  CLOCK_OUT = "CLOCK_OUT",
}

// Info: (20260813 - Julian) 打卡的定位證據來源，對齊 Prisma enum PunchVerification。Demo 只產生 GPS，三個值一次定義完
export enum PunchVerification {
  GPS = "GPS",
  NETWORK = "NETWORK",
  CORRECTION = "CORRECTION",
}

/**
 * Info: (20260813 - Julian) 排班日的性質，對齊 Prisma enum WorkDayType。
 *
 * Info: (20260817 - Julian) `SUSPENDED` 已補上，不再暫借 `HOLIDAY`。
 * 停工天數是工期展延與契約計價的依據，混進國定假日就再也拆不開；
 * 加班級距的判定也依賴兩者分開（假勤計畫書 §8.1 #8）。
 */
export enum WorkDayType {
  WORK = "WORK",
  REGULAR_OFF = "REGULAR_OFF",
  REST_DAY = "REST_DAY",
  HOLIDAY = "HOLIDAY",
  LEAVE = "LEAVE",
  SUSPENDED = "SUSPENDED",
}

// Info: (20260813 - Julian) 單日出勤判定的總結狀態。判定引擎的輸出，DB 沒有這個欄位
export enum AttendanceDayStatus {
  NORMAL = "NORMAL",
  EXCEPTION = "EXCEPTION",
  NO_SCHEDULE = "NO_SCHEDULE",
  OFF_DAY = "OFF_DAY",
}

/**
 * Info: (20260813 - Julian) 出勤異常型別。一天可同時成立多項，故引擎回傳清單而非單一狀態。
 * `SUSPICIOUS_JUMP` 定義但 demo 不產生（瞬移偵測未實作）；刻意無 `OUT_OF_FENCE`，
 * 圍欄外的打卡在 API 層即被 403 擋掉，不會成為待判定紀錄。
 */
export enum AttendanceExceptionType {
  LATE = "LATE",
  EARLY_LEAVE = "EARLY_LEAVE",
  ABSENT = "ABSENT",
  MISSING_CLOCK_IN = "MISSING_CLOCK_IN",
  MISSING_CLOCK_OUT = "MISSING_CLOCK_OUT",
  INSUFFICIENT_HOURS = "INSUFFICIENT_HOURS",
  SUSPICIOUS_JUMP = "SUSPICIOUS_JUMP",
}

// Info: (20260813 - Julian) 班別制度。**衍生值，資料庫沒有這個欄位**，由 `deriveShiftPatternKind` 依六個時間欄位算出，僅供畫面標示，不可寫回資料庫
export enum ShiftPatternKind {
  FIXED = "FIXED",
  FLEXIBLE = "FLEXIBLE",
}

/**
 * Info: (20260813 - Julian) 一個工作日相對於「現在」的階段。**沒有 schema 對應物。**
 *
 * 判定引擎的 `NORMAL` 只代表「目前查不到異常」，對還沒開始的工作日也會回 `NORMAL`——
 * 前端上色前必須先看 `phase`，否則會把「尚未發生」畫成「正常出勤」。
 * 由伺服器算而非前端比日期：邊界是該班別的窗迄加寬限，不是日曆換日。
 */
export enum AttendanceDayPhase {
  // Info: (20260813 - Julian) 窗起尚未到：這一天還沒開始，任何判定都言之過早
  UPCOMING = "UPCOMING",
  // Info: (20260813 - Julian) 進行中：異常可能已成立（例如已早退），但「無異常」還不是結論
  IN_PROGRESS = "IN_PROGRESS",
  // Info: (20260813 - Julian) 窗迄加寬限已過：這一天的判定是最終結果
  CONCLUDED = "CONCLUDED",
}

/**
 * Info: (20260813 - Julian) 出勤總覽裡一格的顯示語意。**沒有 schema 對應物。**
 * 一天可同時成立多種異常，需先選出主導的一種才能上色，故自成型別而非 status 的別名。
 * `PENDING`（有義務但還沒過完）與 `NO_SCHEDULE`（沒有出勤義務）刻意分開。
 */
export enum AttendanceCellTone {
  NORMAL = "NORMAL",
  LATE = "LATE",
  EARLY_LEAVE = "EARLY_LEAVE",
  ABSENT = "ABSENT",
  // Info: (20260813 - Julian) 漏打上班卡與漏打下班卡共用一格顏色，哪一端由明細交代
  MISSING_PUNCH = "MISSING_PUNCH",
  INSUFFICIENT_HOURS = "INSUFFICIENT_HOURS",
  OFF_DAY = "OFF_DAY",
  NO_SCHEDULE = "NO_SCHEDULE",
  PENDING = "PENDING",
}

/**
 * Info: (20260813 - Julian) 現場在班狀態。**計算值，demo 版不落地。**
 * `STALE` 的語意是「不知道他在不在」而不是「他不在」，因此不從現場名單移除。
 */
export enum PresenceStatus {
  ON_SITE = "ON_SITE",
  STALE = "STALE",
}

/**
 * Info: (20260813 - Julian) 一天的分鐘數。班別時刻以「當地當日 00:00 起算的分鐘數」表示，
 * `>= 1440` 即次日（例如夜班 20:00→次日 05:00 為 1200→1740）。
 * 用 Int 而非 DateTime：時刻是概念不是時間點，DateTime 會被迫綁一個無意義的日期。
 */
export const MINUTES_PER_DAY = 1440;

/**
 * Info: (20260813 - Julian) ===== 以下為 Demo 期間的參數 =====
 * 正式版屬於帳本層級的 `AttendancePolicy`；demo 不建表，改為常數。
 */

/**
 * Info: (20260813 - Julian) 定位精度上限（護欄 G3）。超過視為證據品質不足，拒收並請重試——
 * 錯誤訊息須是「定位精度不足」而非「你不在現場」，兩者對員工意義不同。
 */
export const DEMO_MAX_ACCURACY_METERS = 200;

// Info: (20260813 - Julian) 遲到寬限：走到定點掏出手機的合理時間
export const DEMO_LATE_GRACE_MINUTES = 5;

// Info: (20260813 - Julian) 早退寬限，語意同上
export const DEMO_EARLY_LEAVE_GRACE_MINUTES = 5;

/**
 * Info: (20260813 - Julian) 判定「漏打下班卡」的寬限（自班別窗迄起算）。
 *
 * **與 `DEMO_PRESENCE_STALE_MINUTES` 刻意分成兩個常數，即使 demo 兩者同值，也不可合併**：
 * 這一個服務於工時計算（寧可晚判，避免還在收拾東西的人被記異常），
 * 後者服務於安全（現場名單寧可早一點承認「不確定在不在」）。
 */
export const DEMO_MISSING_CLOCK_OUT_GRACE_MINUTES = 3;

/**
 * Info: (20260813 - Julian) 現場狀態轉為 `STALE` 的寬限（自班別窗迄起算）。
 * 3 分鐘是為了讓 demo 看得到狀態轉換；正式環境要依加班文化訂，太短會讓整層樓下班後集體變黃。
 */
export const DEMO_PRESENCE_STALE_MINUTES = 3;

/**
 * Info: (20260813 - Julian) Demo 帳本的時區。判定引擎本身不碰時區（見 `attendance_rules.ts`），
 * 「Date → 當地分鐘數」的換算在 service 層，這個常數屬於那個換算。
 */
export const DEMO_TIME_ZONE = "Asia/Taipei";

/**
 * Deprecated: (20260813 - Julian) Demo 帳本 ID，與種子腳本共用同一份。
 * 正式版帳本由使用者於帳本選單挑選，這個常數屆時整個消失。
 */
export const DEMO_ACCOUNT_BOOK_ID = "demo-book-public-works";

/**
 * Info: (20260814 - Julian) 決定打卡歸屬工作日的容差，不是遲到寬限——只影響這筆算哪一天。
 * 夜班跨午夜時，凌晨兩點的下班卡仍屬前一個工作日。
 */
export const DEMO_WORK_DATE_TOLERANCE_MINUTES = 180;

/**
 * Info: (20260814 - Julian) 現場看板與待回應徵詢的輪詢節奏。三個 hook 共用同一個數字，
 * 因為使用者感知到的是「畫面多久更新一次」這一件事，分開設會出現同一頁不同區塊各更新各的。
 * 與 `use_geolocation` 的 15 秒無關——那是單次定位的逾時。
 */
export const DEMO_ATTENDANCE_POLL_INTERVAL_MS = 15_000;

/**
 * Info: (20260813 - Julian) 判定結果查詢的區間上限（日曆日，含頭含尾）。
 * A9 即時計算不落地的前提是成本有界；92 天（一季）取季報粒度，比一個月寬鬆但仍有界。
 */
export const DEMO_ATTENDANCE_MAX_RANGE_DAYS = 92;

/**
 * Info: (20260814 - Julian) 瀏覽器定位的五種狀態，各自對應不同的下一步：
 * 等待、可打卡、去設定改權限、換裝置。`IDLE` 與 `LOCATING` 在畫面上同樣是「等一下」，
 * 但分開才知道要不要顯示重試鈕。
 */
export enum GeolocationStatus {
  IDLE = "IDLE",
  LOCATING = "LOCATING",
  READY = "READY",
  DENIED = "DENIED",
  UNAVAILABLE = "UNAVAILABLE",
}

/**
 * Info: (20260814 - Julian) 登入方式的可用性偵測。`UNCONFIGURED`（伺服器沒設好 OAuth）
 * 與 `UNREACHABLE`（探測請求本身失敗）必須分開：前者要找 IT 設定，後者重試就好。
 */
export enum AuthProviderStatus {
  CHECKING = "CHECKING",
  AVAILABLE = "AVAILABLE",
  UNCONFIGURED = "UNCONFIGURED",
  UNREACHABLE = "UNREACHABLE",
}

/**
 * Info: (20260813 - Julian) 出勤總覽格子的配色。只用 50 / 100 / 700 這幾階（同 `EMPLOYEE_STATUS_STYLE`）。
 * `PENDING` 用虛線框而非顏色：表達「還沒有結論」，任何實色都會被讀成一種結論。
 */
export const ATTENDANCE_CELL_TONE_STYLE: Record<AttendanceCellTone, string> = {
  [AttendanceCellTone.NORMAL]: "bg-emerald-50 text-emerald-700",
  [AttendanceCellTone.LATE]: "bg-red-100 text-red-700",
  [AttendanceCellTone.EARLY_LEAVE]: "bg-amber-100 text-amber-700",
  [AttendanceCellTone.ABSENT]: "bg-orange-100 text-orange-700",
  [AttendanceCellTone.MISSING_PUNCH]: "bg-gray-200 text-gray-700",
  [AttendanceCellTone.INSUFFICIENT_HOURS]: "bg-yellow-100 text-yellow-700",
  [AttendanceCellTone.OFF_DAY]: "bg-gray-50 text-gray-400",
  [AttendanceCellTone.NO_SCHEDULE]: "bg-transparent text-gray-300",
  [AttendanceCellTone.PENDING]:
    "bg-transparent text-gray-400 border border-dashed border-gray-300",
};

// Info: (20260813 - Julian) 圖例與明細共用同一組文案，兩邊各寫一份就會出現兩種說法
export const ATTENDANCE_CELL_TONE_I18N_KEY: Record<AttendanceCellTone, string> =
  {
    [AttendanceCellTone.NORMAL]: "hr_management.attendance_result.tone_normal",
    [AttendanceCellTone.LATE]: "hr_management.attendance_result.tone_late",
    [AttendanceCellTone.EARLY_LEAVE]:
      "hr_management.attendance_result.tone_early_leave",
    [AttendanceCellTone.ABSENT]: "hr_management.attendance_result.tone_absent",
    [AttendanceCellTone.MISSING_PUNCH]:
      "hr_management.attendance_result.tone_missing_punch",
    [AttendanceCellTone.INSUFFICIENT_HOURS]:
      "hr_management.attendance_result.tone_insufficient_hours",
    [AttendanceCellTone.OFF_DAY]:
      "hr_management.attendance_result.tone_off_day",
    [AttendanceCellTone.NO_SCHEDULE]:
      "hr_management.attendance_result.tone_no_schedule",
    [AttendanceCellTone.PENDING]:
      "hr_management.attendance_result.tone_pending",
  };

// Info: (20260813 - Julian) 異常型別的顯示文案，明細與統計欄共用
export const ATTENDANCE_EXCEPTION_I18N_KEY: Record<
  AttendanceExceptionType,
  string
> = {
  [AttendanceExceptionType.LATE]: "hr_management.attendance_result.late",
  [AttendanceExceptionType.EARLY_LEAVE]:
    "hr_management.attendance_result.early_leave",
  [AttendanceExceptionType.ABSENT]: "hr_management.attendance_result.absent",
  [AttendanceExceptionType.MISSING_CLOCK_IN]:
    "hr_management.attendance_result.missing_clock_in",
  [AttendanceExceptionType.MISSING_CLOCK_OUT]:
    "hr_management.attendance_result.missing_clock_out",
  [AttendanceExceptionType.INSUFFICIENT_HOURS]:
    "hr_management.attendance_result.insufficient_hours",
  [AttendanceExceptionType.SUSPICIOUS_JUMP]:
    "hr_management.attendance_result.suspicious_jump",
};

/**
 * Info: (20260813 - Julian) 「僅顯示有異常者」的篩選值。與 `HR_FILTER_ALL` 同一種做法：
 * 一個不會與任何 `AttendanceExceptionType` 相撞的哨兵值，讓篩選共用同一個下拉選單。
 */
export const ATTENDANCE_FILTER_EXCEPTION_ONLY = "__EXCEPTION_ONLY__";

/**
 * Info: (20260814 - Julian) 月曆格子用的一字縮寫。**不可從完整名稱取首字**——
 * 那是同一種錯的第二次：韓文的「휴무일」（休息日）與「휴가」（請假）首字都是「휴」，
 * 兩種日型別會在格子上長得一模一樣，而畫面看起來完全正常。
 * 縮寫是每個語系各自的取捨，不是能從全名推導出來的東西（同班別簡稱的處置）。
 * 五語系各自互不相同由 `i18n_keys.test.ts` 保證。
 */
export const WORK_DAY_TYPE_SHORT_I18N_KEY: Record<WorkDayType, string> = {
  [WorkDayType.WORK]: "hr_management.attendance_result.day_type_short_work",
  [WorkDayType.REGULAR_OFF]:
    "hr_management.attendance_result.day_type_short_regular_off",
  [WorkDayType.REST_DAY]:
    "hr_management.attendance_result.day_type_short_rest_day",
  [WorkDayType.HOLIDAY]:
    "hr_management.attendance_result.day_type_short_holiday",
  [WorkDayType.LEAVE]: "hr_management.attendance_result.day_type_short_leave",
  [WorkDayType.SUSPENDED]:
    "hr_management.attendance_result.day_type_short_suspended",
};

// Info: (20260813 - Julian) 排班日型別的顯示文案，出勤總覽與排班月曆共用
export const WORK_DAY_TYPE_I18N_KEY: Record<WorkDayType, string> = {
  [WorkDayType.WORK]: "hr_management.attendance_result.day_type_work",
  [WorkDayType.REGULAR_OFF]:
    "hr_management.attendance_result.day_type_regular_off",
  [WorkDayType.REST_DAY]: "hr_management.attendance_result.day_type_rest_day",
  [WorkDayType.HOLIDAY]: "hr_management.attendance_result.day_type_holiday",
  [WorkDayType.LEAVE]: "hr_management.attendance_result.day_type_leave",
  [WorkDayType.SUSPENDED]: "hr_management.attendance_result.day_type_suspended",
};

/**
 * Info: (20260813 - Julian) 判定階段的顯示文案。明細必須印出來：一格是空的，
 * 「這天還沒過完」與「這天沒有排班」是兩個完全不同的答案。
 */
export const ATTENDANCE_DAY_PHASE_I18N_KEY: Record<AttendanceDayPhase, string> =
  {
    [AttendanceDayPhase.UPCOMING]:
      "hr_management.attendance_result.phase_upcoming",
    [AttendanceDayPhase.IN_PROGRESS]:
      "hr_management.attendance_result.phase_in_progress",
    [AttendanceDayPhase.CONCLUDED]:
      "hr_management.attendance_result.phase_concluded",
  };

/**
 * Deprecated: (20260813 - Julian) 緊急點名 CSV 的欄位標題（繁中）。寫死語系是 demo 的簡化，
 * 正式版應依請求者語系取字典。
 */
export const ROSTER_CSV_LABELS_ZH_TW = {
  generatedAt: "產出時間",
  generatedBy: "產出者",
  timeZone: "時區",
  location: "地點",
  employeeNo: "工號",
  name: "姓名",
  department: "部門",
  jobTitle: "職稱",
  since: "上班打卡時間",
  status: "狀態",
  statusOnSite: "在班",
  statusStale: "未打下班卡（系統無法確認是否仍在現場）",
  none: "—",
};

/**
 * Info: (20260813 - Julian) 現場狀態的配色。與出勤總覽同一條規則：只用 50 / 100 / 700 階。
 * `STALE` 用琥珀色而非紅色：它不是異常也不是懲罰，是「系統不知道」。
 */
export const PRESENCE_STATUS_STYLE: Record<PresenceStatus, string> = {
  [PresenceStatus.ON_SITE]: "bg-emerald-50 text-emerald-700",
  [PresenceStatus.STALE]: "bg-amber-100 text-amber-700",
};

export const PRESENCE_STATUS_I18N_KEY: Record<PresenceStatus, string> = {
  [PresenceStatus.ON_SITE]: "hr_management.attendance_presence.status_on_site",
  [PresenceStatus.STALE]: "hr_management.attendance_presence.status_stale",
};

/**
 * Info: (20260813 - Julian) 排班月曆裡各班別的配色。依清單順序（以 `code` 排序）取用，
 * 超過色盤時繞回共用顏色，由格子簡稱區分。同樣只用 50 / 100 / 700 階。
 */
export const SHIFT_PATTERN_PALETTE: string[] = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-lime-100 text-lime-700",
  "bg-cyan-100 text-cyan-700",
];

/**
 * Info: (20260813 - Julian) 非上班日的配色，與班別色盤分開：這幾種語意固定，不隨帳本改變。
 *
 * Info: (20260817 - Julian) `SUSPENDED` 取 slate 而不是沿用 `HOLIDAY` 的紅：
 * 兩者在畫面上必須一眼分得開，否則「今年停工幾天」還是得靠人一格一格數。
 */
export const OFF_DAY_TYPE_STYLE: Record<
  Exclude<WorkDayType, WorkDayType.WORK>,
  string
> = {
  [WorkDayType.REGULAR_OFF]: "bg-gray-200 text-gray-600",
  [WorkDayType.REST_DAY]: "bg-gray-100 text-gray-500",
  [WorkDayType.HOLIDAY]: "bg-red-100 text-red-600",
  [WorkDayType.LEAVE]: "bg-amber-100 text-amber-700",
  [WorkDayType.SUSPENDED]: "bg-slate-200 text-slate-700",
};

// Info: (20260813 - Julian) 星期標頭。索引即 `isoWeekday` 的回傳值（0 = 週日）
export const WEEKDAY_I18N_KEY: string[] = [
  "hr_management.attendance_schedule.weekday_sun",
  "hr_management.attendance_schedule.weekday_mon",
  "hr_management.attendance_schedule.weekday_tue",
  "hr_management.attendance_schedule.weekday_wed",
  "hr_management.attendance_schedule.weekday_thu",
  "hr_management.attendance_schedule.weekday_fri",
  "hr_management.attendance_schedule.weekday_sat",
];

/**
 * Info: (20260814 - Julian) 簽到 API 的端點集中處，比照 `HR_MANAGEMENT_ROUTE` 的做法。
 * 原本四個頁面各自組一份相同的 base，子路徑也各寫各的——端點改名時要改幾處全靠記憶。
 *
 * ToDo: (20260814 - Julian) demo 綁死 `DEMO_ACCOUNT_BOOK_ID`；正式版帳本可切換時，
 * 這裡要改成 `attendanceApiOf(accountBookId)`，呼叫端從常數改為函式呼叫。
 */
const ATTENDANCE_API_BASE = `/api/v1/user/account_book/${DEMO_ACCOUNT_BOOK_ID}/hr/attendance`;

export const ATTENDANCE_API = {
  PUNCH: `${ATTENDANCE_API_BASE}/punch`,
  TODAY: `${ATTENDANCE_API_BASE}/today`,
  LOCATION: `${ATTENDANCE_API_BASE}/location`,
  SCHEDULE: `${ATTENDANCE_API_BASE}/schedule`,
  SHIFT_PATTERN: `${ATTENDANCE_API_BASE}/shift_pattern`,
  RESULT: `${ATTENDANCE_API_BASE}/result`,
  PRESENCE: `${ATTENDANCE_API_BASE}/presence`,
  PRESENCE_ROSTER_EXPORT: `${ATTENDANCE_API_BASE}/presence/roster/export`,
  LEAVE: `${ATTENDANCE_API_BASE}/leave`,
  LEAVE_RECALL: `${ATTENDANCE_API_BASE}/leave/recall`,
  LEAVE_RECALL_PENDING: `${ATTENDANCE_API_BASE}/leave/recall/pending`,
} as const;

// Info: (20260814 - Julian) 帶路徑參數的端點寫成函式，避免呼叫端自己接字串
export const presenceLocationApi = (locationId: string): string =>
  `${ATTENDANCE_API_BASE}/presence/location/${locationId}`;

export const leaveRecallRespondApi = (recallId: string): string =>
  `${ATTENDANCE_API_BASE}/leave/recall/${recallId}/respond`;
