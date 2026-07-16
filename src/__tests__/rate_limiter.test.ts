// Info: (20260716 - Emily) 限流器測試(#6516):窗口滑動、雙窗口、bucket/身份隔離、Retry-After、清掃

import { describe, it, expect } from "@jest/globals";
import { SlidingWindowRateLimiter } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";

// Info: (20260716 - Emily) 可控時鐘:測試不依賴真實時間
const buildClock = (start = 0) => {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
};

const RULES = {
  [RateLimitBucketEnum.LLM]: [
    { windowMs: 60_000, max: 3 },
    { windowMs: 86_400_000, max: 5 },
  ],
  [RateLimitBucketEnum.READ]: [{ windowMs: 60_000, max: 2 }],
};

describe("SlidingWindowRateLimiter", () => {
  it("should allow within limit and reject beyond it with a Retry-After hint", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RULES, clock.now);

    for (let i = 0; i < 3; i++) {
      expect(limiter.check(RateLimitBucketEnum.LLM, "0xA").allowed).toBe(true);
      clock.advance(1_000);
    }
    const rejected = limiter.check(RateLimitBucketEnum.LLM, "0xA");
    expect(rejected.allowed).toBe(false);
    // Info: (20260716 - Emily) 最早命中於 t=0,窗口 60s,現在 t=3s → 約 57 秒後恢復
    expect(rejected.retryAfterSeconds).toBe(57);
  });

  it("should recover after the window slides past old hits", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RULES, clock.now);

    for (let i = 0; i < 3; i++) limiter.check(RateLimitBucketEnum.LLM, "0xA");
    expect(limiter.check(RateLimitBucketEnum.LLM, "0xA").allowed).toBe(false);

    clock.advance(60_001);
    expect(limiter.check(RateLimitBucketEnum.LLM, "0xA").allowed).toBe(true);
  });

  it("should enforce the daily window even when the minute window recovers", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RULES, clock.now);

    // Info: (20260716 - Emily) 每分鐘打 1 次共 5 次(分鐘窗口永不超),日窗口 max 5
    for (let i = 0; i < 5; i++) {
      expect(limiter.check(RateLimitBucketEnum.LLM, "0xA").allowed).toBe(true);
      clock.advance(61_000);
    }
    const rejected = limiter.check(RateLimitBucketEnum.LLM, "0xA");
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterSeconds).toBeGreaterThan(60);
  });

  it("should isolate buckets and identities", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RULES, clock.now);

    for (let i = 0; i < 3; i++) limiter.check(RateLimitBucketEnum.LLM, "0xA");
    expect(limiter.check(RateLimitBucketEnum.LLM, "0xA").allowed).toBe(false);
    // Info: (20260716 - Emily) 同 bucket 不同身份、同身份不同 bucket 皆不受影響
    expect(limiter.check(RateLimitBucketEnum.LLM, "0xB").allowed).toBe(true);
    expect(limiter.check(RateLimitBucketEnum.READ, "0xA").allowed).toBe(true);
  });

  it("should allow unknown buckets (no rules) without tracking", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RULES, clock.now);
    expect(limiter.check("UNKNOWN", "0xA").allowed).toBe(true);
    expect(limiter.trackedKeyCount).toBe(0);
  });

  it("should sweep fully-expired keys to protect memory", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(
      { [RateLimitBucketEnum.READ]: [{ windowMs: 1_000, max: 5 }] },
      clock.now,
    );

    // Info: (20260716 - Emily) 造出多個 key,全部過期後觸發 sweep(每 1000 次檢查)
    for (let i = 0; i < 500; i++) {
      limiter.check(RateLimitBucketEnum.READ, `0x${i}`);
    }
    expect(limiter.trackedKeyCount).toBe(500);
    clock.advance(10_000);
    for (let i = 0; i < 1_000; i++) {
      limiter.check(RateLimitBucketEnum.READ, "0xSWEEPER");
      clock.advance(10_000);
    }
    // Info: (20260716 - Emily) 舊 500 key 已全過期,sweep 後僅剩活躍者
    expect(limiter.trackedKeyCount).toBeLessThan(10);
  });
});
