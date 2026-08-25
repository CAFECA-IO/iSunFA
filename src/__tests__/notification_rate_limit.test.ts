import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { RateLimitBucketEnum, RATE_LIMIT_RULES } from "@/constants/rate_limit";

/**
 * Info: (20260825 - Julian) 小鈴鐺端點的限流（計畫書 D2）。
 *
 * ## 為什麼要另開一支，而不是登記進 attendance_rate_limit.test.ts
 *
 * 那支測試的掃描根是
 * `src/app/api/v1/user/account_book/[account_book_id]/hr` —— 對照表的鍵是
 * HR 路由的相對路徑。`/api/v1/user/notifications/**` **登記不進去**，
 * 而「缺席也不會變紅」正是這條規則要防的事（檢查清單 §一.1：
 * 掃描型測試的價值等於它的掃描根）。
 *
 * 把那支的掃描根放大到整個 `src/app/api/v1` 是正解，但那要為既有的
 * 非 HR 路由建一份「只能變短」的例外清單，且會動到一個跨模組共用的
 * 測試檔 —— 那是另一個 PR 的範圍（計畫書 §6 的 (A)）。
 * 這裡先用同一個手法守住自己這一塊。
 *
 * ## 為什麼順序也要測
 *
 * 限流排在驗身分之後、業務邏輯之前。排到業務邏輯後面的話，
 * 打不到資料的那些次數就不計入 —— 而那個錯誤在程式碼裡看起來
 * 只是「兩行的位置不一樣」。
 */

const NOTIFICATION_API_DIR = join(
  process.cwd(),
  "src",
  "app",
  "api",
  "v1",
  "user",
  "notifications",
);

const listRouteFiles = (dir: string, prefix = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const nested = join(dir, entry.name);
    if (entry.isDirectory()) return listRouteFiles(nested, relative);
    return entry.name === "route.ts" ? [relative] : [];
  });

interface IHandler {
  file: string;
  method: string;
  body: string;
}

/**
 * Info: (20260825 - Julian) 把每個 handler 的函式本體切出來，逐一檢查。
 * 整檔一起 grep 會讓「兩支 handler、只有一支加了限流」通過測試。
 */
const listHandlers = (): IHandler[] => {
  const handlers: IHandler[] = [];

  for (const file of listRouteFiles(NOTIFICATION_API_DIR)) {
    const source = readFileSync(join(NOTIFICATION_API_DIR, file), "utf8");
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

/**
 * Info: (20260825 - Julian) 每一支 handler 該用哪個桶。
 *
 * 讀取類**不沿用 `READ`**：那個桶的尺寸是為「進頁面時取一次」訂的，
 * 而 summary 是每 60 秒一次的輪詢。共用會讓鈴鐺的背景輪詢擠壓
 * 使用者前景操作的額度（同 `PRF` 當初必須與 `SIGNING` 分開的理由）。
 */
const EXPECTED_BUCKET: Record<string, Record<string, RateLimitBucketEnum>> = {
  "route.ts": { GET: RateLimitBucketEnum.NOTIFICATION_READ },
  "summary/route.ts": { GET: RateLimitBucketEnum.NOTIFICATION_READ },
  "read/route.ts": { POST: RateLimitBucketEnum.NOTIFICATION_WRITE },
};

describe("小鈴鐺端點的限流覆蓋率", () => {
  // Info: (20260825 - Julian) 掃描根沒有掃到空氣
  it("掃描根底下確實有 route 檔", () => {
    expect(listRouteFiles(NOTIFICATION_API_DIR).length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260825 - Julian) 檔案集合必須與對照表一致。
   * 少一邊都要紅：新增端點沒登記（漏限流），或刪了端點沒清表（對照表開始說謊）。
   */
  it("route 檔集合與 bucket 對照表完全一致", () => {
    expect(listRouteFiles(NOTIFICATION_API_DIR).sort()).toEqual(
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
   * Info: (20260825 - Julian) 限流必須排在驗身分之後（維度是 `user.address`，
   * 沒有身分就沒有維度）、業務邏輯之前。
   * 以 service 呼叫當業務邏輯的起點。
   */
  it("enforceRateLimit 排在 getIdentityFromDeWT 之後、service 呼叫之前", () => {
    const wrong = listHandlers().flatMap((handler) => {
      const identityAt = handler.body.indexOf("getIdentityFromDeWT(");
      const limitAt = handler.body.indexOf("enforceRateLimit(");
      const serviceAt = handler.body.search(
        /(getNotificationSummary|listNotifications|markNotificationsRead)\(/,
      );
      if (identityAt === -1 || serviceAt === -1) return [];
      return identityAt < limitAt && limitAt < serviceAt
        ? []
        : [`${handler.file}:${handler.method}`];
    });

    expect(wrong).toEqual([]);
  });

  // Info: (20260825 - Julian) 每一支都得有這兩個錨點，否則上一條會被靜默跳過
  it("每一個 handler 都有 getIdentityFromDeWT 與 service 呼叫（上一條的前提）", () => {
    const withoutAnchors = listHandlers()
      .filter(
        (handler) =>
          !handler.body.includes("getIdentityFromDeWT(") ||
          handler.body.search(
            /(getNotificationSummary|listNotifications|markNotificationsRead)\(/,
          ) === -1,
      )
      .map((handler) => `${handler.file}:${handler.method}`);

    expect(withoutAnchors).toEqual([]);
  });
});

describe("小鈴鐺 bucket 的窗口設定", () => {
  /**
   * Info: (20260825 - Julian) 精確值而非門檻（檢查清單 §一.6）。
   * **改動請連同 `documents/architecture/notification_module_plan.md` §2 D2 一起改**，
   * 否則文件與程式碼會分岔。
   */
  it.each([
    [RateLimitBucketEnum.NOTIFICATION_READ, 30, 8_000],
    [RateLimitBucketEnum.NOTIFICATION_WRITE, 20, 500],
  ])("%s 的分鐘與每日上限是 %i / %i", (bucket, perMinute, perDay) => {
    const windows = RATE_LIMIT_RULES[bucket as RateLimitBucketEnum];

    expect(windows.map((window) => [window.windowMs, window.max])).toEqual([
      [60_000, perMinute],
      [86_400_000, perDay],
    ]);
  });

  /**
   * Info: (20260825 - Julian) 讀取桶必須有每日窗。
   *
   * 只有分鐘窗擋不住「每分鐘打滿、連打一整天」，而 summary 每次都是
   * 兩趟 DB（邀請查詢 + groupBy）。這正是它不能沿用 `READ` 的第二個理由 ——
   * 那個桶只有分鐘窗。
   */
  it("兩個小鈴鐺桶都有每日窗", () => {
    const buckets = [
      RateLimitBucketEnum.NOTIFICATION_READ,
      RateLimitBucketEnum.NOTIFICATION_WRITE,
    ];

    const withoutDailyWindow = buckets.filter(
      (bucket) =>
        !RATE_LIMIT_RULES[bucket].some(
          (window) => window.windowMs === 86_400_000,
        ),
    );

    expect(withoutDailyWindow).toEqual([]);
  });

  /**
   * Info: (20260825 - Julian) 不與 `READ` 共用 —— 這是一條會被「順手簡化」的決定。
   * 兩個桶的尺寸相同時看起來像重複，而合併的後果是背景輪詢擠壓前景操作。
   */
  it("NOTIFICATION_READ 與 READ 是不同的桶", () => {
    expect(RateLimitBucketEnum.NOTIFICATION_READ).not.toBe(
      RateLimitBucketEnum.READ,
    );
    expect(RATE_LIMIT_RULES[RateLimitBucketEnum.NOTIFICATION_READ]).not.toBe(
      RATE_LIMIT_RULES[RateLimitBucketEnum.READ],
    );
  });
});
