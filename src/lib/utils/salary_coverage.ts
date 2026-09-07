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
 * - **起點是「到職日」與「帳本引入使用的月份」兩者中較晚的那一個**：
 *   到職日決定這個人從哪個月開始有薪水，帳本的起用月份決定這個系統
 *   從哪個月開始有可能存在薪資單。少了後者，一位 2015 年到職的同仁
 *   在一本 2026 年才建立的帳裡會被算成缺一百三十幾個月 —— 而那些月份的
 *   薪資單本來就不在這個系統裡，也永遠不會有（產品決策 20260907）。
 *   不用「帳本最早的一筆薪資紀錄」當起點：那會在**真的整段忘記建**的時候
 *   把缺漏藏起來（一本 2025 全年漏建的帳，起點會落在 2026），
 *   而那是漏報的方向，比誤報糟得多。
 * - **終點是上個月**：當月的薪資單本來就還沒到該建的時候。用「這個月」的話，
 *   每一位員工在每個月的月初都會被標成缺漏 —— 一個每月固定誤報一次的提示，
 *   使用者很快就會學會忽略它。
 *
 * ## 三種「本來就不該有」要扣掉
 *
 * 離職之後、到職之前、留職停薪期間。少扣任何一種都是誤報，而誤報的提示
 * 比沒有提示更糟 —— 使用者會拿它去推理（#6742 的教訓）。
 *
 * 三種都以**月**為單位，而判準是同一條：**那個月有沒有上班日**。
 * 到職月、離職月、留停起月、復職月都有上班日，所以四者都照算 ——
 * 不滿月的薪水仍然是薪水。
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
  /**
   * Info: (20260907 - Julian) 帳本引入使用的時間，epoch 秒 —— 起算的下限。
   *
   * 今天的來源是 `AccountBook.createdAt`：帳本還不存在的月份不可能有薪資單，
   * 所以這個下限**不會藏起任何真實的缺漏**（與「帳本最早的一筆紀錄」不同，
   * 那個會）。若日後要精準對齊「我們從 X 年 X 月開始用薪資功能」，
   * 換掉這一格的來源就好，這支函式不必改。
   *
   * `null` = 沒有下限（讀不到帳本）。那時退回只看到職日 —— 不下結論比
   * 猜一個下限好，而猜錯的方向會是漏報。
   */
  bookCreatedAt: number | null;
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

  /**
   * Info: (20260907 - Julian) 起點取「到職日」與「帳本引入使用」兩者中**較晚**的。
   *
   * 兩個下限問的是不同的事，而缺漏必須同時越過兩道才算數：
   *
   * - 到職日之前他還沒來上班 —— 那幾個月**不該**有薪資單
   * - 帳本建立之前這個系統還不存在 —— 那幾個月**不可能**有薪資單
   *
   * 第二道少了的話，中途導入的帳本會在有人補上到職日的那一刻冒出上百個月，
   * 而那份清單一個都補不了（那些月份的薪水發生在這個系統之外）。
   * 一個沒有人做得完的待辦清單，使用者只會學會忽略它，
   * 連同真正該補的那一個月一起（檢查清單 §1.10：會亂叫的驗收沒有人會再看它）。
   */
  const start =
    input.bookCreatedAt === null
      ? ordinalOf(input.hireDate)
      : Math.max(ordinalOf(input.hireDate), ordinalOf(input.bookCreatedAt));

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
   *
   * Info: (20260907 - Julian) 加上帳本的下限之後，這一道在生產環境**幾乎碰不到**：
   * `AccountBook.createdAt` 是 `@default(now())`，離譜的到職日會先被下限夾住。
   * 留著是因為它現在守的是另一件事 —— 種子資料或匯入把 `createdAt` 寫成很早的
   * 日期時，這裡仍然不會吐出一份幾百個月的清單。判準跟著換了主詞，
   * 所以測試也跟著換（見 `salary_coverage.tz.test.ts` 的「上限」那一組）。
   */
  if (end - start + 1 > SALARY_COVERAGE_MAX_SCAN_MONTHS) return [];

  const covered = new Set(input.existing.map(toOrdinal));

  /**
   * Info: (20260905 - Luphia) 留職停薪的區間也要扣掉，而**起訖當月照算**。
   *
   * ## 規則只有一條：那個月有沒有上班日
   *
   * 這與到職月、離職月是同一條規則 —— 8/20 到職的人八月有薪水（12 天），
   * 8/20 離職的人八月也有薪水（20 天）。8/20 起留停的人，八月上了 19 天班，
   * 一樣該有一張八月的薪資單。
   *
   * 這一段原本寫成 `>= leaveStart && <= leaveEnd`，把起訖兩個月整月扣掉
   * （review 阻-1）。後果是**漏報**：中途留停的人，起訖兩個月各有一次
   * 漏建薪資單不會被標示的機會 —— 而那正是這個功能存在的理由。
   *
   * ## 兩端各差一個月，理由不同
   *
   * - **起日**：`leaveStartDate` 是留停的第一天。不是 1 號的話，那個月
   *   前面幾天他還在上班 —— 從**下個月**才開始扣。
   * - **復職日**：`leaveEndDate` 是回來上班的第一天（欄位標籤就是「復職日」），
   *   所以那個月一定有上班日，一律扣到**前一個月**為止。
   *
   * 兩者相減之後 `leaveStart > leaveEnd` 是完全正常的狀態，代表
   * 「整段留停都落在同一個月裡」（例如 8/5 留停、8/20 復職）——
   * 那個月八月照樣要有薪資單，`onLeave` 對每一個月都回 false，正是要的結果。
   */
  const dayOfMonth = (unixSeconds: number): number =>
    new Date(unixSeconds * 1000).getUTCDate();

  const leaveStart =
    input.leaveStartDate === null
      ? null
      : ordinalOf(input.leaveStartDate) +
        (dayOfMonth(input.leaveStartDate) > 1 ? 1 : 0);

  /**
   * Info: (20260905 - Luphia) `null` = 還沒復職 —— 扣到範圍的終點為止。
   * 這與「復職日在未來」不同：後者有日期，照樣是 `復職月 - 1`。
   */
  const leaveEnd =
    input.leaveEndDate === null ? end : ordinalOf(input.leaveEndDate) - 1;

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
