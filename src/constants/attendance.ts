/**
 * Info: (20260813 - Julian) 簽到系統的共用常數。
 *
 * ## 與 `Checkin` 的關係：沒有關係
 *
 * `prisma/schema.prisma` 既有的 `model Checkin` 是**使用者每日登入簽到**
 * （原本會發點數，20260809 起僅保留登入紀錄），它帶著 `position` / `ip` / `device`
 * 三個欄位，看起來極像打卡 —— 但與員工出勤毫無關係。
 * 本模組一律使用 `Attendance*` 前綴，絕不觸碰那張表。
 *
 * ## enum 鏡像的處理
 *
 * 與 `hr_management.ts` 同一個理由：刻意不從 `@/generated` 匯入 ——
 * 那份 client 會把 Node 端相依拉進 client component 的 bundle，而前端只需要
 * 「字串長什麼樣」。同步由 `src/__tests__/hr_enum_mirror.test.ts` 機械化保證：
 *
 * - `PunchType` / `PunchVerification` / `WorkDayType` 有對應的 schema enum → 登記在 `MIRRORED`
 * - `ShiftPatternKind` / `AttendanceDayStatus` / `AttendanceExceptionType` / `PresenceStatus`
 *   在 demo 版**沒有** schema 對應物 → 登記在 `UI_ONLY`
 *   （前者是刻意的衍生值，見 `ShiftPatternKind` 的說明；後三者是因為 demo
 *   不落地判定結果與現場狀態，改為讀取時即時計算）
 */

// Info: (20260813 - Julian) 打卡類型，對齊 Prisma enum PunchType
export enum PunchType {
  CLOCK_IN = "CLOCK_IN",
  CLOCK_OUT = "CLOCK_OUT",
}

/**
 * Info: (20260813 - Julian) 打卡的定位證據來源，對齊 Prisma enum PunchVerification。
 *
 * Demo 只產生 `GPS`，但三個值一次定義完：之後補上網段驗證與補打卡時，
 * 加的是資料不是欄位型別，不需要 migration 改 enum。
 */
export enum PunchVerification {
  GPS = "GPS",
  NETWORK = "NETWORK",
  CORRECTION = "CORRECTION",
}

/**
 * Info: (20260813 - Julian) 排班日的性質，對齊 Prisma enum WorkDayType。
 *
 * ToDo: (20260813 - Julian) 工程場景需要 `SUSPENDED`（因雨／颱風／災害停工）。
 * 那既不是例假、不是休息日、不是國定假日，也不是個人請假 ——
 * 它是機關單方面免除當日出勤義務，而且在工程業是常態不是例外。
 * Demo 暫借 `HOLIDAY`（對判定引擎的效果相同），但正式版會讓
 * 「今年停工幾天」與「今年國定假日幾天」混在同一個值裡，
 * 而前者是工期展延與契約計價的依據。
 */
export enum WorkDayType {
  WORK = "WORK",
  REGULAR_OFF = "REGULAR_OFF",
  REST_DAY = "REST_DAY",
  HOLIDAY = "HOLIDAY",
  LEAVE = "LEAVE",
}

// Info: (20260813 - Julian) 單日出勤判定的總結狀態。判定引擎的輸出，DB 沒有這個欄位
export enum AttendanceDayStatus {
  NORMAL = "NORMAL",
  EXCEPTION = "EXCEPTION",
  NO_SCHEDULE = "NO_SCHEDULE",
  OFF_DAY = "OFF_DAY",
}

/**
 * Info: (20260813 - Julian) 出勤異常型別。
 *
 * 一天可以同時成立多項（例如遲到又工時不足），因此判定引擎回傳的是**清單**
 * 而不是單一狀態 —— 壓成一個欄位會逼出「哪個異常比較重要」這個沒有答案的問題。
 *
 * `SUSPICIOUS_JUMP` 定義在此但 demo 不產生：它需要瞬移偵測（護欄 G5），
 * 而 demo 未實作。列出來是為了讓「demo 涵蓋 12 條判定中的 11 條」這件事
 * 在型別上看得見，而不是靠文件記著。
 *
 * 刻意**沒有** `OUT_OF_FENCE`：圍欄外的打卡在 API 層就被 403 擋掉，
 * 永遠不會成為一筆待判定的紀錄。留著它會讓人以為系統允許那種紀錄存在。
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

/**
 * Info: (20260813 - Julian) 班別制度。**衍生值，資料庫沒有這個欄位。**
 *
 * 固定班表就是「彈性窗收縮到與核心時間重合」的彈性班表：
 *   朝九晚六   = 窗 09:00–18:00、核心 09:00–18:00
 *   核心 10–16 = 窗 07:00–22:00、核心 10:00–16:00
 *
 * 型別由值決定（見 `deriveShiftPatternKind`），存一個可以與那六個欄位矛盾的
 * 判別欄位，它唯一能做的事就是說謊。慣例同 `hr_management.ts` 的
 * `ProcessTaskType` —— 由 service 依資料算出、供畫面標示，**不可寫回資料庫**。
 */
export enum ShiftPatternKind {
  FIXED = "FIXED",
  FLEXIBLE = "FLEXIBLE",
}

/**
 * Info: (20260813 - Julian) 現場在班狀態。**計算值，demo 版不落地。**
 *
 * `STALE` 的語意是「**我不知道他在不在**」，不是「他不在」——
 * 打了上班卡、過了該下班的時間卻沒有下班卡，系統無從得知人走了沒。
 * 因此 `STALE` 的人**不從現場名單移除**：他們恰恰是緊急點名時要優先確認的對象。
 */
/**
 * Info: (20260813 - Julian) 一個工作日相對於「現在」的階段。**沒有 schema 對應物。**
 *
 * ## 為什麼判定結果還需要這個
 *
 * 引擎的 `NORMAL` 意思是「目前查不到異常」—— 對一個**還沒開始**的工作日，
 * 它回的也是 `NORMAL`（判定表 #5：窗迄未過不判曠職）。前端若照 status 上色，
 * 下個月的每一格都會是綠的，而那是系統對一個尚未發生的日子宣稱
 * 「這天正常出勤」。零捏造在這裡的具體形狀，就是那些格子必須留白。
 *
 * ## 為什麼由伺服器算，而不是讓前端拿日期比今天
 *
 * 邊界不是「日曆日換日」，是**該班別的窗迄加寬限** —— 夜間施工班的
 * 8/12 要到 8/13 清晨 05:03 才結束。只有算過那一格的人知道它在哪裡；
 * 讓前端自己比日期，夜班那一列每天都會早八小時變色。
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
 *
 * ## 為什麼不直接拿 AttendanceDayStatus 上色
 *
 * 一天可以同時成立多種異常（遲到 + 工時不足），而 `status` 只會說 `EXCEPTION`。
 * 要在一格裡表達，就得先選出**主導的那一種** —— 那是一個顯示決策
 * （哪一種異常先講），不是判定結果，所以它是自己的型別而不是 status 的別名。
 *
 * ## 為什麼 PENDING 與 NO_SCHEDULE 分開
 *
 * 兩者畫面上都接近留白，意思卻相反：`NO_SCHEDULE` 是「這天沒有出勤義務可比」，
 * `PENDING` 是「這天有義務、但還沒過完，現在下任何結論都太早」。
 * 壓成同一個，演示時就答不出「為什麼今天那一格是空的」。
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

export enum PresenceStatus {
  ON_SITE = "ON_SITE",
  STALE = "STALE",
}

/**
 * Info: (20260813 - Julian) 一天的分鐘數。
 *
 * 班別時刻一律以「當地當日 00:00 起算的分鐘數」表示，`>= 1440` 即次日 ——
 * 夜間施工班 20:00→次日 05:00 就是 1200→1740。跨日不需要任何特殊欄位或旗標，
 * 這個約定本身就是全部的機制。
 *
 * 用 Int 而不是 DateTime：「09:00」是時刻概念不是時間點，用 DateTime 會被迫
 * 綁一個沒有意義的日期，而那個日期會在時區轉換時產生真實的偏移。
 */
export const MINUTES_PER_DAY = 1440;

/**
 * Info: (20260813 - Julian) ===== 以下為 Demo 期間的參數 =====
 *
 * 正式版這些值屬於帳本層級的 `AttendancePolicy`（一帳本一筆）。
 * Demo 不建那張表，改為常數 —— 復原成本低，且 demo 只有一個帳本。
 */

/**
 * Deprecated: (20260813 - Julian) Demo 期間的圍欄半徑。
 *
 * 母計畫 §D6 要求正式上線前**實地量測**每個地點的 GPS 漂移範圍。
 * 500 公尺對橋梁工區、廠站等點狀設施接近可用值，但對辦公室過寬
 * （等於「在對面咖啡廳也算到班」），會讓「圍欄即到班定義」的立場失效。
 * 接上 AttendancePolicy 與實測值後移除。
 */
export const DEMO_GEOFENCE_RADIUS_METERS = 500;

/**
 * Info: (20260813 - Julian) 定位精度上限（護欄 G3）。
 *
 * 超過此值視為證據品質不足以判定，拒收並請使用者重試 ——
 * 錯誤訊息必須是「定位精度不足，請重試」而不是「你不在現場」：
 * 前者是「還無法判定他到了」，後者是「判他沒到」，對員工的意義完全不同。
 */
export const DEMO_MAX_ACCURACY_METERS = 200;

// Info: (20260813 - Julian) 遲到寬限：走到定點掏出手機的合理時間
export const DEMO_LATE_GRACE_MINUTES = 5;

// Info: (20260813 - Julian) 早退寬限，語意同上
export const DEMO_EARLY_LEAVE_GRACE_MINUTES = 5;

/**
 * Info: (20260813 - Julian) 判定「漏打下班卡」的寬限（自班別窗迄起算）。
 *
 * **與 `DEMO_PRESENCE_STALE_MINUTES` 刻意分成兩個常數，即使 demo 兩者同值。**
 * 兩者回答的是不同的問題（見母計畫 §D10.3）：
 *
 * - 這一個服務於**工時計算**：判太早會讓還在收拾東西的人被記一筆異常，
 *   因此寧可晚一點判定。
 * - `DEMO_PRESENCE_STALE_MINUTES` 服務於**安全**：現場名單寧可早一點
 *   承認「我不知道這個人還在不在」，讓人去確認。
 *
 * 合成一個常數，等於假設安全與工時計算要的是同一個數字 —— 那是錯的。
 */
export const DEMO_MISSING_CLOCK_OUT_GRACE_MINUTES = 3;

/**
 * Info: (20260813 - Julian) 現場狀態轉為 `STALE` 的寬限（自班別窗迄起算）。
 *
 * 3 分鐘是為了讓演示中看得到狀態轉換。正式環境要依加班文化訂 ——
 * 訂太短會讓整層樓在下班時間後集體變黃，而黃色一旦變成常態就沒人看了。
 */
export const DEMO_PRESENCE_STALE_MINUTES = 3;

/**
 * Info: (20260813 - Julian) Demo 帳本的時區。
 *
 * 判定引擎本身**不碰時區**（見 `attendance_rules.ts` 的檔頭）：
 * 「Date → 當地分鐘數」的換算發生在 service 層，引擎只做整數運算。
 * 這個常數屬於那個換算，不屬於引擎。
 */
export const DEMO_TIME_ZONE = "Asia/Taipei";

/**
 * Deprecated: (20260813 - Julian) Demo 帳本 ID，與種子腳本共用同一份。
 *
 * 正式版帳本由使用者在帳本選單裡挑，前端從 context 拿到當前帳本 ID ——
 * 這個常數屆時整個消失，不是改值。寫在這裡而不是各自 hardcode，
 * 是因為種子腳本與打卡頁若各寫一份，改錯一邊的症狀是
 * 「打卡頁一片空白但資料庫裡明明有資料」，而那極難查。
 */
export const DEMO_ACCOUNT_BOOK_ID = "demo-book-public-works";

/**
 * Info: (20260813 - Julian) 判定結果查詢的區間上限（日曆日，含頭含尾）。
 *
 * A9 的主張是「即時計算、不落地、不需要 Worker」，而那個主張只在**成本有界**時成立：
 * 一個月 × 12 人是 372 次純函數呼叫與兩次查詢。沒有這條上限，同一支端點
 * 用 `from=2000-01-01` 就是 90 萬次呼叫與兩次全表掃描 —— 不是慢，是打掛。
 *
 * 92 天（一季）而不是 31 天：季報是出勤資料真實會被問到的粒度，
 * 訂在月會讓正當需求也踩線，而踩線的護欄很快就會被有人調大。
 */
export const DEMO_ATTENDANCE_MAX_RANGE_DAYS = 92;

/**
 * Info: (20260813 - Julian) 出勤總覽格子的配色。
 *
 * 只用 50 / 100 / 700 這幾階，與 `EMPLOYEE_STATUS_STYLE` 同一條規則 ——
 * 深色主題下 `globals.css` 會把彩色 50–300 階依比例混入頁面底色，
 * 700 階則走中性色盤反轉，兩種主題都不必另外處理。
 *
 * `PENDING` 用虛線框而不是另一種顏色：它要表達的是「還沒有結論」，
 * 而任何一個實色都會被讀成一種結論。
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
 * Info: (20260813 - Julian) 「僅顯示有異常者」的篩選值。
 *
 * 與 `HR_FILTER_ALL` 同一個位置的東西：一個不會與任何 `AttendanceExceptionType`
 * 相撞的哨兵值，讓「全部 / 僅異常 / 某一種異常」共用同一個下拉選單。
 * 三個獨立的控制項會讓使用者要想「這三個是 and 還是 or」，而答案永遠是錯的那個。
 */
export const ATTENDANCE_FILTER_EXCEPTION_ONLY = "__EXCEPTION_ONLY__";

// Info: (20260813 - Julian) 排班日型別的顯示文案，出勤總覽與排班月曆共用
export const WORK_DAY_TYPE_I18N_KEY: Record<WorkDayType, string> = {
  [WorkDayType.WORK]: "hr_management.attendance_result.day_type_work",
  [WorkDayType.REGULAR_OFF]:
    "hr_management.attendance_result.day_type_regular_off",
  [WorkDayType.REST_DAY]: "hr_management.attendance_result.day_type_rest_day",
  [WorkDayType.HOLIDAY]: "hr_management.attendance_result.day_type_holiday",
  [WorkDayType.LEAVE]: "hr_management.attendance_result.day_type_leave",
};

/**
 * Info: (20260813 - Julian) 判定階段的顯示文案。
 *
 * 明細一定要把它印出來 —— 使用者看到一格是空的，第一個問題是「為什麼」，
 * 而「這天還沒過完」與「這天沒有排班」是兩個完全不同的答案。
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
 * Deprecated: (20260813 - Julian) 緊急點名 CSV 的欄位標題（繁中）。
 *
 * 寫死一個語系是 demo 的簡化。正式版應依請求者的語系取字典 ——
 * 這份檔案會被貼進事故調查報告，而報告的語言不該由後端替使用者決定。
 *
 * 放在 constants 而不是 route 裡：它是一組**對外的欄位名**，
 * 改動會影響所有已匯出檔案的可比對性，屬於需要被看見的常數。
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
 *
 * `STALE` 用琥珀色而不是紅色：它不是異常也不是懲罰，是「系統不知道」。
 * 紅色會讓看板上的人以為這幾位有問題，而實際上有問題的是系統的資訊。
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
 * Info: (20260813 - Julian) 排班月曆裡各班別的配色。
 *
 * 依班別在清單中的順序取用（清單以 `code` 排序，因此同一本帳本每次都拿到
 * 同一個顏色）。班別數量超過色盤時會繞回來 —— 兩個班別因此共用一個顏色，
 * 由格子上的簡稱區分，而簡稱的唯一性是**算出來的**（見 `buildShiftLabels`）。
 *
 * 一樣只用 50 / 100 / 700 這幾階，理由同 `EMPLOYEE_STATUS_STYLE`。
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
 * Info: (20260813 - Julian) 非上班日的配色。
 *
 * 與班別的色盤分開：這四種是**語意固定**的（例假就是例假，不隨帳本改變），
 * 而班別是各家自己定的。共用一個色盤會讓「這個顏色是什麼意思」
 * 在不同帳本之間得到不同答案。
 */
export const OFF_DAY_TYPE_STYLE: Record<
  Exclude<WorkDayType, WorkDayType.WORK>,
  string
> = {
  [WorkDayType.REGULAR_OFF]: "bg-gray-200 text-gray-600",
  [WorkDayType.REST_DAY]: "bg-gray-100 text-gray-500",
  [WorkDayType.HOLIDAY]: "bg-red-100 text-red-600",
  [WorkDayType.LEAVE]: "bg-amber-100 text-amber-700",
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
