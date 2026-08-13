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
