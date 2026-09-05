import { SALARY_COVERAGE_MAX_SCAN_MONTHS } from "@/constants/salary_coverage";

/**
 * Info: (20260905 - Luphia) 「這位員工哪幾個月的薪資單還沒建」（#6774）。
 *
 * ## 這支要回答的問題
 *
 * 薪資承辦人現在沒有辦法知道漏了誰的哪一個月。王小明 3 月到職，帳本裡有
 * 3、4、5、7 月 —— **6 月漏掉了**，而唯一的發現方式是他來問為什麼那個月沒領到錢。
 *
 * 這與「缺信箱」是不同性質的失效：缺信箱按下寄送當場失敗（看得見），
 * 缺整月薪資單則是**什麼都沒發生**。
 *
 * ## 範圍的兩端各有理由
 *
 * - **起點是到職日**：不是帳本最早的紀錄，也不是今年一月。用後兩者的話，
 *   一位這個月才報到的新人會被算成缺前面每一個月。
 * - **終點是上個月**：當月的薪資單本來就還沒到該建的時候。用「這個月」的話，
 *   每一位員工在每個月的月初都會被標成缺漏 —— 一個每月固定誤報一次的提示，
 *   使用者很快就會學會忽略它。
 *
 * ## 三種「本來就不該有」要扣掉
 *
 * 離職之後、到職之前、留職停薪期間。少扣任何一種都是誤報，而誤報的提示
 * 比沒有提示更糟 —— 使用者會拿它去推理（#6742 的教訓）。
 *
 * ## 為什麼是純函式
 *
 * 本專案的測試不 render React。逐月展開、跨年、到職當月、離職當月、
 * 留職停薪的邊界這些分支，留在元件裡就只能靠手動點過。
 */

/** Info: (20260905 - Luphia) 一個年月。`month` 是 1–12，不是 `Date` 的 0–11 */
export interface ISalaryPeriod {
  year: number;
  month: number;
}

export interface ISalaryCoverageInput {
  /** Info: (20260905 - Luphia) epoch 秒；沒有到職日就算不出範圍（見下方早退） */
  hireDate: number | null;
  resignDate: number | null;
  leaveStartDate: number | null;
  leaveEndDate: number | null;
  /** Info: (20260905 - Luphia) 這位員工**已經有**薪資紀錄的月份 */
  existing: readonly ISalaryPeriod[];
  /** Info: (20260905 - Luphia) 「今天」——由呼叫端注入，純函式才測得住 */
  nowMs: number;
}

/**
 * Info: (20260905 - Luphia) 年月轉成一個可比較、可相減的整數（西元年 × 12 + 月）。
 *
 * 用它而不是 `Date` 做逐月推進：`new Date(y, m + 1, 1)` 在跨年與月底
 * （1/31 加一個月）都有陷阱，而這裡只需要「第幾個月」這個序數。
 */
const toOrdinal = (period: ISalaryPeriod): number =>
  period.year * 12 + (period.month - 1);

const fromOrdinal = (ordinal: number): ISalaryPeriod => ({
  year: Math.floor(ordinal / 12),
  month: (ordinal % 12) + 1,
});

/**
 * Info: (20260905 - Luphia) epoch 秒 → 年月序數，**一律 UTC**。
 *
 * 用 `getUTCFullYear` / `getUTCMonth` 而不是本地時間：到職日存的是
 * `Date.UTC(y, m, d)`（見 `composeJoinLeaveDates`），用本地時間讀回來
 * 會在 UTC 以西的時區差一天 —— 而月初到職的人會因此差一整個月。
 * 這與 `salary_employee_profile.ts` 的 `dayInMonth` 是同一條理由。
 */
const ordinalOf = (unixSeconds: number): number => {
  const date = new Date(unixSeconds * 1000);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};

/**
 * Info: (20260905 - Luphia) 缺少薪資紀錄的月份，由舊到新。
 *
 * @returns 空陣列 = 完整（或算不出範圍）。呼叫端據此決定要不要標示。
 */
export const missingSalaryPeriods = (
  input: ISalaryCoverageInput,
): ISalaryPeriod[] => {
  /**
   * Info: (20260905 - Luphia) 沒有到職日就**不下結論**。
   *
   * 那一欄可空（`SalaryCalculatorEmployee.hireDate`），舊資料多半沒有。
   * 猜一個起點（帳本最早的紀錄、或今年一月）會讓那些員工全部被標成
   * 缺一大片 —— 而真相是「我們不知道他什麼時候到職」。
   * 不知道就不要說，這與 `resolveSendTarget` 在名單沒問完時的處置同一條。
   */
  if (input.hireDate === null) return [];

  const start = ordinalOf(input.hireDate);

  // Info: (20260905 - Luphia) 終點是上個月，且不早於起點（當月到職的人回空）
  const lastMonth = ordinalOf(Math.floor(input.nowMs / 1000)) - 1;

  /**
   * Info: (20260905 - Luphia) 離職之後不算。離職**當月**仍要算 ——
   * 那個月他有上班、有薪水，只是不滿月。
   */
  const end =
    input.resignDate === null
      ? lastMonth
      : Math.min(lastMonth, ordinalOf(input.resignDate));

  if (end < start) return [];

  /**
   * Info: (20260905 - Luphia) 上限是**必要**的，不是防禦性裝飾。
   *
   * 一筆到職日被誤填成 1990 年的資料會讓這個迴圈跑三百多圈；
   * 而員工列表會對名單上每一位都呼叫一次。超過上限就不下結論
   *（回空），而不是回一個截斷的清單 —— 截斷的清單會讓畫面說
   * 「缺這 120 個月」，那句話既沒用也不對。
   */
  if (end - start + 1 > SALARY_COVERAGE_MAX_SCAN_MONTHS) return [];

  const covered = new Set(input.existing.map(toOrdinal));

  /**
   * Info: (20260905 - Luphia) 留職停薪的區間也要扣掉。
   * `leaveEndDate` 為 null = 還沒復職，扣到範圍的終點為止。
   */
  const leaveStart =
    input.leaveStartDate === null ? null : ordinalOf(input.leaveStartDate);
  const leaveEnd =
    input.leaveEndDate === null ? end : ordinalOf(input.leaveEndDate);

  const onLeave = (ordinal: number): boolean =>
    leaveStart !== null && ordinal >= leaveStart && ordinal <= leaveEnd;

  const missing: ISalaryPeriod[] = [];
  for (let ordinal = start; ordinal <= end; ordinal += 1) {
    if (covered.has(ordinal)) continue;
    if (onLeave(ordinal)) continue;
    missing.push(fromOrdinal(ordinal));
  }

  return missing;
};
