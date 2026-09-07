import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import { RateLimitBucketEnum, RATE_LIMIT_RULES } from "@/constants/rate_limit";

import { GET as getList } from "@/app/api/v1/user/notifications/route";
import { GET as getSummary } from "@/app/api/v1/user/notifications/summary/route";
import { GET as getHistory } from "@/app/api/v1/user/notifications/history/route";
import { POST as postReadOne } from "@/app/api/v1/user/notifications/[notification_id]/read/route";
import { GET as getTeamInvitations } from "@/app/api/v1/user/team/invitations/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getNotificationSummary,
  listNotificationHistory,
  listNotifications,
  markNotificationRead,
} from "@/services/notification.service";
import { listPendingInvitationsForUser } from "@/services/team_invitation.service";

/**
 * Info: (20260826 - Julian) 限流器用**真的**，只 mock 外部世界（review B5）。
 *
 * 這一檔原本全是 `readFileSync` 的原始碼比對：`enforceRateLimit(` 出現幾次、
 * bucket 名對不對、`indexOf` 的順序。那些都是「有沒有寫」的證據，
 * 不是「擋不擋得住」的證據 —— reviewer 的 mutation 說明了差別：
 *
 *     在 route 裡刪掉 `if (limited) return limited;`（保留呼叫那行）
 *     → 五支端點限流完全失效，而本檔與 `notification_bell_wiring.test.ts` 全綠
 *
 * `/summary` 是每 60 秒 × 在線人數、每次兩趟 DB 的端點，那不是可以只靠
 * 字串比對守住的東西。而 ADR 025 §7 早就宣稱「本模組自帶
 * `notification_rate_limit.test.ts`」—— 在補上這一段之前，那句話不成立。
 *
 * 手法照抄同 repo 已有的正解 `invite_route_wiring.test.ts`。
 */
jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xdefault",
  })),
}));

jest.mock("@/services/team_invitation.service", () => ({
  listPendingInvitationsForUser: jest.fn(async () => []),
}));

jest.mock("@/services/notification.service", () => ({
  getNotificationSummary: jest.fn(async () => ({
    todoCount: 0,
    completedCount: 0,
    latestUnreadAt: null,
  })),
  listNotifications: jest.fn(async () => ({
    todos: [],
    completed: [],
    hasMoreCompleted: false,
    /**
     * Info: (20260902 - Julian) 替身要回**真 service 回的每一個欄位**（B6／§1.8）。
     * `hasMoreTodos` 是 20260901 新增的，而這兩支替身當時沒跟上 —— 同一份檔案
     * 上面那段註解記的正是這個形狀：少一個欄位時 route 把它弄丟也不會有人紅。
     */
    hasMoreTodos: false,
  })),
  listNotificationHistory: jest.fn(async () => ({
    items: [],
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
  })),
  markNotificationRead: jest.fn(async () => false),
}));

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
  /**
   * Info: (20260826 - Julian) 分頁歷史（`/user/notifications` 頁面）走 `READ`。
   *
   * 與 summary 同桶是對的：它雖然是「進頁面時取一次」的形狀，
   * 但翻頁就是一次請求，而 30 次/分足夠人手翻頁，也擋得住腳本
   * 一頁一頁把整張表抓走。
   */
  "history/route.ts": { GET: RateLimitBucketEnum.NOTIFICATION_READ },
  /**
   * Info: (20260825 - Julian) 逐則已讀也走 `WRITE`，而且它比全部已讀更需要。
   *
   * 全部已讀一次就收乾淨，正常操作不會連打；逐則已讀的正常節奏是
   * 「一則一次請求」，使用者手上有 30 則歷史時，連點就是 30 次寫入。
   * 20 次/分的桶對這個節奏是緊的 —— 那是刻意的：真的要一次清空，
   * 該做的是加一顆「全部標為已讀」，不是讓逐則的桶變寬。
   */
  "[notification_id]/read/route.ts": {
    POST: RateLimitBucketEnum.NOTIFICATION_WRITE,
  },
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
        /(getNotificationSummary|listNotificationHistory|listNotifications|markNotificationRead)\(/,
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
            /(getNotificationSummary|listNotificationHistory|listNotifications|markNotificationRead)\(/,
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

/**
 * Info: (20260826 - Julian) 限流真的擋在**使用者走的那條路徑**上（review B5）。
 *
 * 上面那組掃描測試證明「寫了」，這一組證明「擋得住」。兩者都要：
 * 掃描擋得住「新增端點忘了加限流」（行為測試沒列舉到的端點不會紅），
 * 行為擋得住「加了但沒 return」（掃描看不出來）。
 *
 * 每支端點用**獨立位址**：限流器是模組單例，共用位址會讓測試互相影響。
 */
const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const READ_PER_MINUTE =
  RATE_LIMIT_RULES[RateLimitBucketEnum.NOTIFICATION_READ][0].max;
const WRITE_PER_MINUTE =
  RATE_LIMIT_RULES[RateLimitBucketEnum.NOTIFICATION_WRITE][0].max;

function requestAs(address: string, path: string, method = "GET"): NextRequest {
  asMock(getIdentityFromDeWT).mockResolvedValue({ id: "user-1", address });
  return new NextRequest(
    `https://isunfa.com/api/v1/user/notifications${path}`,
    {
      method,
      headers: { authorization: "Bearer dewt" },
      ...(method === "POST" ? { body: "{}" } : {}),
    },
  );
}

// Info: (20260826 - Julian) 逐則已讀的 handler 需要 params；其餘四支不需要
const ONE_ID = { params: Promise.resolve({ notification_id: "n-1" }) };

/**
 * Info: (20260826 - Julian) 五支端點各自的呼叫方式與它守著的 service。
 *
 * 以表格驅動而不是抄五遍：抄五遍時漏掉第五支不會紅，
 * 而「漏掉一支」正是這整組測試要防的事。上面的掃描測試會證明
 * 這張表沒有漏掉任何一支 route 檔。
 */
const ENDPOINTS = [
  {
    name: "list",
    perMinute: READ_PER_MINUTE,
    service: () => listNotifications,
    call: (address: string) => getList(requestAs(address, "")),
  },
  {
    name: "summary",
    perMinute: READ_PER_MINUTE,
    service: () => getNotificationSummary,
    call: (address: string) => getSummary(requestAs(address, "/summary")),
  },
  {
    name: "history",
    perMinute: READ_PER_MINUTE,
    service: () => listNotificationHistory,
    call: (address: string) => getHistory(requestAs(address, "/history")),
  },
  {
    name: "read-one",
    perMinute: WRITE_PER_MINUTE,
    service: () => markNotificationRead,
    call: (address: string) =>
      postReadOne(requestAs(address, "/n-1/read", "POST"), ONE_ID),
  },
] as const;

describe("限流真的擋在路徑上（行為）", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Info: (20260826 - Julian) 這張表必須蓋到**每一支** handler。
   *
   * 沒有這一條，新增第六支端點時：上面的掃描測試會逼你登記進 `EXPECTED_BUCKET`
   * （所以不會漏掉限流），但行為測試的表格漏掉它不會紅 —— 於是新端點只有
   * 「有沒有寫」的證據，沒有「擋不擋得住」的證據，而那正是 D25 的原始形狀。
   *
   * 比對的是 `listHandlers()`（每支 route 檔裡每一個 HTTP handler），
   * 不是 route 檔數：一個檔案日後放兩個 method 時，檔數會對而覆蓋率不對。
   */
  it("行為測試的表格蓋到每一支 handler", () => {
    expect(ENDPOINTS.length).toBe(listHandlers().length);
  });

  it.each(ENDPOINTS.map((endpoint) => [endpoint.name, endpoint] as const))(
    "%s：打滿桶之後回 429，且不再進入 service",
    async (name, endpoint) => {
      // Info: (20260826 - Julian) 位址含端點名，五支互不干擾
      const address = `0xrl_${name}`;

      for (let index = 0; index < endpoint.perMinute; index += 1) {
        const ok = await endpoint.call(address);
        expect(ok.status).toBe(200);
      }
      expect(asMock(endpoint.service())).toHaveBeenCalledTimes(
        endpoint.perMinute,
      );

      const blocked = await endpoint.call(address);

      /**
       * Info: (20260826 - Julian) 兩個斷言缺一不可（檢查清單 §1.7 的成對要求）。
       *
       * 回應要是 429，**而且 service 沒有被多呼叫一次** —— 後者才分得出
       * 「擋下來」與「擋了但還是做了」。刪掉 route 裡的
       * `if (limited) return limited;` 時，狀態會變成 200 且次數 +1，兩條都紅。
       */
      expect(blocked.status).toBe(429);
      expect(asMock(endpoint.service())).toHaveBeenCalledTimes(
        endpoint.perMinute,
      );
      expect(blocked.headers.get("Retry-After")).toBeTruthy();
    },
  );

  /**
   * Info: (20260826 - Julian) 沒有身分就不進限流，也不進 service。
   *
   * 限流的維度是 `user.address` —— 沒有身分就沒有維度。這一條同時證明
   * 上面那組的 200 不是因為「所有請求都被當成同一個人」。
   */
  it("未登入時不進入 service", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue(null);

    const response = await getSummary(
      new NextRequest("https://isunfa.com/api/v1/user/notifications/summary"),
    );

    expect(response.status).not.toBe(200);
    expect(asMock(getNotificationSummary)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) 三支讀取端點**共用**同一個桶。
   *
   * 那是刻意的（同一位使用者的讀取總量），而它的後果值得釘住：
   * 用 `/summary` 打滿桶之後，`/history` 也會被擋。分成三個桶的話，
   * 輪詢端點的額度就會被翻頁行為以外的東西各自消耗，總量失控。
   */
  it("讀取類三支共用同一個桶（跨端點生效）", async () => {
    const address = "0xrl_shared";

    for (let index = 0; index < READ_PER_MINUTE; index += 1) {
      const ok = await getSummary(requestAs(address, "/summary"));
      expect(ok.status).toBe(200);
    }

    const blockedHistory = await getHistory(requestAs(address, "/history"));

    expect(blockedHistory.status).toBe(429);
    expect(asMock(listNotificationHistory)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) `/team/invitations` 不是 `NOTIFICATION_READ` 的旁路。
   *
   * 那支端點與鈴鐺呼叫**同一支** `listPendingInvitationsForUser`、同樣兩趟 DB。
   * 它原本沒有限流（既有狀態），但兩條路徑合流是通知模組造成的 ——
   * 不把它收進同一個桶的話，30/分就多了一條完全等價的旁路，那個數字
   * 也就不再是上限。
   *
   * 桶刻意共用而不是另開一個：同一位使用者、同一份成本，分兩個桶等於把上限乘二。
   */
  it("/team/invitations 吃同一個讀取桶，不是旁路", async () => {
    const address = "0xrl_bypass";

    for (let index = 0; index < READ_PER_MINUTE; index += 1) {
      const ok = await getSummary(requestAs(address, "/summary"));
      expect(ok.status).toBe(200);
    }

    const blocked = await getTeamInvitations(
      requestAs(address, "/team-invitations-placeholder"),
    );

    expect(blocked.status).toBe(429);
    expect(asMock(listPendingInvitationsForUser)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) 讀取與寫入是**不同**的桶。
   *
   * 少了這條，「把兩個 bucket 都指到同一個 enum」也會讓上面全綠 ——
   * 而那會讓鈴鐺的背景輪詢吃掉使用者標記已讀的額度（D2 的原始理由）。
   */
  it("讀取桶打滿不影響寫入桶", async () => {
    const address = "0xrl_split";

    for (let index = 0; index < READ_PER_MINUTE; index += 1) {
      await getSummary(requestAs(address, "/summary"));
    }

    const write = await postReadOne(requestAs(address, "/n-1/read", "POST"), {
      params: Promise.resolve({ notification_id: "n-1" }),
    });

    expect(write.status).toBe(200);
    expect(asMock(markNotificationRead)).toHaveBeenCalledTimes(1);
  });
});
