/**
 * Info: (20260716 - Emily) Sliding-window 限流器(#6516)。
 * 單機 in-memory 實作;介面(check/enforce)與儲存後端解耦,
 * 多實例部署時可將 SlidingWindowRateLimiter 替換為 Redis backend 而不改任何呼叫端。
 * 已知妥協:多實例各自計數,實際限額 ≈ 設定值 × 實例數(初期單實例,寧鬆勿卡)。
 */

import { NextResponse } from "next/server";
import { jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import {
  RateLimitBucketEnum,
  RATE_LIMIT_RULES,
  RATE_LIMIT_MAX_TRACKED_KEYS,
  RATE_LIMIT_SWEEP_EVERY_N_CHECKS,
  IRateLimitWindow,
} from "@/constants/rate_limit";

export interface IRateLimitDecision {
  allowed: boolean;
  // Info: (20260716 - Emily) 超限時建議等待秒數(取自最早過期的命中),供 Retry-After header
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  // Info: (20260716 - Emily) key → 命中時間戳(遞增);以最大窗口為修剪界線
  private readonly hits: Map<string, number[]> = new Map();

  private readonly rules: Record<string, IRateLimitWindow[]>;

  private readonly now: () => number;

  private checkCount = 0;

  constructor(
    rules: Record<string, IRateLimitWindow[]> = RATE_LIMIT_RULES,
    now: () => number = () => Date.now(),
  ) {
    this.rules = rules;
    this.now = now;
  }

  check(bucket: string, identity: string): IRateLimitDecision {
    const windows = this.rules[bucket];
    if (!windows || windows.length === 0) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    this.checkCount++;
    if (this.checkCount % RATE_LIMIT_SWEEP_EVERY_N_CHECKS === 0) {
      this.sweep();
    }

    const key = `${bucket}:${identity}`;
    const nowMs = this.now();
    const maxWindowMs = Math.max(...windows.map((w) => w.windowMs));

    // Info: (20260716 - Emily) 修剪最大窗口外的舊命中(單一陣列服務所有窗口)
    const timestamps = (this.hits.get(key) ?? []).filter(
      (ts) => ts > nowMs - maxWindowMs,
    );

    // Info: (20260716 - Emily) 任一窗口超限即拒絕;Retry-After 取該窗口最早命中的過期時刻
    for (const window of windows) {
      const inWindow = timestamps.filter((ts) => ts > nowMs - window.windowMs);
      if (inWindow.length >= window.max) {
        const earliest = inWindow[0];
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((earliest + window.windowMs - nowMs) / 1000),
        );
        this.hits.set(key, timestamps);
        return { allowed: false, retryAfterSeconds };
      }
    }

    timestamps.push(nowMs);
    this.hits.set(key, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Info: (20260716 - Emily) lazy sweep:移除全數過期的 key;超過上限時再強制全掃(記憶體防護)
  private sweep(): void {
    const nowMs = this.now();
    this.hits.forEach((timestamps, key) => {
      const windows = this.rules[key.split(":")[0]];
      const maxWindowMs = windows
        ? Math.max(...windows.map((w) => w.windowMs))
        : 0;
      if (!timestamps.some((ts) => ts > nowMs - maxWindowMs)) {
        this.hits.delete(key);
      }
    });
    if (this.hits.size > RATE_LIMIT_MAX_TRACKED_KEYS) {
      // Info: (20260716 - Emily) 極端情況(疑似攻擊):全清重計,寧可短暫放行也不讓記憶體失控
      logger.warn("rate limiter tracked keys exceeded cap; resetting", {
        trackedKeys: this.hits.size,
      });
      this.hits.clear();
    }
  }

  get trackedKeyCount(): number {
    return this.hits.size;
  }
}

/**
 * Info: (20260716 - Emily) carbon 路由共用單例(Next.js route handler 同 process 共享)
 *
 * Info: (20260817 - Luphia) 現在是**全站**共用，不只 carbon：一個實例服務所有 bucket，
 * 因為 `check()` 的 key 是 `bucket:identity` —— 不同 bucket 之間本來就不共用計數，
 * 開第二個實例只會讓記憶體上限（`RATE_LIMIT_MAX_TRACKED_KEYS`）與清掃節奏各算一份。
 */
const rateLimiter = new SlidingWindowRateLimiter();

/**
 * Info: (20260716 - Emily) route 專用防線:超限時回傳現成的 429 Response(含 Retry-After),
 * 未超限回 null。route 只需一行 if,維持「純端口」職責。
 *
 * Info: (20260817 - Luphia) 由 `enforceCarbonRateLimit` 改名而來 —— 它從第一天起就
 * 與 carbon 無關（維度是身分 × bucket），而名字裡的 `Carbon` 會讓下一個要為新模組
 * 加限流的人以為得再寫一支。**呼叫時機的規則沒變**：DeWT 驗證之後、業務邏輯之前，
 * 否則「失敗的嘗試也計入」不會成立（見 `ATTENDANCE_PUNCH` 的說明）。
 */
export const enforceRateLimit = (
  identity: string,
  bucket: RateLimitBucketEnum,
): NextResponse | null => {
  const decision = rateLimiter.check(bucket, identity);
  if (decision.allowed) return null;
  // Info: (20260716 - Emily) 429 log 供上線觀測調參(初期閾值放寬,觀測一週後收緊)
  logger.warn("rate limit exceeded", {
    bucket,
    identity,
    retryAfterSeconds: decision.retryAfterSeconds,
  });
  return jsonFail(API_ERRORS.IS_RATE_LIMITED, {
    headers: { "Retry-After": String(decision.retryAfterSeconds) },
  });
};

/**
 * Deprecated: (20260817 - Luphia) 舊名，供 16 支既有 carbon route 沿用。
 * 行為與 `enforceRateLimit` 完全相同（同一個 limiter 實例、同一組計數）。
 *
 * ToDo: (20260817 - Luphia) 把那 16 支改呼叫 `enforceRateLimit` 後移除本別名。
 * 刻意不在這一輪一起改：那是 16 個檔案的機械改動，混進出勤模組的 review 裡
 * 只會讓兩件事都更難看清楚。
 */
export const enforceCarbonRateLimit = enforceRateLimit;
