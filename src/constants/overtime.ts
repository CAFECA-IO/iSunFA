/**
 * Info: (20260817 - Julian) 加班管理的共用常數。
 *
 * 與 `leave_policy.ts` 分開：加班的事實來自打卡，額度的事實來自帳本，
 * 兩者只在「補休換算」這一個點相接（`LeaveGrant.overtimeSegmentId`）。
 * 合併會讓加成級距與假別設定互相 import，而它們沒有共同的變動理由。
 *
 * enum 刻意不從 `@/generated` 匯入，同步由 `src/__tests__/hr_enum_mirror.test.ts` 保證。
 * 本檔的四個 enum 全部有 schema 對應物，須登記在該測試的 `MIRRORED`，
 * 並把本檔登記進 `CONSTANT_MODULES`。
 *
 * 決策脈絡見
 * `documents/architecture/decisions/024_overtime_recognition_premium_tiers_and_module_boundary.md`。
 */

// Info: (20260817 - Julian) 加班申請的時序型態，對齊 Prisma enum OvertimeFilingType
export enum OvertimeFilingType {
  // Info: (20260817 - Julian) 事前申請：createdAt 須早於該日班別的 windowStartMinute
  ADVANCE = "ADVANCE",
  // Info: (20260817 - Julian) 事後補單
  POST_HOC = "POST_HOC",
}

/**
 * Info: (20260817 - Julian) 加班的歸戶方式，對齊 Prisma enum OvertimeCompensationMode。
 *
 * 勞動基準法 §32-1 要求由**勞工**選擇，不是雇主指定 ——
 * 因此這個欄位在申請單上由員工填，核准者不得變更（變更須退回重送）。
 *
 * ToDo: (20260821 - Julian) **U8：`PAYMENT ⇄ COMPENSATORY_LEAVE` 互轉未實作。**
 *
 * ADR 024 §5.3 與計畫書 D12 都要求它，而目前**完全不存在**
 * （無 endpoint、無 service、無 validator、無 UI）。
 *
 * 上面那句「變更須退回重送」目前也走不通：退回重送要先能撤銷核准
 * （`revokeApproval` 已有，但沒有 UI —— 見 U9），而已核准的加班單
 * 在簽核頁上根本顯示不出來。
 */
export enum OvertimeCompensationMode {
  PAYMENT = "PAYMENT",
  COMPENSATORY_LEAVE = "COMPENSATORY_LEAVE",
}

/**
 * Info: (20260817 - Julian) 加班時數的佐證來源，對齊 Prisma enum OvertimeEvidenceBasis。
 *
 * `MANUAL_DECLARATION` 仍然認列，但強制走完整簽核鏈，且在統計端點與
 * 有打卡佐證者**分開統計** —— 勞動檢查會問「有多少加班沒有出勤紀錄佐證」，
 * 而一個答不出這題的系統等於默認全部都是。
 */
export enum OvertimeEvidenceBasis {
  PUNCH_RECORD = "PUNCH_RECORD",
  MANUAL_DECLARATION = "MANUAL_DECLARATION",
}

/**
 * Info: (20260817 - Julian) 法定加成級距，對齊 Prisma enum OvertimePremiumTier。
 *
 * ToDo: (20260817 - Julian) §24 平日用「加給三分之一」（發給 4/3），休息日用
 * 「**另再**加給一又三分之一」（發給 7/3）。下方 `OVERTIME_PREMIUM` 以
 * **加給倍率**為準，但此換算陳述待法務複核 —— 差一個「另再」就差一倍工資。
 */
export enum OvertimePremiumTier {
  // Info: (20260817 - Julian) 上班日延長前 2 小時（§24 I ①）
  WEEKDAY_FIRST_2H = "WEEKDAY_FIRST_2H",
  // Info: (20260817 - Julian) 上班日再延長（§24 I ②）
  WEEKDAY_BEYOND_2H = "WEEKDAY_BEYOND_2H",
  // Info: (20260817 - Julian) 休息日前 2 小時（§24 II ①）
  REST_DAY_FIRST_2H = "REST_DAY_FIRST_2H",
  // Info: (20260817 - Julian) 休息日 2 小時後（§24 II ②）
  REST_DAY_BEYOND_2H = "REST_DAY_BEYOND_2H",
  // Info: (20260817 - Julian) 休假日經同意出勤，工資加倍發給（§39）
  HOLIDAY_DOUBLE = "HOLIDAY_DOUBLE",
  // Info: (20260817 - Julian) 天災事變等，加倍發給（§24 I ③、§32 IV）
  EMERGENCY_DOUBLE = "EMERGENCY_DOUBLE",
}

// Info: (20260817 - Julian) 加班單狀態，對齊 Prisma enum OvertimeRequestStatus
export enum OvertimeRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
}

/**
 * Info: (20260817 - Julian) 加班的異常型別。**沒有 schema 對應物**，
 * 由打卡與加班單比對推導，登記於 `hr_enum_mirror.test.ts` 的 `UI_ONLY`。
 *
 * 未核准的加班是勞資爭議最常見的起點。系統若只是把它丟掉，事實仍然存在於
 * `AttendancePunch` 裡 —— 只是沒有人看見，而勞動檢查看得見。
 */
export enum OvertimeExceptionType {
  // Info: (20260817 - Julian) 有打卡停留但無核准加班單，或超出核准分鐘的部分
  UNAPPROVED_OVERTIME = "UNAPPROVED_OVERTIME",
  // Info: (20260817 - Julian) 有核准加班單但無對應打卡（走 MANUAL_DECLARATION 前的待處理狀態）
  MISSING_PUNCH_EVIDENCE = "MISSING_PUNCH_EVIDENCE",
}

/**
 * Info: (20260817 - Julian) 加成倍率，以整數分子分母表示。
 *
 * **嚴禁寫成 `0.333`。** 這些倍率最終會乘上工資變成錢，浮點在這裡沒有立足之地
 * —— 理由與 CLAUDE.md §2 禁止用原生 number 做財務運算同源。
 * 本模組不做這個乘法（金額屬薪資模組），但它必須把一個**可以無誤差相乘**的
 * 東西交給薪資模組。
 *
 * `HOLIDAY_DOUBLE` / `EMERGENCY_DOUBLE` 的「加倍發給」語意是**再給一份工資**，
 * 故加給倍率為 1/1，而非 2/1 —— 這個區分寫在型別裡看不出來，只能靠這行註解，
 * 以及 `overtime_rules.test.ts` 的斷言。
 */
export interface IOvertimePremiumRatio {
  readonly numerator: number;
  readonly denominator: number;
}

export const OVERTIME_PREMIUM: Record<
  OvertimePremiumTier,
  IOvertimePremiumRatio
> = {
  [OvertimePremiumTier.WEEKDAY_FIRST_2H]: { numerator: 1, denominator: 3 },
  [OvertimePremiumTier.WEEKDAY_BEYOND_2H]: { numerator: 2, denominator: 3 },
  [OvertimePremiumTier.REST_DAY_FIRST_2H]: { numerator: 4, denominator: 3 },
  [OvertimePremiumTier.REST_DAY_BEYOND_2H]: { numerator: 5, denominator: 3 },
  [OvertimePremiumTier.HOLIDAY_DOUBLE]: { numerator: 1, denominator: 1 },
  [OvertimePremiumTier.EMERGENCY_DOUBLE]: { numerator: 1, denominator: 1 },
};

// Info: (20260817 - Julian) 級距切換的邊界：延長工時滿 2 小時後改用較高的加成（§24 I、§24 II）
export const OVERTIME_TIER_BOUNDARY_MINUTES = 120;

/**
 * Info: (20260817 - Julian) 法定工時上限。**這些是護欄不是提示** ——
 * 越過它們的輸入不是「需要人判斷的例外」，是違法，依 CLAUDE.md §6 在 Service 開頭 throw。
 *
 * 一律以分鐘表示，與 `ShiftPattern` 及帳本同型別同語意（整數計數，非金融量）。
 */
// Info: (20260817 - Julian) 正常工時加計延長工時，一日不得超過 12 小時（§32 II）
export const OVERTIME_DAILY_TOTAL_LIMIT_MINUTES = 12 * 60;

// Info: (20260817 - Julian) 延長工時一個月不得超過 46 小時（§32 II）
export const OVERTIME_MONTHLY_LIMIT_MINUTES = 46 * 60;

/**
 * Info: (20260817 - Julian) 經工會同意，事業單位無工會者經勞資會議同意，
 * 得延長至一個月 54 小時、每三個月 138 小時（§32 III）。
 *
 * 放寬的前提是**有記載的同意**：`OvertimePolicy.extendedLimitAgreed` 為真時，
 * `agreementRecordUrl` 與 `agreedAt` 必填，由 repository 不變式擋。
 * 一個沒有記載的「已同意」等於沒有同意，而系統會據此多放 8 小時。
 */
export const OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES = 54 * 60;
export const OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES = 138 * 60;

/**
 * Info: (20260817 - Julian) 「每三個月」的區間定義。
 *
 * ToDo: (20260817 - Julian) 條文未明是滾動三個月或曆季，待法務複核。
 * 在核對完成前採**滾動三個月**（較嚴）：保守的方向若日後證明過嚴，
 * 改動是放寬；反過來則要追溯已核准的加班並重算工資。
 */
export const OVERTIME_QUARTERLY_WINDOW_IS_ROLLING = true;

// Info: (20260817 - Julian) 加班事由長度上限。與 LEAVE_REASON_MAX_LENGTH 對齊
export const OVERTIME_REASON_MAX_LENGTH = 200;

/**
 * Info: (20260819 - Julian) §32 IV 報備紀錄連結的長度上限（review B7）。
 *
 * 收「連結」而不是「文號」：報備的形式各家不同（工會的簽收回條、
 * 主管機關的線上申辦收件編號、掃描的公文 PDF），要求一個固定格式的文號
 * 會逼出一堆填 `N/A` 的紀錄 —— 而一個填了 `N/A` 的必填欄位，
 * 比沒有這個欄位更糟：它看起來像有記載。
 * ToDo: (20260819 - Julian) 檔案上傳接上之後，這一欄應可指向站內的附件。
 */
export const OVERTIME_EMERGENCY_REPORT_URL_MAX_LENGTH = 500;

/**
 * Info: (20260818 - Julian) 補休批次的冪等鍵格式（§32-1 一段一批）。
 *
 * 以分段 id 組鍵：一個 `OvertimeSegment` 最多換出一筆補休批次，
 * 而 `LeaveGrant.overtimeSegmentId` 本身就是 `@unique` —— 這條鍵是帳本那一側的
 * 同一個保證，讓重送的核准撞在唯一鍵而不是安靜地多記一筆額度。
 */
export const buildOvertimeGrantIdempotencyKey = (
  overtimeSegmentId: string,
): string => `overtime-grant:${overtimeSegmentId}`;

/**
 * Info: (20260821 - Julian) 撤銷核准的**反向分錄**冪等鍵（review 第 8 輪第 1 條）。
 *
 * ## 為什麼鍵裡一定要有撤銷次數
 *
 * 撤銷不刪帳本，而是補一筆負向 `ADJUST` 把該批餘額歸零（ADR 022 §2.4）。
 * 同一張單可以被撤銷不只一次：撤銷 → 重新核准 → 再撤銷。若鍵只由分段 id
 * 組成，第二次撤銷會撞上 `idempotencyKey` 的唯一鍵而**被當成重放** ——
 * 那一次撤銷是真的，帳本卻會少一筆反向分錄，`Σ(deltaMinutes)` 與
 * `LeaveBalance` 就此分岔，而 ADR 022 §2.3 的守恆勾稽會在幾小時後才發現。
 *
 * 次數取自 `OvertimeRequest.approvalRevokeCount`，而它在撤銷那次**附條件更新
 * 的同一個 `data` 裡遞增** —— 兩者因此是同一個原子動作的兩面，不會出現
 * 「鍵已經用過但次數還沒加」的中間狀態。
 *
 * 分段 id 仍然在鍵裡：重新核准會產生新的分段，而反向分錄要指得回被撤銷的那一批。
 */
/**
 * Info: (20260821 - Julian) 反向分錄的 `reason`。
 *
 * `LeaveGrant.reason` 的註解說「一筆沒有理由的額度調整，事後沒有人能判斷它
 * 合不合理」—— 分錄這一側同理。寫成常數而不是在呼叫端拼字串：
 * L10 的帳本畫面要認得出這一種調整，而認字串就必須是同一份字串。
 */
export const OVERTIME_APPROVAL_REVOKED_REASON =
  "overtime approval revoked; compensatory grant reversed";

export const buildOvertimeRevokeIdempotencyKey = (
  overtimeSegmentId: string,
  revokeCount: number,
): string => `overtime-revoke:${overtimeSegmentId}:${revokeCount}`;

/**
 * Info: (20260818 - Julian) 滾動三個月窗的月數。與 `OVERTIME_QUARTERLY_WINDOW_IS_ROLLING`
 * 是同一個決定的兩面：那個布林說「用滾動的」，這個數字說「滾多長」。
 */
export const OVERTIME_QUARTERLY_WINDOW_MONTHS = 3;

/**
 * Info: (20260818 - Julian) 依「有無記載的同意」算出兩條可設定的上限（§32 II、III）。
 *
 * 放在常數檔而不是某一支 service：統計端點、政策端點與引擎都要回答
 * 「這個帳本的上限是幾小時」，各自寫一次 `agreed ? 54 : 46` 就會有一天
 * 只改到其中一處，而症狀是同一個帳本在兩個畫面上有兩條不同的線。
 *
 * 未同意時三個月的上限回 `null` —— 那不是「無限大」，是這條線不適用：
 * 每月 46 小時本身就讓三個月不可能超過 138 小時。
 */
export const overtimeLimitsOf = (
  extendedLimitAgreed: boolean,
): { monthlyMinutes: number; quarterlyMinutes: number | null } => ({
  monthlyMinutes: extendedLimitAgreed
    ? OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES
    : OVERTIME_MONTHLY_LIMIT_MINUTES,
  quarterlyMinutes: extendedLimitAgreed
    ? OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES
    : null,
});

/**
 * Info: (20260818 - Julian) 加成級距的 i18n key。
 *
 * 與 `LEAVE_POLICY_I18N_KEY` 同型：級距是 enum（六個法定值，不會由租戶新增），
 * 因此可以寫死對照而不必像假別那樣回退到資料庫的名稱。
 * 新增成員時五個語系都要補，由 `i18n_keys.test.ts` 掃描守著。
 */
export const OVERTIME_TIER_I18N_KEY: Record<OvertimePremiumTier, string> = {
  [OvertimePremiumTier.WEEKDAY_FIRST_2H]:
    "hr_management.overtime.tier_weekday_first_2h",
  [OvertimePremiumTier.WEEKDAY_BEYOND_2H]:
    "hr_management.overtime.tier_weekday_beyond_2h",
  [OvertimePremiumTier.REST_DAY_FIRST_2H]:
    "hr_management.overtime.tier_rest_day_first_2h",
  [OvertimePremiumTier.REST_DAY_BEYOND_2H]:
    "hr_management.overtime.tier_rest_day_beyond_2h",
  [OvertimePremiumTier.HOLIDAY_DOUBLE]:
    "hr_management.overtime.tier_holiday_double",
  [OvertimePremiumTier.EMERGENCY_DOUBLE]:
    "hr_management.overtime.tier_emergency_double",
};
