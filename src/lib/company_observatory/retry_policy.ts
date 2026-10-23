import {
  IFilingDate,
  OBSERVATORY_ANNUAL_YEARS_BACK,
  OBSERVATORY_CURRENT_YEAR_SOURCES,
  OBSERVATORY_DOCUMENT_STATUS,
  OBSERVATORY_FILING_GRACE_MS,
  OBSERVATORY_FILING_SCHEDULE,
  OBSERVATORY_FILING_SEASON_RECHECK_MS,
  OBSERVATORY_OFF_SEASON_RECHECK_MS,
  OBSERVATORY_MAX_ATTEMPTS,
  OBSERVATORY_NOT_AVAILABLE_RECHECK_MS,
  OBSERVATORY_RETRY_BACKOFF_FACTOR,
  OBSERVATORY_RETRY_BASE_DELAY_MS,
  OBSERVATORY_SOURCE,
  ObservatoryDocumentStatus,
  ObservatorySource,
} from "@/constants/company_observatory";

/**
 * Info: (20261015 - Luphia) 企業觀測站的狀態轉移規則。純函數，不碰 IO，供單元測試直接驗證。
 */

export interface IObservatoryFailureTransition {
  status: ObservatoryDocumentStatus;
  attemptCount: number;
  nextAttemptAt: Date;
}

/**
 * Info: (20261015 - Luphia) 失敗一次之後的狀態。
 * `retryStatus` 是還能重試時要回到的狀態：下載失敗回 FAILED（重新下載），
 * 索引失敗留在 DOWNLOADED（檔案已在本機，不必再抓一次）。
 * 達上限即 DEAD——死信不再自動重試，需由管理端 requeue（CLAUDE.md §6）。
 */
export function nextStateAfterFailure(
  previousAttempts: number,
  now: Date,
  retryStatus: ObservatoryDocumentStatus,
): IObservatoryFailureTransition {
  const attemptCount = previousAttempts + 1;
  if (attemptCount >= OBSERVATORY_MAX_ATTEMPTS) {
    return {
      status: OBSERVATORY_DOCUMENT_STATUS.DEAD,
      attemptCount,
      nextAttemptAt: now,
    };
  }
  const delayMs =
    OBSERVATORY_RETRY_BASE_DELAY_MS *
    Math.pow(OBSERVATORY_RETRY_BACKOFF_FACTOR, attemptCount - 1);
  return {
    status: retryStatus,
    attemptCount,
    nextAttemptAt: new Date(now.getTime() + delayMs),
  };
}

// Info: (20261023 - Luphia) 申報日期（台灣時間的那一天）→ 當天結束的時刻；以 UTC+8 換算，與主機時區無關
const TAIWAN_UTC_OFFSET_HOURS = 8;

export function endOfFilingDate(year: number, date: IFilingDate): Date {
  return new Date(
    Date.UTC(year + date.yearOffset, date.month - 1, date.day + 1) -
      TAIWAN_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );
}

/**
 * Info: (20261023 - Luphia) 查無報告之後多久再查（規則見 OBSERVATORY_FILING_SCHEDULE）：
 * 期間未結束 → 期間結束隔天；申報季（期間結束～期限後 14 天）→ 每天；其餘 → 每 30 天。
 * 沒有申報期限的來源（公司登記快照）沿用固定的 7 天。
 */
export function nextRecheckAt(
  now: Date,
  source?: ObservatorySource,
  year?: number,
): Date {
  const schedule = source ? OBSERVATORY_FILING_SCHEDULE[source] : undefined;
  if (!schedule || year === undefined) {
    return new Date(now.getTime() + OBSERVATORY_NOT_AVAILABLE_RECHECK_MS);
  }
  const periodEnd = endOfFilingDate(year, schedule.periodEnd);
  if (now.getTime() < periodEnd.getTime()) return periodEnd;
  const seasonEnd =
    endOfFilingDate(year, schedule.deadline).getTime() +
    OBSERVATORY_FILING_GRACE_MS;
  const delayMs =
    now.getTime() <= seasonEnd
      ? OBSERVATORY_FILING_SEASON_RECHECK_MS
      : OBSERVATORY_OFF_SEASON_RECHECK_MS;
  return new Date(now.getTime() + delayMs);
}

/**
 * Info: (20261023 - Luphia) 新建的待下載列第一次什麼時候查：期間還沒結束就排到期間結束隔天，
 * 否則立刻。一月建立的第三季列不必先白查一次。
 */
export function firstCheckAt(
  now: Date,
  source: ObservatorySource,
  year: number,
): Date {
  const schedule = OBSERVATORY_FILING_SCHEDULE[source];
  if (!schedule) return now;
  const periodEnd = endOfFilingDate(year, schedule.periodEnd);
  return periodEnd.getTime() > now.getTime() ? periodEnd : now;
}

/**
 * Info: (20261015 - Luphia) 每個來源要追蹤哪些年度。
 * 公司登記是「現況」快照，只建今年一列；年度報告從去年往回數 N 年（今年的報告還沒公告）。
 */
export function targetYearsFor(source: ObservatorySource, now: Date): number[] {
  const currentYear = now.getFullYear();
  if (source === OBSERVATORY_SOURCE.GCIS_REGISTRATION) return [currentYear];
  if (OBSERVATORY_CURRENT_YEAR_SOURCES.includes(source)) return [currentYear];
  return Array.from(
    { length: OBSERVATORY_ANNUAL_YEARS_BACK },
    (_, offset) => currentYear - 1 - offset,
  );
}

// Info: (20261015 - Luphia) 查無報告的年度若已滑出追蹤視窗，就不再回頭重查
export function minTrackedYear(now: Date): number {
  return now.getFullYear() - OBSERVATORY_ANNUAL_YEARS_BACK;
}
