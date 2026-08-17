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
  Math.round((toUtcDate(toIso).getTime() - toUtcDate(fromIso).getTime()) / DAY_MS) +
  1;

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
 * 沒有休息時段的起訖，因此算不出區間與休息的交集。此處以
 * 「區間長度扣掉休息總量後仍不得超過應工作分鐘」逼近。
 * ToDo: (20260817 - Julian) 要精確，`ShiftPattern` 需增加休息時段欄位。
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
        throw new LeaveRuleError("CUSTOM segment requires start and end minute");
      }
      if (endMinute <= startMinute) {
        throw new LeaveRuleError(
          `CUSTOM segment must span forward: ${startMinute} -> ${endMinute}`,
        );
      }
      const span = endMinute - startMinute;
      // Info: (20260817 - Julian) 區間涵蓋休息時，扣掉休息總量；仍不得超過應工作分鐘
      const netSpan =
        span > dayEquivalentMinutes ? span - shift.breakMinutes : span;
      rawMinutes = Math.min(netSpan, dayEquivalentMinutes);
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
  // Info: (20260817 - Julian) 進位而非四捨五入：比例給假的餘數不該由勞工承擔
  grantedMinutes: Math.ceil(grantedDays * dayEquivalentMinutes),
  isProrated,
});

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
      cycleIndex === 0 && policy.accrualMethod === LeaveAccrualMethod.SENIORITY_TIER
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
    // Info: (20260817 - Julian) 迴圈上界：40 年份的週期。防呆而非業務規則，正常必先被 horizon 終止
    if (cycleIndex > 40) break;
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

  for (let year = firstYear; year <= horizonYear; year += 1) {
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
  while (compareIsoDate(monthStart, horizon) <= 0 && guard < 600) {
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
 * `assertCycleNotDisadvantageous` 是 service 的職責，因為只有它知道該丟哪一個
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
    return left.grantId < right.grantId ? -1 : left.grantId > right.grantId ? 1 : 0;
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
