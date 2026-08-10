import {
  FIVE_HOURS_SEC,
  WEEK_ANCHOR_EPOCH_SEC,
  WEEK_SEC,
} from "@/constants/subscription_quota";

/**
 * Info: (20260807 - Luphia) 訂閱額度固定視窗的純函式數學層。
 * 設計書 §4：不碰 DB、不碰 Date.now()，時間一律由呼叫端注入 epoch 秒，
 * 保證決定論與可單測；視窗 key 供 TeamQuotaUsage 聚合，resetAt 供 402 回應揭露。
 */

/**
 * Info: (20260807 - Luphia) Fail Fast：系統於週錨點（2026-01-05）後上線，
 * 早於錨點或非整數的時間戳必為時鐘錯誤，立即凍結而非算出負值視窗 key。
 */
function assertValidEpochSec(nowSec: number): void {
  if (!Number.isInteger(nowSec) || nowSec < WEEK_ANCHOR_EPOCH_SEC) {
    throw new Error(
      `Invalid epoch second for quota window: ${nowSec} (must be an integer >= ${WEEK_ANCHOR_EPOCH_SEC})`,
    );
  }
}

export function getWindowKey5h(nowSec: number): number {
  assertValidEpochSec(nowSec);
  return Math.floor(nowSec / FIVE_HOURS_SEC);
}

export function getWindowKeyWeek(nowSec: number): number {
  assertValidEpochSec(nowSec);
  return Math.floor((nowSec - WEEK_ANCHOR_EPOCH_SEC) / WEEK_SEC);
}

export function getResetAt5h(nowSec: number): number {
  return (getWindowKey5h(nowSec) + 1) * FIVE_HOURS_SEC;
}

export function getResetAtWeek(nowSec: number): number {
  return WEEK_ANCHOR_EPOCH_SEC + (getWindowKeyWeek(nowSec) + 1) * WEEK_SEC;
}
