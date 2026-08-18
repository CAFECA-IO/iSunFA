import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import {
  MALFORMED_CLIENT_IP,
  resolveClientIp,
  UNIDENTIFIED_CLIENT_IP,
} from "@/lib/utils/client_ip";
import { RATE_LIMIT_RULES, RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceInviteRateLimit } from "@/lib/team/invite_rate_limit";

/**
 * Info: (20260818 - Luphia) 邀請連結三支端點的節流與紀錄（PR #6652 第三輪 D）。
 *
 * 猜 token 不是威脅（256-bit CSPRNG、DB 只存雜湊、失效與逾期回同一個 404）。
 * 真正沒防的是**未登入的 `decline`**：一次成功呼叫就讓一封邀請作廢、席次當場
 * 釋出，而先前既沒有節流也不記錄呼叫者是誰。
 */

/**
 * Info: (20260818 - Luphia) 三支端點都不再把 token 放在 path 上（第三輪 D）：
 * 目錄名是固定的動作名稱，token 由 POST body 帶入。
 */
const ROUTES = {
  resolve: join("src", "app", "api", "v1", "invite", "resolve", "route.ts"),
  accept: join("src", "app", "api", "v1", "invite", "accept", "route.ts"),
  decline: join("src", "app", "api", "v1", "invite", "decline", "route.ts"),
};

function codeOf(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

function request(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://isunfa.com/api/v1/invite/t", { headers });
}

describe("resolveClientIp", () => {
  /**
   * Info: (20260818 - Luphia) 取 `x-forwarded-for` 的**第一個**值。
   * 後面幾個是經手的代理各自附加的，其中包含用戶端自己送上來的那一段——
   * 取最後一個等於讓呼叫者自選限流維度。
   */
  it("取 x-forwarded-for 的第一個值", () => {
    expect(
      resolveClientIp(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
    ).toBe("203.0.113.7");
  });

  it("去掉空白", () => {
    expect(
      resolveClientIp(request({ "x-forwarded-for": "  203.0.113.7 " })),
    ).toBe("203.0.113.7");
  });

  it("沒有 x-forwarded-for 時退回 x-real-ip", () => {
    expect(resolveClientIp(request({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  /**
   * Info: (20260818 - Luphia) 兩個標頭都沒有時回固定字串，**不是** undefined 或隨機值。
   * 每次都給不同的維度等於沒有限流；歸到同一個桶是「寧可過嚴」的方向。
   */
  it("兩者都沒有時回 unknown", () => {
    expect(resolveClientIp(request({}))).toBe("unknown");
  });

  it("空字串不算有值", () => {
    expect(
      resolveClientIp(request({ "x-forwarded-for": "", "x-real-ip": "" })),
    ).toBe("unknown");
  });
});

describe("x-forwarded-for 的值必須是 IP（第五輪 C 高）", () => {
  /**
   * Info: (20260818 - Luphia) 這一組守的是「呼叫端不能自選限流桶」。
   *
   * 哨符本身是字串 `"unknown"`，而原本的實作「第一段非空就回傳」——送
   * `x-forwarded-for: unknown` 就會被判成無法識別，改用 300/min 的寬鬆桶。
   * `unknown` 也不只是刻意攻擊：Apache mod_proxy 與舊 squid 真的會這樣寫。
   */
  it("送 unknown 不會被當成 IP，也不會換到寬鬆桶的哨符", () => {
    expect(resolveClientIp(request({ "x-forwarded-for": "unknown" }))).toBe(
      MALFORMED_CLIENT_IP,
    );
  });

  // Info: (20260818 - Luphia) 全部收斂到同一個哨符：輪替垃圾值換不到更多桶
  it("任意垃圾值都收斂到同一個嚴格的維度", () => {
    for (const junk of ["abc", "1.2.3", "999.1.1.1", "::gg", "10.0.0.1:8080"]) {
      expect(resolveClientIp(request({ "x-forwarded-for": junk }))).toBe(
        MALFORMED_CLIENT_IP,
      );
    }
  });

  it("IPv4 與 IPv6 都認得", () => {
    expect(resolveClientIp(request({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
    expect(resolveClientIp(request({ "x-forwarded-for": "2001:db8::1" }))).toBe(
      "2001:db8::1",
    );
  });

  // Info: (20260818 - Luphia) XFF 是垃圾時仍要試 x-real-ip，而不是直接放棄
  it("XFF 不合法時退回 x-real-ip", () => {
    expect(
      resolveClientIp(
        request({ "x-forwarded-for": "unknown", "x-real-ip": "203.0.113.9" }),
      ),
    ).toBe("203.0.113.9");
  });

  it("兩個標頭都有值但都不合法時，走嚴格的維度", () => {
    expect(
      resolveClientIp(
        request({ "x-forwarded-for": "unknown", "x-real-ip": "nope" }),
      ),
    ).toBe(MALFORMED_CLIENT_IP);
  });

  /**
   * Info: (20260818 - Luphia) 對照組：**完全沒有標頭**才是寬鬆桶。
   * 兩者分開正是這條 finding 的重點——責任歸屬不同。
   */
  it("完全沒有來源標頭才回無法識別的哨符", () => {
    expect(resolveClientIp(request({}))).toBe(UNIDENTIFIED_CLIENT_IP);
  });

  /**
   * Info: (20260818 - Luphia) 最終效果：送 `unknown` **不會**換到寬鬆桶。
   * 這是這條 finding 的實質——一道 defence-in-depth 不能由被限的那方關掉。
   */
  it("送 unknown 仍落在嚴格的桶（20/min），換不到 300/min", () => {
    const spoofed = () =>
      new NextRequest("https://isunfa.com/api/v1/invite/resolve", {
        headers: { "x-forwarded-for": "unknown" },
      });
    const strict = RATE_LIMIT_RULES[RateLimitBucketEnum.INVITE_TOKEN][0].max;

    let blocked = false;
    // Info: (20260818 - Luphia) 只多打幾次：若換到寬鬆桶，這個次數遠不足以撞牆
    for (let i = 0; i <= strict; i += 1) {
      if (enforceInviteRateLimit(spoofed())) {
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
  });
});

describe("INVITE_TOKEN 限流桶", () => {
  it("有設定分鐘與每日兩個窗口", () => {
    const windows = RATE_LIMIT_RULES[RateLimitBucketEnum.INVITE_TOKEN];
    expect(windows).toHaveLength(2);
    expect(windows.map((w) => w.windowMs)).toEqual([60_000, 86_400_000]);
  });

  /**
   * Info: (20260818 - Luphia) 上限必須是正數。
   * `check()` 對 `max: 0` 會一律拒絕——那會讓所有人都加不進團隊，
   * 而誤限流在這條路徑上就是可用性事故。
   */
  it("兩個窗口的上限都是正數", () => {
    for (const window of RATE_LIMIT_RULES[RateLimitBucketEnum.INVITE_TOKEN]) {
      expect(window.max).toBeGreaterThan(0);
    }
  });
});

/**
 * Info: (20260818 - Luphia) 三支端點都要真的掛上。
 *
 * 本專案沒有 route handler 層的測試環境（`src/__tests__` 裡沒有任何一支匯入
 * `@/app/api/...`），因此以原始碼比對釘住。掃描根**明列這三支**：
 * 它不是「找全域違規」的測試，而是「這三個檔案必須各有一道閘」。
 */
/**
 * Info: (20260818 - Luphia) 限流改成**行為**斷言（第四輪 C 段建議）。
 *
 * 原本這一組是文字比對（「檔案裡有沒有出現 enforceRateLimit」），
 * 那種斷言在邏輯被抽成函式、或桶名改掉之後仍然是綠的。
 * 現在直接呼叫 `enforceInviteRateLimit`，讓它真的把第 21 次擋下來。
 */
describe("enforceInviteRateLimit", () => {
  const withIp = (ip: string) =>
    new NextRequest("https://isunfa.com/api/v1/invite/resolve", {
      headers: { "x-forwarded-for": ip },
    });

  const PER_MINUTE = RATE_LIMIT_RULES[RateLimitBucketEnum.INVITE_TOKEN][0].max;

  it("有 IP 時，超過每分鐘上限即擋下", () => {
    // Info: (20260818 - Luphia) 限流器是模組單例，每個測試用獨立 IP 以免互相干擾
    const ip = "203.0.113.21";

    for (let i = 0; i < PER_MINUTE; i += 1) {
      expect(enforceInviteRateLimit(withIp(ip))).toBeNull();
    }

    const blocked = enforceInviteRateLimit(withIp(ip));
    expect(blocked).not.toBeNull();
    // Info: (20260818 - Luphia) Retry-After 是「何時可以再試」的唯一線索
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
  });

  it("不同 IP 各自計數，不會互相拖累", () => {
    for (let i = 0; i < PER_MINUTE; i += 1) {
      enforceInviteRateLimit(withIp("203.0.113.22"));
    }

    expect(enforceInviteRateLimit(withIp("203.0.113.23"))).toBeNull();
  });

  /**
   * Info: (20260818 - Luphia) 本組最重要的一條：取不到 IP 時**不共用那個小桶**。
   *
   * 所有無 `x-forwarded-for` 的流量都是同一個維度（"unknown"）。若沿用
   * 20/分 的尺寸，全站受邀者每分鐘合計 20 次，第 21 位打開落地頁就是 429——
   * 而那個桶的註解自己寫著「誤限流在這條路徑上就是可用性事故」。
   */
  it("取不到 IP 時用寬鬆的共用桶，不是 20/分", () => {
    const noIp = () =>
      new NextRequest("https://isunfa.com/api/v1/invite/resolve");

    for (let i = 0; i < PER_MINUTE + 1; i += 1) {
      expect(enforceInviteRateLimit(noIp())).toBeNull();
    }
  });

  /**
   * Info: (20260818 - Luphia) 但仍然**不 fail-open**：寬鬆桶也有上限。
   * 無法識別呼叫者不等於不限流，只是限得鬆。
   */
  it("寬鬆桶仍有上限，只是比較寬", () => {
    const unidentified =
      RATE_LIMIT_RULES[RateLimitBucketEnum.INVITE_TOKEN_UNIDENTIFIED][0].max;
    expect(unidentified).toBeGreaterThan(PER_MINUTE);
    expect(Number.isFinite(unidentified)).toBe(true);
  });
});

/**
 * Info: (20260818 - Luphia) 三支端點都要真的掛上，且閘要在**做事之前**。
 *
 * 「有沒有掛上」與「順序」無法在沒有 route handler 測試環境的情況下行為驗證
 * （`src/__tests__` 裡沒有任何一支匯入 `@/app/api/...`），因此這一組仍是原始碼
 * 順序比對——但限流**本身**的行為已由上一組真的跑過。
 */
describe("三支邀請端點都掛上限流", () => {
  it("免登入的兩支走共用的邀請限流，accept 以 address 為維度", () => {
    for (const relative of [ROUTES.resolve, ROUTES.decline]) {
      expect(codeOf(relative)).toMatch(/enforceInviteRateLimit\(request\)/);
    }
    expect(codeOf(ROUTES.accept)).toMatch(
      /enforceRateLimit\(\s*sessionUser\.address/,
    );
    expect(codeOf(ROUTES.accept)).toMatch(/RateLimitBucketEnum\.INVITE_TOKEN/);
  });

  it("decline 的閘排在拒絕邀請之前", () => {
    const code = codeOf(ROUTES.decline);
    const gate = code.indexOf("enforceInviteRateLimit(");
    const action = code.indexOf("await declineInviteByToken(");
    expect(gate).toBeGreaterThan(-1);
    expect(action).toBeGreaterThan(gate);
  });

  it("resolve 的閘排在查詢邀請之前", () => {
    const code = codeOf(ROUTES.resolve);
    const gate = code.indexOf("enforceInviteRateLimit(");
    const action = code.indexOf("await resolveInviteByToken(");
    expect(gate).toBeGreaterThan(-1);
    expect(action).toBeGreaterThan(gate);
  });

  // Info: (20260818 - Luphia) 未登入的拒絕要留下呼叫者線索（IP / UA）
  it("decline 把 IP 與 UA 交給 service 記錄", () => {
    const code = codeOf(ROUTES.decline);
    expect(code).toMatch(/userAgent: request\.headers\.get\("user-agent"\)/);
    expect(code).toMatch(
      /declineInviteByToken\(parsed\.data\.token, Date\.now\(\), \{/,
    );
  });
});

/**
 * Info: (20260818 - Luphia) token 不得回到 URL 上（第三輪 D）。
 *
 * 這一組是回歸防線：`/invite/[token]` 那種目錄一旦重新出現，
 * 那把有效七天的鑰匙就又會進 access log 與 `Referer`。
 * 掃描根是**整個 `src/app`**（頁面與 API 都算），不是被修的那幾個檔案。
 */
describe("邀請 token 不出現在 URL 上", () => {
  /**
   * Info: (20260818 - Luphia) 掃描根是整個 `src/app`，但**分享連結**是既有功能、
   * 不在本 PR 範圍內，因此以明列例外處理：清單只能變短，不能變長。
   * 新增一條把秘密放在 path 上的路由就會紅。
   *
   * 那四條路由有同樣的形狀（分享用的 token 也會進 access log 與 `Referer`），
   * 值得單獨處理，但改動它們會牽到列印/匯出的分享流程。
   */
  const KNOWN_TOKEN_IN_PATH = [
    join("src", "app", "share", "pdf", "[token]"),
    join("src", "app", "share", "report", "[token]"),
    join("src", "app", "api", "v1", "admin", "pdf_editor", "share", "[token]"),
    join(
      "src",
      "app",
      "api",
      "v1",
      "user",
      "analysis",
      "[analysis_id]",
      "share",
      "[token]",
    ),
  ];

  it("除了既有的分享連結，沒有以 token 為動態片段的目錄", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = join(dir, entry.name);
        if (entry.name === "[token]") {
          offenders.push(full.slice(process.cwd().length + 1));
        }
        walk(full);
      }
    };
    walk(join(process.cwd(), "src", "app"));
    expect(offenders.sort()).toEqual([...KNOWN_TOKEN_IN_PATH].sort());
  });

  // Info: (20260818 - Luphia) 例外清單只能變短
  it("例外清單沒有變長", () => {
    expect(KNOWN_TOKEN_IN_PATH).toHaveLength(4);
  });

  // Info: (20260818 - Luphia) 三支端點一律從 body 取 token，且經 validator
  it("三支端點都從 body 取 token", () => {
    for (const relative of Object.values(ROUTES)) {
      const code = codeOf(relative);
      expect(code).toMatch(
        /inviteTokenBodySchema\.safeParse\(await request\.json\(\)\)/,
      );
      expect(code).not.toMatch(/params: Promise<\{ token: string \}>/);
    }
  });
});
