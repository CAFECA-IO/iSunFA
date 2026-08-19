import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { SlidingWindowRateLimiter } from "@/lib/rate_limiter";
import { RateLimitBucketEnum, RATE_LIMIT_RULES } from "@/constants/rate_limit";

/**
 * Info: (20260817 - Luphia) 出勤端點的限流（限流規範 + 母計畫 §10.3 的護欄 G6）。
 *
 * ## 掃描根是整個 HR API 命名空間，不是這一輪加的那 13 支
 *
 * 檢查清單 §一.1：掃描型測試的價值等於它的掃描根。只列出今天存在的檔案，
 * 下一支忘了加限流的端點不會讓任何東西變紅 —— 而那正是這條規則要防的事。
 * 因此掃描 `.../hr/` 底下**所有** `route.ts`，而 bucket 對照表要求
 * 「檔案集合 = 對照表的鍵集合」，新增端點不登記就會紅。
 *
 * ## 為什麼順序也要測
 *
 * `ATTENDANCE_PUNCH` 的整個意義建立在「失敗的嘗試也計入」上：圍欄判定在伺服器端，
 * 攻擊者唯一的手段是用不同座標反覆試到過關。若限流排在圍欄判定之後，
 * 被 403 的那些次數就不算，這條路完全暢通 —— 而那個錯誤在程式碼裡看起來
 * 只是「兩行的位置不一樣」。
 */

const HR_API_DIR = join(
  process.cwd(),
  "src",
  "app",
  "api",
  "v1",
  "user",
  "account_book",
  "[account_book_id]",
  "hr",
);

/**
 * Info: (20260817 - Luphia) 每一支 handler 該用哪個桶。
 *
 * 讀取類沿用既有 `READ`（母計畫 §10.3 的決定）：它只有分鐘窗、沒有每日上限，
 * 因此與 carbon 共用不會出現「一邊用完另一邊當天就不能用」那種互相擠壓 ——
 * 那正是 `PRF` 當初必須與 `SIGNING` 分開的理由，這裡不成立。
 */
const EXPECTED_BUCKET: Record<string, Record<string, RateLimitBucketEnum>> = {
  "attendance/punch/route.ts": {
    POST: RateLimitBucketEnum.ATTENDANCE_PUNCH,
  },
  "attendance/today/route.ts": { GET: RateLimitBucketEnum.READ },
  // Info: (20260818 - Julian) 身分查詢：純讀，走 READ
  "me/route.ts": { GET: RateLimitBucketEnum.READ },
  "attendance/location/route.ts": { GET: RateLimitBucketEnum.READ },
  "attendance/result/route.ts": { GET: RateLimitBucketEnum.READ },
  "attendance/schedule/route.ts": {
    GET: RateLimitBucketEnum.READ,
    // Info: (20260817 - Luphia) 寫入與讀取分屬不同桶：同一個檔案兩個 handler，兩種成本
    PUT: RateLimitBucketEnum.ATTENDANCE_WRITE,
  },
  "attendance/shift_pattern/route.ts": { GET: RateLimitBucketEnum.READ },
  "attendance/presence/route.ts": { GET: RateLimitBucketEnum.READ },
  "attendance/presence/location/[location_id]/route.ts": {
    GET: RateLimitBucketEnum.READ,
  },
  "attendance/presence/roster/export/route.ts": {
    POST: RateLimitBucketEnum.ATTENDANCE_EXPORT,
  },
  "attendance/leave/route.ts": { GET: RateLimitBucketEnum.READ },
  "attendance/leave/recall/route.ts": {
    POST: RateLimitBucketEnum.ATTENDANCE_WRITE,
  },
  "attendance/leave/recall/pending/route.ts": { GET: RateLimitBucketEnum.READ },
  "attendance/leave/recall/[recall_id]/respond/route.ts": {
    POST: RateLimitBucketEnum.ATTENDANCE_WRITE,
  },

  /**
   * Info: (20260818 - Julian) 假勤模組（計畫書 §10 的 L1–L33）。
   *
   * 寫入走 `LEAVE_WRITE` 而不是 `ATTENDANCE_WRITE`：兩者尺寸相同但額度分開，
   * 否則主管排完一個月的班之後，同一個人當天送不出自己的假單（見該 enum 的說明）。
   *
   * 試算（`request/preview`）是 POST 卻歸 `READ`：它不寫任何東西，
   * 而畫面上每改一次日期就呼叫一次 —— 掛在寫入桶會讓即時預覽在正常填單時就撞牆。
   */
  "leave/policy/route.ts": {
    GET: RateLimitBucketEnum.READ,
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "leave/policy/[policy_id]/route.ts": {
    GET: RateLimitBucketEnum.READ,
    PUT: RateLimitBucketEnum.LEAVE_WRITE,
    DELETE: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "leave/policy/[policy_id]/tier/route.ts": {
    GET: RateLimitBucketEnum.READ,
    PUT: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "leave/approval_rule/route.ts": {
    GET: RateLimitBucketEnum.READ,
    PUT: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "leave/balance/route.ts": { GET: RateLimitBucketEnum.READ },
  "leave/balance/ledger/route.ts": { GET: RateLimitBucketEnum.READ },
  "leave/balance/adjust/route.ts": { POST: RateLimitBucketEnum.LEAVE_WRITE },
  "leave/balance/accrue/route.ts": { POST: RateLimitBucketEnum.LEAVE_WRITE },
  "leave/request/route.ts": {
    GET: RateLimitBucketEnum.READ,
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "leave/request/pending/route.ts": { GET: RateLimitBucketEnum.READ },
  "leave/request/preview/route.ts": { POST: RateLimitBucketEnum.READ },
  "leave/request/[request_id]/route.ts": {
    GET: RateLimitBucketEnum.READ,
    DELETE: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "leave/request/[request_id]/approve/route.ts": {
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "leave/request/[request_id]/reject/route.ts": {
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },

  /**
   * Info: (20260818 - Julian) 加班（L24–L30）。同屬假勤模組，沿用 `LEAVE_WRITE`：
   * 額度與假單共用一個桶是刻意的 —— 一個人一天送幾張加班單與幾張假單，
   * 加起來才是他對這個模組的寫入節奏。
   */
  "overtime/request/route.ts": {
    GET: RateLimitBucketEnum.READ,
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "overtime/request/pending/route.ts": { GET: RateLimitBucketEnum.READ },
  "overtime/request/[request_id]/withdraw/route.ts": {
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "overtime/summary/route.ts": { GET: RateLimitBucketEnum.READ },
  "overtime/unapproved/route.ts": { GET: RateLimitBucketEnum.READ },
  "overtime/policy/route.ts": {
    GET: RateLimitBucketEnum.READ,
    PUT: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "overtime/request/[request_id]/approve/route.ts": {
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "overtime/request/[request_id]/emergency/route.ts": {
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
  "overtime/request/[request_id]/reject/route.ts": {
    POST: RateLimitBucketEnum.LEAVE_WRITE,
  },
};

const listRouteFiles = (dir: string, prefix = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const nested = join(dir, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listRouteFiles(nested, relative);
    return entry.name === "route.ts" ? [relative] : [];
  });

interface IHandler {
  file: string;
  method: string;
  body: string;
}

/**
 * Info: (20260817 - Luphia) 把每個 handler 的函式本體切出來，逐一檢查。
 * 整檔一起 grep 會讓「兩支 handler、只有一支加了限流」通過測試。
 */
const listHandlers = (): IHandler[] => {
  const handlers: IHandler[] = [];

  for (const file of listRouteFiles(HR_API_DIR)) {
    const source = readFileSync(join(HR_API_DIR, file), "utf8");
    const pattern = /^export async function (GET|POST|PUT|PATCH|DELETE)\(/gm;
    const starts = [...source.matchAll(pattern)].map((match) => ({
      index: match.index ?? 0,
      method: match[1],
    }));

    starts.forEach((start, order) => {
      const end = starts[order + 1]?.index ?? source.length;
      handlers.push({
        file,
        method: start.method,
        body: source.slice(start.index, end),
      });
    });
  }

  return handlers;
};

describe("HR 端點的限流覆蓋率", () => {
  // Info: (20260817 - Luphia) 掃描根沒有掃到空氣（同 e2e_production_guard 的第一條）
  it("掃描根底下確實有 route 檔", () => {
    expect(listRouteFiles(HR_API_DIR).length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260817 - Luphia) 檔案集合必須與對照表一致。
   * 少一邊都要紅：新增端點沒登記（漏限流），或刪了端點沒清表（對照表開始說謊）。
   */
  it("route 檔集合與 bucket 對照表完全一致", () => {
    expect(listRouteFiles(HR_API_DIR).sort()).toEqual(
      Object.keys(EXPECTED_BUCKET).sort(),
    );
  });

  it("每一個 handler 都恰好呼叫一次 enforceRateLimit", () => {
    const missing = listHandlers().filter(
      (handler) =>
        (handler.body.match(/enforceRateLimit\(/g) ?? []).length !== 1,
    );

    expect(
      missing.map((handler) => `${handler.file}:${handler.method}`),
    ).toEqual([]);
  });

  it("每一個 handler 用的是對照表登記的 bucket", () => {
    const wrong = listHandlers().flatMap((handler) => {
      const expected = EXPECTED_BUCKET[handler.file]?.[handler.method];
      const used = /RateLimitBucketEnum\.([A-Z_]+)/.exec(handler.body)?.[1];
      return expected === used
        ? []
        : [`${handler.file}:${handler.method} 用了 ${used}，應為 ${expected}`];
    });

    expect(wrong).toEqual([]);
  });

  /**
   * Info: (20260817 - Luphia) 限流必須排在業務邏輯之前，否則「失敗的嘗試也計入」不成立。
   *
   * 以 `resolveEmployee` 當業務邏輯的起點：每一支都靠它把登入身分換成員工檔，
   * 而打卡的圍欄判定在它之後。限流的位置若跑到它後面，圍欄外的失敗就不再計入。
   */
  it("enforceRateLimit 排在 resolveEmployee 之前", () => {
    const late = listHandlers().flatMap((handler) => {
      const limitAt = handler.body.indexOf("enforceRateLimit(");
      const businessAt = handler.body.indexOf("resolveEmployee(");
      if (businessAt === -1) return [];
      return limitAt < businessAt ? [] : [`${handler.file}:${handler.method}`];
    });

    expect(late).toEqual([]);
  });

  // Info: (20260817 - Luphia) 每一支都得經過 resolveEmployee，否則上一條會被靜默跳過
  it("每一個 handler 都有 resolveEmployee（上一條的前提）", () => {
    const withoutBusinessAnchor = listHandlers()
      .filter((handler) => !handler.body.includes("resolveEmployee("))
      .map((handler) => `${handler.file}:${handler.method}`);

    expect(withoutBusinessAnchor).toEqual([]);
  });
});

describe("出勤與假勤 bucket 的窗口設定", () => {
  /**
   * Info: (20260817 - Luphia) 精確值而非門檻（檢查清單 §一.6）。
   * 這些數字取自母計畫 §10.3；**改動請連同該節一起改**，否則文件與程式碼會分岔。
   */
  it.each([
    [RateLimitBucketEnum.ATTENDANCE_PUNCH, 5, 40],
    [RateLimitBucketEnum.ATTENDANCE_WRITE, 30, 500],
    [RateLimitBucketEnum.ATTENDANCE_EXPORT, 6, 60],
    // Info: (20260818 - Julian) 與 `ATTENDANCE_WRITE` 同尺寸，但額度分開（見該 enum）
    [RateLimitBucketEnum.LEAVE_WRITE, 30, 500],
  ])("%s 的分鐘與每日上限是 %i / %i", (bucket, perMinute, perDay) => {
    const windows = RATE_LIMIT_RULES[bucket as RateLimitBucketEnum];

    expect(windows.map((window) => [window.windowMs, window.max])).toEqual([
      [60_000, perMinute],
      [86_400_000, perDay],
    ]);
  });

  /**
   * Info: (20260817 - Luphia) 每一個桶都要有每日上限。
   *
   * 只有分鐘窗的桶擋不住「每分鐘打滿、連打一整天」：出勤的三個桶寫的都是
   * 法定文件或個資稽核軌跡，那種節奏一天就能塞進五萬列。
   * 讀取類沿用 `READ`（只有分鐘窗）是刻意的 —— 它不寫入任何東西。
   */
  it("四個人事寫入桶都有每日窗", () => {
    const hrBuckets = [
      RateLimitBucketEnum.ATTENDANCE_PUNCH,
      RateLimitBucketEnum.ATTENDANCE_WRITE,
      RateLimitBucketEnum.ATTENDANCE_EXPORT,
      // Info: (20260818 - Julian) 假單與額度帳同樣是「寫進去就要留著」的資料
      RateLimitBucketEnum.LEAVE_WRITE,
    ];

    const withoutDailyWindow = hrBuckets.filter(
      (bucket) =>
        !RATE_LIMIT_RULES[bucket].some(
          (window) => window.windowMs === 86_400_000,
        ),
    );

    expect(withoutDailyWindow).toEqual([]);
  });
});

describe("打卡連打的實際行為", () => {
  const buildClock = (start = 0) => {
    let current = start;
    return {
      now: () => current,
      advance: (ms: number) => {
        current += ms;
      },
    };
  };

  it("超過分鐘上限即拒絕，並給出 Retry-After 秒數", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);
    const [perMinute] = RATE_LIMIT_RULES[RateLimitBucketEnum.ATTENDANCE_PUNCH];

    for (let attempt = 0; attempt < perMinute.max; attempt += 1) {
      expect(
        limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xSITE").allowed,
      ).toBe(true);
    }

    const rejected = limiter.check(
      RateLimitBucketEnum.ATTENDANCE_PUNCH,
      "0xSITE",
    );
    expect(rejected.allowed).toBe(false);
    // Info: (20260817 - Luphia) 全部命中都在 t=0，窗口 60 秒，因此整整 60 秒後才恢復
    expect(rejected.retryAfterSeconds).toBe(60);
  });

  it("窗口滑過之後恢復", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);
    const [perMinute] = RATE_LIMIT_RULES[RateLimitBucketEnum.ATTENDANCE_PUNCH];

    for (let attempt = 0; attempt < perMinute.max; attempt += 1) {
      limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xSITE");
    }
    expect(
      limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xSITE").allowed,
    ).toBe(false);

    clock.advance(60_001);
    expect(
      limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xSITE").allowed,
    ).toBe(true);
  });

  /**
   * Info: (20260817 - Luphia) 一個人打滿不影響另一個人。
   * 維度是身分 × bucket；少了身分這一維，工地上第一個打完卡的人會把其餘所有人擋在外面。
   */
  it("不同身分各自計數", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);
    const [perMinute] = RATE_LIMIT_RULES[RateLimitBucketEnum.ATTENDANCE_PUNCH];

    for (let attempt = 0; attempt < perMinute.max; attempt += 1) {
      limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xA");
    }

    expect(
      limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xA").allowed,
    ).toBe(false);
    expect(
      limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xB").allowed,
    ).toBe(true);
  });

  /**
   * Info: (20260817 - Luphia) 打卡與讀取不共用計數。
   * 共用的後果是「站在工地上重新整理幾次頁面，就打不了卡」——
   * 而那個症狀會被當成定位問題查很久。
   */
  it("打卡桶與讀取桶互不影響", () => {
    const clock = buildClock();
    const limiter = new SlidingWindowRateLimiter(RATE_LIMIT_RULES, clock.now);
    const [perMinute] = RATE_LIMIT_RULES[RateLimitBucketEnum.ATTENDANCE_PUNCH];

    for (let attempt = 0; attempt < perMinute.max; attempt += 1) {
      limiter.check(RateLimitBucketEnum.ATTENDANCE_PUNCH, "0xA");
    }

    expect(limiter.check(RateLimitBucketEnum.READ, "0xA").allowed).toBe(true);
  });
});
