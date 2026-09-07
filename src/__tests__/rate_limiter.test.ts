// Info: (20260716 - Emily) 限流器測試(#6516):窗口滑動、雙窗口、bucket/身份隔離、Retry-After、清掃

import { describe, it, expect } from "@jest/globals";
import { SlidingWindowRateLimiter, enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum, RATE_LIMIT_RULES } from "@/constants/rate_limit";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

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

/**
 * Info: (20260812 - Luphia) `rate_limiting_guideline.md` 的「為新端點加限流」checklist 第 4 條：
 * 「補『連打超限 → 429 + Retry-After；窗口滑過恢復』的測試」。
 *
 * 上面那組測的是限流器的**演算法**，用的是合成規則（`RULES`）——
 * 所以任何一個 bucket 的**實際數字**都沒有測試守著。`PRF` 是為託管帳號索取
 * 對話金鑰而新增的桶（見 constants 的 Info 註解），它的 20/min 與 200/day
 * 是「例行操作」與「偷到 session 就批次撈秘密」之間的那條線，
 * 而那條線目前只存在於一個常數裡。
 *
 * 這組刻意餵**真實的 `RATE_LIMIT_RULES`**：改動那兩個數字就會有測試變紅，
 * 而不是等到有人在生產環境重載五次頁面才發現。
 */
describe("PRF bucket honours its configured windows", () => {
  const PRF_PER_MINUTE = 20;
  const PRF_PER_DAY = 200;

  // Info: (20260812 - Luphia) 先釘住常數本身：下面兩支測的是行為，這支說明行為為什麼是那些數字
  it("should be configured with the documented windows", () => {
    expect(RATE_LIMIT_RULES[RateLimitBucketEnum.PRF]).toEqual([
      { windowMs: 60_000, max: PRF_PER_MINUTE },
      { windowMs: 86_400_000, max: PRF_PER_DAY },
    ]);
  });

  it("should reject the call past the minute limit and say how long to wait", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);

    for (let i = 0; i < PRF_PER_MINUTE; i += 1) {
      expect(limiter.check(RateLimitBucketEnum.PRF, "0xA").allowed).toBe(true);
      clock.advance(1_000);
    }

    const rejected = limiter.check(RateLimitBucketEnum.PRF, "0xA");
    expect(rejected.allowed).toBe(false);
    /**
     * Info: (20260812 - Luphia) 最早命中在 t=0、窗口 60s、現在 t=20s → 約 40 秒後恢復。
     * 斷言具體秒數而不是「大於 0」：`Retry-After` 是要給使用者看的數字，
     * 算錯的表現是「叫人等錯的時間」，而那不會讓任何寬鬆的斷言變紅。
     */
    expect(rejected.retryAfterSeconds).toBe(40);
  });

  it("should recover once the minute window slides past the old hits", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);

    for (let i = 0; i < PRF_PER_MINUTE; i += 1) {
      limiter.check(RateLimitBucketEnum.PRF, "0xA");
    }
    expect(limiter.check(RateLimitBucketEnum.PRF, "0xA").allowed).toBe(false);

    clock.advance(60_001);
    expect(limiter.check(RateLimitBucketEnum.PRF, "0xA").allowed).toBe(true);
  });

  /**
   * Info: (20260812 - Luphia) 日窗口是獨立的一道：每分鐘只打 1 次永遠不會撞分鐘窗口，
   * 但打滿 200 次之後日窗口仍必須擋下來。少了這條，把 `DAY_MS` 那一列刪掉不會有人發現。
   */
  it("should still enforce the daily window when the minute window never fills", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);

    for (let i = 0; i < PRF_PER_DAY; i += 1) {
      expect(limiter.check(RateLimitBucketEnum.PRF, "0xA").allowed).toBe(true);
      clock.advance(61_000);
    }

    const rejected = limiter.check(RateLimitBucketEnum.PRF, "0xA");
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterSeconds).toBeGreaterThan(60);
  });

  /**
   * Info: (20260812 - Luphia) PRF 與 SIGNING 必須是兩個獨立的預算。
   *
   * 這是新增這個桶的**理由本身**：解鎖對話是每次進聊天室都會走一次的例行操作，
   * 而 SIGNING 是資金授權（5/min）。共用的話，重載幾次頁面就會擠掉當天的付款簽章額度 ——
   * 一個例行 UI 操作擋掉一個可用性關鍵的資金操作。
   */
  it("should not share its budget with the signing bucket", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);

    for (let i = 0; i < PRF_PER_MINUTE; i += 1) {
      limiter.check(RateLimitBucketEnum.PRF, "0xA");
    }
    expect(limiter.check(RateLimitBucketEnum.PRF, "0xA").allowed).toBe(false);

    // Info: (20260812 - Luphia) 同一個身份的簽章額度必須完好
    expect(limiter.check(RateLimitBucketEnum.SIGNING, "0xA").allowed).toBe(
      true,
    );
  });
});

/**
 * Info: (20260812 - Luphia) checklist 第 4 條的另一半：route 拿到的那份回應。
 *
 * **刻意不斷言 HTTP 429。** 規範第 3 條寫的是 429，但同一份文件開頭的 ⚠️ 說得很清楚：
 * `httpStatusOf()` 缺 `ApiCode.RATE_LIMIT` 的 case，限流回應實際是
 * **HTTP 500 + Retry-After**，所以只能靠 body 的 `errorCode` 辨識。
 *
 * 斷言 429 會讓這支測試從第一天就是紅的，那不是「守住規範」而是把一個已知缺陷
 * 偽裝成迴歸。這裡斷言**現在真正的契約**，並把落差寫在這裡 ——
 * 等 `httpStatusOf()` 補上那個 case，改這支測試就是那次修正的一部分。
 */
describe("enforceRateLimit response", () => {
  it("should carry the rate-limit error code and a Retry-After header", async () => {
    // Info: (20260812 - Luphia) 用獨立身份，避免與其他測試共用 module 層級的 limiter 計數
    const identity = "0xPRF_ENFORCE";

    let limited = null as ReturnType<typeof enforceRateLimit>;
    for (let i = 0; i <= 20 && limited === null; i += 1) {
      limited = enforceRateLimit(identity, RateLimitBucketEnum.PRF);
    }

    expect(limited).not.toBeNull();
    const response = limited as NonNullable<typeof limited>;
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);

    const body = (await response.json()) as { errorCode?: string };
    expect(body.errorCode).toBe(API_ERRORS.IS_RATE_LIMITED.code);
  });
});
