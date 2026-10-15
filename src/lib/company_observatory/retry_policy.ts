import {
  OBSERVATORY_ANNUAL_YEARS_BACK,
  OBSERVATORY_DOCUMENT_STATUS,
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

export function nextRecheckAt(now: Date): Date {
  return new Date(now.getTime() + OBSERVATORY_NOT_AVAILABLE_RECHECK_MS);
}

/**
 * Info: (20261015 - Luphia) 每個來源要追蹤哪些年度。
 * 公司登記是「現況」快照，只建今年一列；年度報告從去年往回數 N 年（今年的報告還沒公告）。
 */
export function targetYearsFor(source: ObservatorySource, now: Date): number[] {
  const currentYear = now.getFullYear();
  if (source === OBSERVATORY_SOURCE.GCIS_REGISTRATION) return [currentYear];
  return Array.from(
    { length: OBSERVATORY_ANNUAL_YEARS_BACK },
    (_, offset) => currentYear - 1 - offset,
  );
}

// Info: (20261015 - Luphia) 查無報告的年度若已滑出追蹤視窗，就不再回頭重查
export function minTrackedYear(now: Date): number {
  return now.getFullYear() - OBSERVATORY_ANNUAL_YEARS_BACK;
}
