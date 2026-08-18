import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { POST as declineRoute } from "@/app/api/v1/invite/decline/route";
import { POST as resolveRoute } from "@/app/api/v1/invite/resolve/route";
import {
  declineInviteByToken,
  resolveInviteByToken,
} from "@/services/team_invitation.service";
import { RATE_LIMIT_RULES, RateLimitBucketEnum } from "@/constants/rate_limit";

/**
 * Info: (20260818 - Luphia) 限流要真的擋在**使用者走的那條路徑**上（第五輪 T-1）。
 *
 * 上一輪把限流測試從文字比對改成行為斷言，但改的是 `enforceInviteRateLimit`
 * 這支函式本身——「函式會不會擋」有了行為證據，「**有沒有真的擋在路徑上**」
 * 仍然只有 `indexOf` 比對。reviewer 的 mutation 說明了差別：
 *
 *     在 route 裡刪掉 `if (limited) return limited;`（保留那行呼叫）
 *     → 限流完全失效，而所有測試全綠（我實際跑過，18 passed）
 *
 * 所以這一檔**直接匯入 route handler 並呼叫它**。這是 `src/__tests__` 裡第一支
 * 這樣做的測試——先前沒有任何一支匯入 `@/app/api/...`，而那正是這個缺口存在的原因。
 *
 * mock 的邊界落在**外部世界**（service 會碰 DB 與寄信），限流器本身用真的：
 * 要證明的正是「請求走到這個 handler 時，會不會被那個真的限流器擋下來」。
 */

jest.mock("@/services/team_invitation.service", () => ({
  resolveInviteByToken: jest.fn(async () => ({
    teamId: "team-1",
    teamName: "測試團隊",
    role: "VIEWER",
    expiresAt: null,
  })),
  declineInviteByToken: jest.fn(async () => ({ teamId: "team-1" })),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

// Info: (20260818 - Luphia) 固定長度的合法 token，讓 validator 不會先擋下來
const TOKEN = "a".repeat(64);
const PER_MINUTE = RATE_LIMIT_RULES[RateLimitBucketEnum.INVITE_TOKEN][0].max;

function requestFrom(ip: string, path: string): NextRequest {
  return new NextRequest(`https://isunfa.com/api/v1/invite/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ token: TOKEN }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("邀請端點的限流真的擋在路徑上", () => {
  /**
   * Info: (20260818 - Luphia) 每個測試用獨立 IP：限流器是模組單例，
   * 共用 IP 會讓測試之間互相影響（而那種耦合正是這一檔要避免的東西）。
   */
  it("decline：超限之後不再進入 service，且回 429", async () => {
    const ip = "198.51.100.11";

    // Info: (20260818 - Luphia) 先把桶打滿——這些都應該正常進到 service
    for (let i = 0; i < PER_MINUTE; i += 1) {
      const ok = await declineRoute(requestFrom(ip, "decline"));
      expect(ok.status).toBe(200);
    }
    expect(asMock(declineInviteByToken)).toHaveBeenCalledTimes(PER_MINUTE);

    const blocked = await declineRoute(requestFrom(ip, "decline"));

    /**
     * Info: (20260818 - Luphia) 兩個斷言缺一不可：
     * 回應要是 429，而且**service 沒有被多呼叫一次**——後者才證明「擋下來」
     * 不是「擋了但還是做了」。刪掉 route 裡的 `if (limited) return limited;`
     * 時，回應會變成 200 且呼叫次數 +1，兩條都紅。
     */
    expect(blocked.status).toBe(429);
    expect(asMock(declineInviteByToken)).toHaveBeenCalledTimes(PER_MINUTE);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("resolve：超限之後不再查詢邀請，且回 429", async () => {
    const ip = "198.51.100.12";

    for (let i = 0; i < PER_MINUTE; i += 1) {
      await resolveRoute(requestFrom(ip, "resolve"));
    }
    expect(asMock(resolveInviteByToken)).toHaveBeenCalledTimes(PER_MINUTE);

    const blocked = await resolveRoute(requestFrom(ip, "resolve"));

    expect(blocked.status).toBe(429);
    expect(asMock(resolveInviteByToken)).toHaveBeenCalledTimes(PER_MINUTE);
  });

  /**
   * Info: (20260818 - Luphia) 另一半：**沒超限時要真的做事**。
   * 少了這一條，把 handler 改成「一律回 429」也會讓上面兩條通過。
   */
  it("未超限時照常進入 service", async () => {
    const response = await declineRoute(
      requestFrom("198.51.100.13", "decline"),
    );

    expect(response.status).toBe(200);
    expect(asMock(declineInviteByToken)).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260818 - Luphia) 順帶釘住 token 的驗證也在路徑上：
   * 格式不合的 token 不得走到 service（避免拿它去做雜湊與查詢）。
   */
  it("格式不合的 token 不會進入 service", async () => {
    const request = new NextRequest(
      "https://isunfa.com/api/v1/invite/decline",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.14",
        },
        body: JSON.stringify({ token: "too-short" }),
      },
    );

    const response = await declineRoute(request);

    expect(response.status).not.toBe(200);
    expect(asMock(declineInviteByToken)).not.toHaveBeenCalled();
  });
});
