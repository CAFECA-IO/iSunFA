import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveDaySegment,
  LeaveGrantSource,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";
import {
  IConsumptionInput,
  IConsumptionResult,
  ICycleComparison,
  IGrantScheduleInput,
  ILeaveAccrualPolicy,
  ILeaveAccrualTier,
  ILeaveAllocation,
  ILeaveUnitInput,
  ILeaveUnitResult,
  IPlannedGrant,
} from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) 額度引擎：純函數，無 DB／I/O，**不呼叫 `Date.now()`**——
 * 「現在」由呼叫端以 `asOfDate` 注入。額度是要拿去對帳的東西，
 * 同一份資料在不同時刻算出不同結果，對帳就沒有意義了。
 *
 * 全程只認整數分鐘（帳本的真相）與有限小數的日數（法定面額）。
 * 時區換算是 service 的職責：進到這裡的每一個日期都已經是政策時區下的 "YYYY-MM-DD"。
 *
 * 決策脈絡見 `documents/architecture/leave_and_overtime_module_plan.md` §6
 * 與 ADR 021、ADR 022。
 */

/**
 * Info: (20260817 - Julian) 規則引擎版本。計算邏輯或門檻語意改變時 +1，並重算受影響區間；
 * 純重構、輸出不變時不要動它，避免製造假訊號。心智模型同 `ATTENDANCE_ENGINE_VERSION`。
 */
export const LEAVE_ENTITLEMENT_ENGINE_VERSION = 1;

/**
 * Info: (20260817 - Julian) 結構性錯誤：呼叫端或設定寫錯，不是使用者輸入錯。
 *
 * 與「額度不足」刻意分開 —— 後者是正常結局，用回傳值表達；
 * 前者代表有人把 `FIXED_MINUTES` 的假別存成 `minimumUnitMinutes = null`，
 * 那是一個必須立刻停下來的狀態，繼續算只會產出一個看起來合理的錯誤數字。
 */
export class LeaveRuleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LeaveRuleError";
  }
}

// Info: (20260817 - Julian) ===== 日期工具（全程 UTC，避免執行環境時區滲入決定性計算）=====

const DAY_MS = 86_400_000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtcDate = (isoDate: string): Date => {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new LeaveRuleError(`Invalid ISO date: ${isoDate}`);
  }
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new LeaveRuleError(`Invalid ISO date: ${isoDate}`);
  }
  return parsed;
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (isoDate: string, days: number): string =>
  toIsoDate(new Date(toUtcDate(isoDate).getTime() + days * DAY_MS));

/**
 * Info: (20260817 - Julian) 加月份並在月底溢位時夾到當月最後一日。
 *
 * 1/31 加一個月是 2/28（或閏年 2/29），不是 3/3。JS 的 `setUTCMonth` 會溢位到下個月，
 * 而「到職滿六個月」若因此跳一天，特休的起算日就錯了。
 */
const addMonths = (isoDate: string, months: number): string => {
  const base = toUtcDate(isoDate);
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();
  const targetMonthIndex = month + months;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, targetMonthIndex + 1, 0),
  ).getUTCDate();
  return toIsoDate(
    new Date(
      Date.UTC(year, targetMonthIndex, Math.min(day, lastDayOfTargetMonth)),
    ),
  );
};

const compareIsoDate = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const daysBetweenInclusive = (fromIso: string, toIso: string): number =>
  Math.round(
    (toUtcDate(toIso).getTime() - toUtcDate(fromIso).getTime()) / DAY_MS,
  ) + 1;

const daysInYear = (year: number): number =>
  (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS;

/**
 * Info: (20260817 - Julian) 兩個日期之間的整月數（未滿一月不計）。
 *
 * 用於年資級距查表。刻意不用「天數 ÷ 30.4」這類近似：
 * 級距的邊界是「滿六個月」「滿一年」，近似值會在邊界前後各差一兩天，
 * 而那一兩天決定了 3 日還是 7 日。
 */
export const monthsBetween = (fromIso: string, toIso: string): number => {
  const from = toUtcDate(fromIso);
  const to = toUtcDate(toIso);
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
};

/**
 * Info: (20260817 - Julian) 無條件進位到指定小數位。
 *
 * 浮點的 `Math.ceil(x * 100) / 100` 在 `1.005` 這類值上會失準，
 * 故先四捨五入到「比目標多四位」再進位 —— 這是把二進位表示誤差擋在門外的標準手法。
 * 額度的日數最終會乘上工資變成錢，不容許一個因表示誤差而少給的結果。
 */
export const ceilToScale = (value: number, scale: number): number => {
  if (scale < 0) throw new LeaveRuleError(`Invalid scale: ${scale}`);
  const factor = 10 ** scale;
  const guarded = Number((value * factor).toPrecision(12));
  return Math.ceil(guarded) / factor;
};

// Info: (20260817 - Julian) ===== 單位換算 =====

/**
 * Info: (20260817 - Julian) 把一段請假時間換算成分鐘。
 *
 * ## 「半天」不是 240 分鐘
 *
 * `HALF_WORKDAY` 取 `floor(requiredWorkMinutes / 2)`，餘數由**下半天**吸收：
 * 上午段的邊界由班別的核心起算時刻決定，是確定的；把餘數放在確定的一端，
 * 會讓「上午」的定義隨班別浮動（ADR 021 §4.2）。
 *
 * ## 為什麼結果要夾在 requiredWorkMinutes 以內
 *
 * 一天的請假不可能超過那一天該工作的時間。無條件進位遇上不整除的班別
 * （465 分鐘的班、以小時為單位）會算出 480，那多出來的 15 分鐘不存在於任何一天。
 *
 * ## 最小單位只約束 `CUSTOM`
 *
 * 「上午／下午／整天」本身就是合法的請假單位，不需要再被最小單位捨入 ——
 * 對 465 分鐘的班別，下半天是 233 分鐘，若拿 232 分鐘的半日單位去進位，
 * 會得到 464 分鐘，也就是請半天扣掉幾乎一整天。捨入存在的目的是約束
 * 自訂時段，不是約束選單上的選項。
 *
 * 若假別的最小單位是「整天」而使用者選了上午，**擋下而非默默升級成整天**：
 * 靜默升級會讓一個人以為自己請了半天、月底才發現被扣一天。
 *
 * ## 已知限制
 *
 * `CUSTOM` 區間無法精確扣除休息時間 —— `ShiftPattern` 只有 `breakMinutes` 總量，
 * 沒有休息時段的起訖，因此算不出區間與休息的交集。
 * 現行的逼近是 `min(區間長度, 應工作分鐘)`，語意是「你缺席的那段時間裡，
 * **最多**有這麼多應工作分鐘」（理由與被它取代的那個階梯式子見下方 CUSTOM 分支）。
 * ToDo: (20260817 - Julian) 要精確，`ShiftPattern` 需增加休息時段的起訖欄位；
 * 屆時這個式子會成為實際重疊量的上界。
 */
export function resolveLeaveMinutes(input: ILeaveUnitInput): ILeaveUnitResult {
  const { policy, shift, segment, startMinute, endMinute } = input;
  const dayEquivalentMinutes = shift.requiredWorkMinutes;

  if (dayEquivalentMinutes <= 0) {
    throw new LeaveRuleError(
      `requiredWorkMinutes must be positive, got ${dayEquivalentMinutes}`,
    );
  }

  const halfDay = Math.floor(dayEquivalentMinutes / 2);
  let rawMinutes: number;

  switch (segment) {
    case LeaveDaySegment.FULL:
      rawMinutes = dayEquivalentMinutes;
      break;
    case LeaveDaySegment.MORNING:
      assertHalfDaySelectable(policy.unitBasis);
      rawMinutes = halfDay;
      break;
    case LeaveDaySegment.AFTERNOON:
      assertHalfDaySelectable(policy.unitBasis);
      // Info: (20260817 - Julian) 餘數由下半天吸收（見上方說明）
      rawMinutes = dayEquivalentMinutes - halfDay;
      break;
    case LeaveDaySegment.CUSTOM: {
      if (startMinute === undefined || endMinute === undefined) {
        throw new LeaveRuleError(
          "CUSTOM segment requires start and end minute",
        );
      }
      if (endMinute <= startMinute) {
        throw new LeaveRuleError(
          `CUSTOM segment must span forward: ${startMinute} -> ${endMinute}`,
        );
      }
      const span = endMinute - startMinute;
      /**
       * Info: (20260820 - Julian) 扣減必須是**單調**的：請更多假不得扣更少額度
       * （review 第 10 輪第 1 條）。
       *
       * ## 原本的式子
       *
       * ```ts
       * const netSpan = span > dayEquivalentMinutes ? span - shift.breakMinutes : span;
       * ```
       *
       * 它在 `span === dayEquivalentMinutes` 這個點上是一個**階梯**：
       * 480 分班、休息 60 分下，`07:30→15:30`（480 分）扣 480，
       * 而 `07:30→15:31`（481 分）扣 421、捨入成 **450**。
       * 多請一分鐘，少扣 30 分鐘。12 個合法的 `minimumUnitMinutes` 裡有 11 個
       * 在無條件進位下露得出來（只有 60 剛好被進位遮住），四捨五入下 12 個全露。
       *
       * ## 為什麼不是「算出實際涵蓋到的休息時間」
       *
       * 那才是正解，但資料裡沒有 —— `ILeaveShiftLength` 只有
       * `requiredWorkMinutes` 與 `breakMinutes` 兩個**長度**，沒有休息的位置。
       * 「這段區間涵蓋了多少休息」在現行資料模型下是答不出來的。
       * ToDo: (20260820 - Julian) `ShiftPattern` 若補上休息的起訖，
       * 這裡應改為實際重疊量，而下面這個式子會變成它的上界。
       *
       * ## 判準：兩個錨點 + 單調
       *
       * | 情形 | 應扣 |
       * |---|---|
       * | 請一小時（不可能涵蓋整段休息） | 60 分 |
       * | 請完整個核心區間 | 一日（480 分） |
       *
       * `min(span, 應工作分鐘)` 是唯一同時滿足這兩個錨點且單調的式子，
       * 它的語意是「你缺席的那段時間裡，**最多**有這麼多應工作分鐘」。
       *
       * **方向要講清楚**：`span` 落在（應工作分鐘, 應工作分鐘＋休息）之間時，
       * 這個式子比原本扣得多（481 分由 421 變成 480）。那是單調的代價 ——
       * 而另一個方向（一律扣掉休息）會讓「早上請一小時」扣 0 分，
       * 一個荒謬得多的結果。原本的階梯正是為了迴避那個荒謬而生的，
       * 它迴避的方式是製造另一個更難發現的錯。
       */
      rawMinutes = Math.min(span, dayEquivalentMinutes);
      break;
    }
    default: {
      // Info: (20260817 - Julian) 窮舉檢查：新增 segment 而漏改這裡時編譯期就會失敗
      const exhaustive: never = segment;
      throw new LeaveRuleError(`Unhandled segment: ${String(exhaustive)}`);
    }
  }

  /**
   * Info: (20260817 - Julian) 捨入只作用於 CUSTOM（見上方說明）。
   * FULL／MORNING／AFTERNOON 本身就是合法單位，再捨入一次只會製造誤扣。
   */
  if (segment !== LeaveDaySegment.CUSTOM) {
    return { rawMinutes, dayEquivalentMinutes, minutes: rawMinutes };
  }

  const unitMinutes = resolveUnitMinutes(policy, dayEquivalentMinutes, halfDay);
  const rounded =
    policy.roundingMode === LeaveRoundingMode.UP
      ? Math.ceil(rawMinutes / unitMinutes) * unitMinutes
      : Math.round(rawMinutes / unitMinutes) * unitMinutes;

  return {
    rawMinutes,
    dayEquivalentMinutes,
    minutes: Math.min(rounded, dayEquivalentMinutes),
  };
}

/**
 * Info: (20260817 - Julian) 最小單位是「整天」的假別不得選半天。
 *
 * 擋下而非默默升級成整天：靜默升級會讓一個人以為自己請了半天，
 * 月底看到扣一天才發現。UI 也不該提供這個選項，這裡是最後一道。
 */
const assertHalfDaySelectable = (unitBasis: LeaveUnitBasis): void => {
  if (unitBasis === LeaveUnitBasis.FULL_WORKDAY) {
    throw new LeaveRuleError(
      "This leave type is granted in whole days; half-day segments are not selectable",
    );
  }
};

const resolveUnitMinutes = (
  policy: ILeaveUnitInput["policy"],
  dayEquivalentMinutes: number,
  halfDay: number,
): number => {
  switch (policy.unitBasis) {
    case LeaveUnitBasis.FIXED_MINUTES:
      if (
        policy.minimumUnitMinutes === null ||
        policy.minimumUnitMinutes <= 0 ||
        60 % policy.minimumUnitMinutes !== 0
      ) {
        throw new LeaveRuleError(
          `FIXED_MINUTES requires a positive minimumUnitMinutes dividing 60, got ${String(policy.minimumUnitMinutes)}`,
        );
      }
      return policy.minimumUnitMinutes;
    case LeaveUnitBasis.HALF_WORKDAY:
      return halfDay;
    case LeaveUnitBasis.FULL_WORKDAY:
      return dayEquivalentMinutes;
    default: {
      const exhaustive: never = policy.unitBasis;
      throw new LeaveRuleError(`Unhandled unit basis: ${String(exhaustive)}`);
    }
  }
};

// Info: (20260817 - Julian) ===== 年資級距 =====

/**
 * Info: (20260817 - Julian) 依年資月數查出應給日數（勞基法 §38 I）。
 *
 * `incrementDaysPerYear` 表達「十年以上者，每一年加給一日，加至三十日為止」——
 * 不為它列 20 列，它是一條規則不是 20 個特例。
 *
 * ToDo: (20260817 - Julian) 「每一年加給一日」自滿 10 年當年或次年起算，
 * 實務見解不一，差一日。此處採「滿 10 年當年即為級距表所載日數」，
 * 對應 seed 的 16 日。待法務複核（計畫書 §3.2）。
 */
export function resolveTierDays(
  tiers: readonly ILeaveAccrualTier[],
  seniorityMonths: number,
): number {
  let matched: ILeaveAccrualTier | null = null;
  for (const tier of tiers) {
    if (seniorityMonths >= tier.minSeniorityMonths) matched = tier;
  }
  if (matched === null) return 0;

  if (matched.incrementDaysPerYear === null) return matched.days;

  const extraYears = Math.floor(
    (seniorityMonths - matched.minSeniorityMonths) / 12,
  );
  const days = matched.days + extraYears * matched.incrementDaysPerYear;
  return matched.maxDays === null ? days : Math.min(days, matched.maxDays);
}

// Info: (20260817 - Julian) ===== 授予排程 =====

/**
 * Info: (20260817 - Julian) 算出「到 `asOfDate` 為止應該被授予哪些批次」。
 *
 * **這是應然不是實然**：呼叫端拿它與既有的 `LeaveGrant` 比對後決定要補寫哪幾筆。
 * 因此它必須冪等 —— 同輸入同輸出，授予 Worker 每日重跑不會多給一份。
 * 冪等鍵由 `buildLeaveGrantIdempotencyKey` 以 `cycleStartDate` 組出。
 *
 * `PER_EVENT` 與 `NONE` 回空陣列：那些假別的額度來自事件（結婚、喪事、加班），
 * 不來自時間的推移，硬要排程只會憑空產生額度。
 */
export function deriveGrantSchedule(
  input: IGrantScheduleInput,
): IPlannedGrant[] {
  const { hireDate, asOfDate, leaveDate, policy, dayEquivalentMinutes } = input;

  if (dayEquivalentMinutes <= 0) {
    throw new LeaveRuleError(
      `dayEquivalentMinutes must be positive, got ${dayEquivalentMinutes}`,
    );
  }
  if (compareIsoDate(asOfDate, hireDate) < 0) return [];

  if (
    policy.accrualMethod === LeaveAccrualMethod.NONE ||
    policy.accrualMethod === LeaveAccrualMethod.PER_EVENT
  ) {
    return [];
  }

  // Info: (20260817 - Julian) 已離職者只授予到離職日；離職後的週期不該再產生額度
  const horizon =
    leaveDate != null && compareIsoDate(leaveDate, asOfDate) < 0
      ? leaveDate
      : asOfDate;

  switch (policy.cycleBasis) {
    case LeaveCycleBasis.HIRE_ANNIVERSARY:
      return buildAnniversarySchedule(
        hireDate,
        horizon,
        policy,
        dayEquivalentMinutes,
      );
    case LeaveCycleBasis.CALENDAR_YEAR:
      return buildCalendarYearSchedule(
        hireDate,
        horizon,
        policy,
        dayEquivalentMinutes,
      );
    case LeaveCycleBasis.CALENDAR_MONTH:
      return buildCalendarMonthSchedule(
        hireDate,
        horizon,
        policy,
        dayEquivalentMinutes,
      );
    default: {
      const exhaustive: never = policy.cycleBasis;
      throw new LeaveRuleError(`Unhandled cycle basis: ${String(exhaustive)}`);
    }
  }
}

/**
 * Info: (20260817 - Julian) 第一個有額度的週期起點。
 *
 * `SENIORITY_TIER` 取級距表的最小年資（特休為滿六個月）；
 * `FIXED_PER_CYCLE` 自到職日起算 —— 事假不需要等六個月。
 */
const firstEligibleDate = (
  hireDate: string,
  policy: ILeaveAccrualPolicy,
): string => {
  if (policy.accrualMethod !== LeaveAccrualMethod.SENIORITY_TIER) {
    return hireDate;
  }
  const minMonths = policy.tiers.reduce(
    (min, tier) => Math.min(min, tier.minSeniorityMonths),
    Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(minMonths)) {
    throw new LeaveRuleError("SENIORITY_TIER policy has no tiers");
  }
  return addMonths(hireDate, minMonths);
};

const daysForCycle = (
  hireDate: string,
  cycleStart: string,
  policy: ILeaveAccrualPolicy,
): number => {
  if (policy.accrualMethod === LeaveAccrualMethod.SENIORITY_TIER) {
    return resolveTierDays(policy.tiers, monthsBetween(hireDate, cycleStart));
  }
  if (policy.annualDays === null) {
    throw new LeaveRuleError("FIXED_PER_CYCLE policy requires annualDays");
  }
  return policy.annualDays;
};

const buildGrant = (
  cycleStartDate: string,
  cycleEndDate: string,
  grantedDays: number,
  dayEquivalentMinutes: number,
  carryForwardMonths: number,
  isProrated: boolean,
): IPlannedGrant => ({
  source: LeaveGrantSource.SENIORITY_ACCRUAL,
  cycleStartDate,
  cycleEndDate,
  expiresOn:
    carryForwardMonths === 0
      ? cycleEndDate
      : addMonths(cycleEndDate, carryForwardMonths),
  grantedDays,
  dayEquivalentMinutes,
  /**
   * Info: (20260819 - Julian) 進位而非四捨五入：比例給假的餘數不該由勞工承擔。
   * 換算走 `grantedMinutesOf`（全整數）而不是 `Math.ceil(a * b)` ——
   * 後者在 `1.1 × 420` 這種形狀上會多給一分鐘（review B6）。
   */
  grantedMinutes: grantedMinutesOf(grantedDays, dayEquivalentMinutes),
  isProrated,
});

/**
 * Info: (20260820 - Julian) 排程迴圈的防呆上界（review 第 9 輪第 2 條）。
 *
 * ## 為什麼要有
 *
 * `horizon` 來自呼叫端的 `asOfDate`，而它一路上沒有任何上界 ——
 * `asOfDate = "9999-12-31"` 一次請求就會鑄出 **7,980 批、239,117 日**的額度
 * （實測：2020 到職、曆年制、特休級距表）。而 `assertMayAccrueBalance`
 * 放行「對自己執行」的理由寫著「它交出去的是引擎算出的**應然**……生不出多的」——
 * 沒有上界的 horizon 讓那句話不成立。
 *
 * ## 為什麼三支要同一個數字
 *
 * 先前三支各行其是：週年制 40 個週期、曆月制 600 個月、**曆年制沒有**。
 * 而 12 個預設假別裡有 10 個是 `CALENDAR_YEAR` —— 缺的正是覆蓋面最大的那一支。
 * 三個不同的數字讀不出任何規則，讀的人只會以為那是各自試出來的。
 *
 * 80 是「一份不可能存在的年資」：它不是業務規則，而是**逃生閥** ——
 * 正常情況下永遠先被 `horizon` 終止。順帶修掉週年制原本 40 的截斷：
 * 一個 41 年年資的人，第 41 個週期會被靜默地不授予，而那是少給。
 */
const MAX_PLANNED_CYCLES = 80;

const buildAnniversarySchedule = (
  hireDate: string,
  horizon: string,
  policy: ILeaveAccrualPolicy,
  dayEquivalentMinutes: number,
): IPlannedGrant[] => {
  const grants: IPlannedGrant[] = [];
  const first = firstEligibleDate(hireDate, policy);
  if (compareIsoDate(first, horizon) > 0) return grants;

  /**
   * Info: (20260817 - Julian) 特休的第一個週期是「滿六個月」到「滿一年」的前一天，
   * 之後每一個週期都是整年。不把第一段併進第一個整年週期：
   * 那六個月的 3 日與次年的 7 日是兩筆各自到期的額度，合併會弄丟前者的到期日。
   */
  let cycleStart = first;
  let cycleIndex = 0;
  while (compareIsoDate(cycleStart, horizon) <= 0) {
    const nextStart =
      cycleIndex === 0 &&
      policy.accrualMethod === LeaveAccrualMethod.SENIORITY_TIER
        ? addMonths(hireDate, 12)
        : addMonths(cycleStart, 12);
    const cycleEnd = addDays(nextStart, -1);
    grants.push(
      buildGrant(
        cycleStart,
        cycleEnd,
        daysForCycle(hireDate, cycleStart, policy),
        dayEquivalentMinutes,
        policy.carryForwardMonths,
        false,
      ),
    );
    cycleStart = nextStart;
    cycleIndex += 1;
    // Info: (20260820 - Julian) 防呆上界，三支共用同一個常數（見 MAX_PLANNED_CYCLES）
    if (cycleIndex > MAX_PLANNED_CYCLES) break;
  }
  return grants;
};

/**
 * Info: (20260817 - Julian) 曆年制。
 *
 * 首年與跨級距年須按比例給假 —— 一個 3 月到職的人，當年度不該拿到整年份，
 * 而一個在 7 月跨過「滿一年」的人，當年度是前段 3 日與後段 7 日的加權。
 *
 * 公式（計畫書 §6.3）：
 *   段占比 = 該段日數 ÷ 該年日數
 *   年度日數 = Σ(該段級距日數 × 段占比)，再無條件進位至 proratedRoundingScale
 */
const buildCalendarYearSchedule = (
  hireDate: string,
  horizon: string,
  policy: ILeaveAccrualPolicy,
  dayEquivalentMinutes: number,
): IPlannedGrant[] => {
  const grants: IPlannedGrant[] = [];
  const first = firstEligibleDate(hireDate, policy);
  if (compareIsoDate(first, horizon) > 0) return grants;

  const firstYear = Number(first.slice(0, 4));
  const horizonYear = Number(horizon.slice(0, 4));

  /**
   * Info: (20260820 - Julian) 這一支原本**沒有防呆上界**（review 第 9 輪第 2 條）。
   * 另外兩支都有，而 12 個預設假別裡有 10 個走這一支。
   */
  for (
    let year = firstYear;
    year <= horizonYear && year - firstYear <= MAX_PLANNED_CYCLES;
    year += 1
  ) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const cycleStart = compareIsoDate(first, yearStart) > 0 ? first : yearStart;

    const totalDaysInYear = daysInYear(year);
    const boundaries = tierBoundariesWithin(
      hireDate,
      cycleStart,
      yearEnd,
      policy,
    );

    let weightedDays = 0;
    for (let i = 0; i < boundaries.length; i += 1) {
      const segStart = boundaries[i];
      const segEnd =
        i + 1 < boundaries.length ? addDays(boundaries[i + 1], -1) : yearEnd;
      const segDays = daysBetweenInclusive(segStart, segEnd);
      weightedDays +=
        daysForCycle(hireDate, segStart, policy) * (segDays / totalDaysInYear);
    }

    const isProrated =
      compareIsoDate(cycleStart, yearStart) > 0 || boundaries.length > 1;
    const grantedDays = isProrated
      ? ceilToScale(weightedDays, policy.proratedRoundingScale)
      : daysForCycle(hireDate, cycleStart, policy);

    grants.push(
      buildGrant(
        cycleStart,
        yearEnd,
        grantedDays,
        dayEquivalentMinutes,
        policy.carryForwardMonths,
        isProrated,
      ),
    );
  }
  return grants;
};

/**
 * Info: (20260817 - Julian) 某一年之內，級距會在哪幾天改變。
 *
 * 回傳值一定以 `cycleStart` 開頭；其後每一個元素都是一個週年日
 * （年資跨級距的那一天）。`FIXED_PER_CYCLE` 沒有級距，永遠只有一段。
 */
const tierBoundariesWithin = (
  hireDate: string,
  cycleStart: string,
  yearEnd: string,
  policy: ILeaveAccrualPolicy,
): string[] => {
  const boundaries = [cycleStart];
  if (policy.accrualMethod !== LeaveAccrualMethod.SENIORITY_TIER) {
    return boundaries;
  }
  for (let n = 1; n <= 60; n += 1) {
    const anniversary = addMonths(hireDate, n * 12);
    if (compareIsoDate(anniversary, yearEnd) > 0) break;
    if (compareIsoDate(anniversary, cycleStart) <= 0) continue;
    // Info: (20260817 - Julian) 只在日數真的改變時才切段，否則會產出兩段相同級距的無意義加權
    const before = daysForCycle(hireDate, addDays(anniversary, -1), policy);
    const after = daysForCycle(hireDate, anniversary, policy);
    if (before !== after) boundaries.push(anniversary);
  }
  return boundaries;
};

/**
 * Info: (20260817 - Julian) 曆月制（生理假）。
 *
 * **不按比例**：性平法 §14 是「每月得請一日」，那是每個月各自成立的權利，
 * 不是一個被切碎的年度額度。月中到職的人當月一樣有一日。
 */
const buildCalendarMonthSchedule = (
  hireDate: string,
  horizon: string,
  policy: ILeaveAccrualPolicy,
  dayEquivalentMinutes: number,
): IPlannedGrant[] => {
  const grants: IPlannedGrant[] = [];
  const first = firstEligibleDate(hireDate, policy);
  if (compareIsoDate(first, horizon) > 0) return grants;

  let monthStart = `${first.slice(0, 7)}-01`;
  let guard = 0;
  while (
    compareIsoDate(monthStart, horizon) <= 0 &&
    guard < MAX_PLANNED_CYCLES * 12
  ) {
    const nextMonthStart = addMonths(monthStart, 1);
    const cycleStart =
      compareIsoDate(first, monthStart) > 0 ? first : monthStart;
    grants.push(
      buildGrant(
        cycleStart,
        addDays(nextMonthStart, -1),
        daysForCycle(hireDate, cycleStart, policy),
        dayEquivalentMinutes,
        policy.carryForwardMonths,
        false,
      ),
    );
    monthStart = nextMonthStart;
    guard += 1;
  }
  return grants;
};

/**
 * Info: (20260817 - Julian) 比較曆年制與週年制的授予日數（ADR 021 §3.1）。
 *
 * ## 為什麼不是「比累計總數」
 *
 * 第一版寫成「到 asOfDate 為止兩制的累計總和相比」，實測後發現那個定義沒有意義：
 * 週年制在週年日一次給整年份，曆年制在 1/1 一次給整年份，兩者的給假時點不同，
 * 因此在任意一個時點總會有一方領先 —— 同一份設定在 2/28 判定為違法、
 * 在 3/1 判定為合法，那不是護欄，是擲骰子。
 *
 * ## 改用「年資年度 × 重疊比例歸屬」
 *
 * 以每一個**完整的年資年度**（到職日起算的 12 個月）為窗，
 * 兩制的每一筆授予都按「該筆週期與本窗的重疊天數 ÷ 該筆週期總天數」歸屬進來。
 * 兩邊用同一把尺，前置給假的時點差異被消掉，剩下的才是真正的多寡差異。
 *
 * 回傳**第一個**曆年制低於週年制的年資年度；全部通過時回傳最後一個已完成年度。
 *
 * ## 引擎只算，不 throw
 *
 * `assertCycleNotDisadvantageous` **將**是 service 的職責，因為只有它知道該丟哪一個
 * ToDo: (20260819 - Julian) 尚未接線（review B3）：引擎側的 `compareCycleBasisEntitlement()` 已實作，但沒有任何地方丟 `VA_LEAVE_CYCLE_DISADVANTAGEOUS`。原因是計畫書 §17 缺口 9——現行曆年制比例公式本身會少給，接上護欄會讓 13 個內建假別裡的 11 個曆年制全部授予失敗。在公式修正前，改以 `assertLeavePolicyUnit` 暫時拒絕「年資級距 + 曆年制」這一個危險組合。
 *
 * `AppError`。引擎回一個可判斷的結構，呼叫端就無法「忘了檢查」。
 */
export function compareCycleBasisEntitlement(
  input: Omit<IGrantScheduleInput, "policy"> & {
    policy: Omit<ILeaveAccrualPolicy, "cycleBasis">;
  },
): ICycleComparison {
  const schedule = (basis: LeaveCycleBasis): IPlannedGrant[] =>
    deriveGrantSchedule({
      ...input,
      policy: { ...input.policy, cycleBasis: basis },
    });

  const anniversary = schedule(LeaveCycleBasis.HIRE_ANNIVERSARY);
  const calendar = schedule(LeaveCycleBasis.CALENDAR_YEAR);

  const completedYears = Math.floor(
    monthsBetween(input.hireDate, input.asOfDate) / 12,
  );
  if (completedYears < 1) {
    return {
      employmentYearIndex: -1,
      anniversaryDays: 0,
      calendarDays: 0,
      calendarIsAtLeastAnniversary: true,
    };
  }

  let last: ICycleComparison = {
    employmentYearIndex: -1,
    anniversaryDays: 0,
    calendarDays: 0,
    calendarIsAtLeastAnniversary: true,
  };

  for (let year = 0; year < completedYears; year += 1) {
    const windowStart = addMonths(input.hireDate, year * 12);
    const windowEnd = addDays(addMonths(input.hireDate, (year + 1) * 12), -1);
    const anniversaryDays = attributeDays(anniversary, windowStart, windowEnd);
    const calendarDays = attributeDays(calendar, windowStart, windowEnd);
    last = {
      employmentYearIndex: year,
      anniversaryDays,
      calendarDays,
      // Info: (20260817 - Julian) 容許 1e-9 的浮點餘裕：比較的是有限小數的日數，不是金額
      calendarIsAtLeastAnniversary: calendarDays >= anniversaryDays - 1e-9,
    };
    if (!last.calendarIsAtLeastAnniversary) return last;
  }
  return last;
}

/**
 * Info: (20260817 - Julian) 把一組授予依「週期與窗的重疊比例」歸屬到該窗。
 *
 * 兩制共用同一個歸屬函數，這是比較能成立的前提 ——
 * 各用各的算法，比出來的差異會混進算法本身的差異。
 */
const attributeDays = (
  grants: readonly IPlannedGrant[],
  windowStart: string,
  windowEnd: string,
): number =>
  grants.reduce((total, grant) => {
    const overlapStart =
      compareIsoDate(grant.cycleStartDate, windowStart) > 0
        ? grant.cycleStartDate
        : windowStart;
    const overlapEnd =
      compareIsoDate(grant.cycleEndDate, windowEnd) < 0
        ? grant.cycleEndDate
        : windowEnd;
    if (compareIsoDate(overlapStart, overlapEnd) > 0) return total;
    const overlapDays = daysBetweenInclusive(overlapStart, overlapEnd);
    const cycleDays = daysBetweenInclusive(
      grant.cycleStartDate,
      grant.cycleEndDate,
    );
    return total + grant.grantedDays * (overlapDays / cycleDays);
  }, 0);

// Info: (20260817 - Julian) ===== 扣減 =====

/**
 * Info: (20260817 - Julian) 決定一次扣減要動用哪些批次、各扣多少。
 *
 * ## 順序：`expiresOn` 由早至晚，同到期日以 `createdAt`，再同則以 `grantId`
 *
 * 先到期先扣對勞工有利（過期作廢的量最小化），且**它是唯一能讓
 * 「還剩幾天不會過期」有確定答案的順序** —— 其他順序下這個問題的答案
 * 都取決於「接下來會怎麼請」，也就是答不出來。
 *
 * 第三層以 `grantId` 收尾：同一毫秒建立的兩批（批次授予 Worker 會produce）
 * 若沒有穩定的最終排序鍵，同一組輸入在不同執行可能得到不同分配，
 * 而這支函數的全部價值就是可重算。
 *
 * ## 額度不足不丟例外
 *
 * 那是使用者輸入的正常結局，不是故障。用 `shortfallMinutes` 表達，
 * 呼叫端才無法忘記處理（同 `LeaveRecallResolutionOutcome` 的理由）。
 */
export function allocateConsumption(
  input: IConsumptionInput,
): IConsumptionResult {
  const { grants, requiredMinutes } = input;

  if (requiredMinutes < 0) {
    throw new LeaveRuleError(
      `requiredMinutes must not be negative, got ${requiredMinutes}`,
    );
  }
  if (requiredMinutes === 0) {
    return { allocations: [], shortfallMinutes: 0 };
  }

  const ordered = [...grants].sort((left, right) => {
    const byExpiry = compareIsoDate(left.expiresOn, right.expiresOn);
    if (byExpiry !== 0) return byExpiry;
    if (left.createdAt !== right.createdAt) {
      return left.createdAt < right.createdAt ? -1 : 1;
    }
    return left.grantId < right.grantId
      ? -1
      : left.grantId > right.grantId
        ? 1
        : 0;
  });

  const allocations: ILeaveAllocation[] = [];
  let outstanding = requiredMinutes;

  for (const grant of ordered) {
    if (outstanding === 0) break;
    if (grant.remainingMinutes <= 0) continue;
    const taken = Math.min(grant.remainingMinutes, outstanding);
    allocations.push({
      grantId: grant.grantId,
      minutes: taken,
      grantBalanceAfterMinutes: grant.remainingMinutes - taken,
    });
    outstanding -= taken;
  }

  return { allocations, shortfallMinutes: outstanding };
}

/**
 * Info: (20260819 - Julian) 總日數的**精確**表示（review B5）。
 *
 * ## 為什麼不能用 double 累加
 *
 * `Σ minutes_i / dayEquivalent_i` 用 JS number 累加，在「恰好整數天」的
 * 形狀上會掉到整數下方：
 *
 * | 班別 | 形狀 | 數學值 | 浮點值 |
 * |---|---|---|---|
 * | 420 分 | 7 天 × 180 分 | 3 | `2.9999999999999996` |
 * | 420 分 | 21 天 × 60 分 | 3 | `2.999999999999999` |
 * | 450 分 | 10 天 × 135 分 | 3 | `2.9999999999999996` |
 * | 480 分 | 10 天 × 144 分 | 3 | `2.9999999999999996` |
 *
 * 而這個值同時決定**簽核規則命中**。ADR 023 §2.2 明訂區間為右開
 * （`[0, 3)` 與 `[3, ∞)`，恰好 3 天走長假規則），於是上面每一列都會掉進
 * 短假規則 —— 只簽直屬主管一關，部門經理那一關從此不存在。
 * 那是一次**職責分離的降級**，而事後查那張單看起來完全正常。
 *
 * ## 為什麼不是改用 Decimal 累加
 *
 * `Decimal` 只是把 epsilon 換個位置：`180/420` 是無限循環小數，
 * 除法一樣要在某一位截斷，7 個截斷值相加仍然不保證等於 3。
 * 這裡要的是**精確**而不是「更多位數」。
 *
 * ## 作法：通分成整數
 *
 * 以所有 `dayEquivalentMinutes` 的最小公倍數為分母，分子全程是整數
 * （用 `bigint`，因為 62 天 × 1440 分的通分結果可以很大）。
 * 比較與落地都由這個有理數推導，兩者因此不可能不一致。
 */
export interface IExactDays {
  numerator: bigint;
  /** Info: (20260819 - Julian) 恆為正 */
  denominator: bigint;
}

const bigGcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
};

const bigLcm = (a: bigint, b: bigint): bigint => (a / bigGcd(a, b)) * b;

/** Info: (20260819 - Julian) 總日數 = Σ(該日分鐘 ÷ 該日日約當分鐘)，精確 */
export const totalDaysOf = (
  plan: readonly { minutes: number; dayEquivalentMinutes: number }[],
): IExactDays => {
  if (plan.length === 0) return { numerator: 0n, denominator: 1n };

  for (const day of plan) {
    if (
      !Number.isInteger(day.dayEquivalentMinutes) ||
      day.dayEquivalentMinutes <= 0
    ) {
      throw new LeaveRuleError(
        `dayEquivalentMinutes must be a positive integer, got ${day.dayEquivalentMinutes}`,
      );
    }
    if (!Number.isInteger(day.minutes)) {
      throw new LeaveRuleError(
        `minutes must be an integer, got ${day.minutes}`,
      );
    }
  }

  const denominator = plan.reduce(
    (acc, day) => bigLcm(acc, BigInt(day.dayEquivalentMinutes)),
    1n,
  );
  const numerator = plan.reduce(
    (acc, day) =>
      acc +
      BigInt(day.minutes) * (denominator / BigInt(day.dayEquivalentMinutes)),
    0n,
  );
  const divisor = bigGcd(numerator, denominator) || 1n;
  return { numerator: numerator / divisor, denominator: denominator / divisor };
};

/**
 * Info: (20260819 - Julian) 把一個十進位數值轉成精確有理數。
 *
 * 給簽核規則的 `minDays` / `maxDays`、以及額度的 `grantedDays` 用 ——
 * 它們在 DB 是 `Decimal`，經 `Number()` 之後是 `3`、`0.5`、`1.1` 這種
 * 十進位下位數有限的值，由**字串**還原回分數不會有誤差
 * （`String(1.1)` 給的是 `"1.1"`，不是 `1.100000000000000088…`）。
 */
export const exactRationalOf = (value: number): IExactDays => {
  if (!Number.isFinite(value)) {
    throw new LeaveRuleError(`threshold must be finite, got ${value}`);
  }
  const text = String(value);
  /**
   * Info: (20260819 - Julian) JS 對 `1e-7`、`1e21` 這類值給的是指數字串，
   * `BigInt()` 會直接丟一個看不出來由的 SyntaxError。擋在這裡並說清楚 ——
   * 額度的日數與簽核門檻都不該落在那個範圍，落到了就是上游算壞了。
   */
  if (text.includes("e") || text.includes("E")) {
    throw new LeaveRuleError(
      `value must be a plain decimal, got exponential notation: ${text}`,
    );
  }
  const dot = text.indexOf(".");
  if (dot === -1) return { numerator: BigInt(text), denominator: 1n };
  const scale = text.length - dot - 1;
  return {
    numerator: BigInt(text.replace(".", "")),
    denominator: 10n ** BigInt(scale),
  };
};

/** Info: (20260819 - Julian) 精確比較：回 -1 / 0 / 1（days 相對於 threshold） */
export const compareDaysTo = (days: IExactDays, threshold: number): number => {
  const other = exactRationalOf(threshold);
  const left = days.numerator * other.denominator;
  const right = other.numerator * days.denominator;
  if (left < right) return -1;
  return left > right ? 1 : 0;
};

/**
 * Info: (20260819 - Julian) 顯示用的近似值。**不可用於規則比對** ——
 * 它就是造成 B5 的那個 double，只是這次它的用途僅止於印在畫面上。
 */
export const exactDaysToNumber = (days: IExactDays): number =>
  Number(days.numerator) / Number(days.denominator);

/**
 * Info: (20260819 - Julian) 落地用的十進位字串（`LeaveRequest.totalDays` 是 Decimal）。
 *
 * 整除時給出 `"3"` 而不是 `"2.9999999999"`；除不盡時取到 `scale` 位四捨五入。
 * 傳字串而不是 number，是因為 `src/lib/prisma.ts` 的邊界防護會擋下
 * 原生 number 寫入 Decimal 欄位 —— 而**先前那層 `String()` 轉換洗掉的是一個
 * 已經算壞的 double**，不是這個問題的解法（CLAUDE.md §2 要的是運算用精確型別）。
 */
export const exactDaysToDecimalString = (
  days: IExactDays,
  scale = 10,
): string => {
  const negative = days.numerator < 0n;
  const numerator = negative ? -days.numerator : days.numerator;
  const whole = numerator / days.denominator;
  const remainder = numerator % days.denominator;
  if (remainder === 0n) return `${negative ? "-" : ""}${whole}`;

  const factor = 10n ** BigInt(scale);
  // Info: (20260819 - Julian) 四捨五入到第 scale 位
  const scaled =
    (remainder * factor * 2n + days.denominator) / (days.denominator * 2n);

  /**
   * Info: (20260820 - Julian) 進位要在**還是數字的時候**判（review 第 4 條）。
   *
   * 這裡原本是「先剝尾零、再看字串長度」：
   *
   * ```ts
   * fraction = fraction.replace(/0+$/, "");   // 先剝
   * const carried = fraction.length > scale;  // 再判 → 恆為 false
   * ```
   *
   * `scaled` 的上界是 `factor`，因此唯一會進位的情形就是 `scaled === factor`，
   * 而它的字串是「1 後面 scale 個零」—— 尾零一剝只剩 `"1"`，長度 1 不可能
   * 大於 scale。那個分支是**死碼**，而落空的後果不是差一位小數：
   * `299999999999 / 100000000000`（≈2.99999999999）會寫成 `"2.1"`，
   * 差了 0.9 天。這條路要分母大於 `2 × 10^10` 才走得到 —— 連續數日、
   * 各日班別的 `requiredWorkMinutes` 兩兩互質時，`totalDaysOf` 的最小公倍
   * 分母就會到那個量級（實測五日 421/425/429/437/443 分 → 分母約 1.5×10^13）。
   *
   * 判準改成算術比較，且排在任何字串處理之前 —— 字串答不了這個問題，
   * 因為「進位」與「小數尾零」在剝過之後長得一模一樣。
   */
  if (scaled === factor) return `${negative ? "-" : ""}${whole + 1n}`;

  const fraction = scaled.toString().padStart(scale, "0").replace(/0+$/, "");
  return fraction === ""
    ? `${negative ? "-" : ""}${whole}`
    : `${negative ? "-" : ""}${whole}.${fraction}`;
};

/**
 * Info: (20260819 - Julian) 「日數 × 日約當 → 分鐘」的**唯一**一支實作（review B6）。
 *
 * ## 為什麼 `Math.ceil(days * dayEquivalentMinutes)` 不能用
 *
 * 乘積落在整數上方一個 epsilon，`ceil` 就多給一分鐘：
 *
 * | 日數 | 日約當 | 浮點乘積 | `Math.ceil` | 正解 |
 * |---|---|---|---|---|
 * | 1.1 | 420 | `462.00000000000006` | 463 | 462 |
 * | 1.1 | 450 | `495.00000000000006` | 496 | 495 |
 * | 2.2 | 465 | `1023.0000000000001` | 1024 | 1023 |
 * | 8.3 | 480 | `3984.0000000000005` | 3985 | 3984 |
 *
 * 一位小數的日數（比例給假的 `proratedRoundingScale` 常設值）配上常見班別，
 * 實測 31 組會多一分鐘；把班別放寬到 240–600 分則是 435 組。
 * 多給一分鐘不是「對勞工有利所以無所謂」—— ADR 022 §3.2 承諾的是
 * 「任何人事後都能驗算這 3360 分鐘的來歷」，而稽核員按計算機得到 462、
 * DB 裡寫的是 463，那個承諾就不成立了。
 *
 * ## 作法
 *
 * 日數由**十進位字串**還原成分數（`exactRationalOf`），再全程用 `bigint`
 * 做「乘完再向上取整」：`ceil(num × eq ÷ den)`。過程中沒有任何浮點乘法，
 * 因此沒有 epsilon 可以外溢。
 *
 * 進位而非四捨五入的理由不變（比例給假的餘數不該由勞工承擔），
 * 這裡改掉的只是「怎麼算」，不是「往哪邊捨入」。
 *
 * ## 這支函式的呼叫者
 *
 * `buildGrant`（年資／比例授予）、`deriveCompensatoryGrantDays`（補休換算的
 * 自我驗算）。`assertGrantSource` **刻意不呼叫它** —— 不變式若重算同一個
 * 式子，判準就與缺陷相容（checklist §1.9「衍生值救不了衍生值」）。
 */
export const grantedMinutesOf = (
  grantedDays: number,
  dayEquivalentMinutes: number,
): number => {
  if (!Number.isInteger(dayEquivalentMinutes) || dayEquivalentMinutes <= 0) {
    throw new LeaveRuleError(
      `dayEquivalentMinutes must be a positive integer, got ${dayEquivalentMinutes}`,
    );
  }
  if (!Number.isFinite(grantedDays) || grantedDays < 0) {
    throw new LeaveRuleError(
      `grantedDays must be a non-negative finite number, got ${grantedDays}`,
    );
  }

  const days = exactRationalOf(grantedDays);
  const product = days.numerator * BigInt(dayEquivalentMinutes);
  const quotient = product / days.denominator;
  const exact = quotient * days.denominator === product;
  return Number(exact ? quotient : quotient + 1n);
};
