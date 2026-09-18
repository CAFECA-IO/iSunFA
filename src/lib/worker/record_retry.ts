import {
  MISSION_RECORD_FAILED_MARKER_PREFIX,
  MISSION_RECORD_GIVE_UP_FAILURES,
  MISSION_RECORD_MAX_FAILURES,
  MISSION_RECORD_RETRY_BACKOFF_MS,
} from "@/constants/worker_node";

/**
 * Info: (20260918 - Luphia) recorder 記錄失敗後的重試判準（PR #6650 review 六輪
 * 阻-1／阻-2）——純函式，判斷與檔案系統、時鐘都分開，讓「幾次失敗之後會怎樣」
 * 有直接的行為測試，而不是靠讀 recorder 的原始碼。
 *
 * - `RETRY`：照常再試。
 * - `BACKOFF`：失敗已達 `MISSION_RECORD_MAX_FAILURES`，且最新一次失敗距今未滿
 *   `MISSION_RECORD_RETRY_BACKOFF_MS`——這一 tick 跳過。暫時性故障（DB 重啟）
 *   靠這一段自己好起來，不需要人去刪標記。
 * - `GIVE_UP`：失敗已達 `MISSION_RECORD_GIVE_UP_FAILURES`——走放棄路徑進終態。
 */
export type RecordRetryState = "RETRY" | "BACKOFF" | "GIVE_UP";

export const recordFailureMarkerName = (timestamp: number): string =>
  `${MISSION_RECORD_FAILED_MARKER_PREFIX}${timestamp}.md`;

/**
 * Info: (20260918 - Luphia) 從資料夾檔名讀出失敗時間戳。壞檔名（前綴對、中間不是
 * 數字）算一次失敗但時間視為 0：寧可多算一次、不能因為檔名壞掉就少算。
 */
export const parseRecordFailureTimestamps = (
  files: readonly string[],
): number[] =>
  files
    .filter(
      (f) =>
        f.startsWith(MISSION_RECORD_FAILED_MARKER_PREFIX) && f.endsWith(".md"),
    )
    .map((f) => {
      const raw = f.slice(
        MISSION_RECORD_FAILED_MARKER_PREFIX.length,
        -".md".length,
      );
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    })
    .sort((a, b) => a - b);

export const resolveRecordRetryState = (
  failureTimestamps: readonly number[],
  now: number,
): RecordRetryState => {
  const failures = failureTimestamps.length;
  if (failures >= MISSION_RECORD_GIVE_UP_FAILURES) return "GIVE_UP";
  if (failures >= MISSION_RECORD_MAX_FAILURES) {
    const latest = Math.max(...failureTimestamps);
    if (now - latest < MISSION_RECORD_RETRY_BACKOFF_MS) return "BACKOFF";
  }
  return "RETRY";
};
