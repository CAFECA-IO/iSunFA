import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import * as seatQuoteRoute from "@/app/api/v1/user/team/[team_id]/seat_quote/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { quoteSeatAddition } from "@/services/team_seat.service";
import { SEAT_QUOTE_KIND } from "@/services/team_seat.service";

/**
 * Info: (20260818 - Luphia) 加席試算端點的接線（產品回報 20260818）。
 *
 * 這支端點的用途是「在扣款發生**之前**把金額講清楚」，所以它自己不能是新的洞：
 * 帳單資訊只能給 OWNER / ADMIN 看，而且它必須是唯讀的。
 *
 * 直接匯入 route handler 並呼叫它——`invite_route_wiring.test.ts` 的同一個理由：
 * 測到函式不等於測到接線（checklist §1.7）。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({ id: "user-1" })),
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getTeamMember: jest.fn(async () => ({ role: "OWNER" })) },
}));

jest.mock("@/services/team_seat.service", () => {
  const actual = jest.requireActual<
    typeof import("@/services/team_seat.service")
  >("@/services/team_seat.service");
  return {
    SEAT_QUOTE_KIND: actual.SEAT_QUOTE_KIND,
    quoteSeatAddition: jest.fn(async () => ({
      kind: actual.SEAT_QUOTE_KIND.CHARGE,
      amount: 420,
      currency: "TWD",
      seats: 1,
      seatsToCharge: 1,
      remainingDays: 15,
    })),
  };
});

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function get(seats?: string): {
  request: NextRequest;
  params: Promise<{ team_id: string }>;
} {
  const url = new URL("https://isunfa.com/api/v1/user/team/team-1/seat_quote");
  if (seats !== undefined) url.searchParams.set("seats", seats);
  return {
    request: new NextRequest(url, {
      headers: { authorization: "Bearer dewt" },
    }),
    params: Promise.resolve({ team_id: "team-1" }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({ id: "user-1" });
  asMock(teamRepo.getTeamMember).mockResolvedValue({ role: "OWNER" });
});

describe("GET /api/v1/user/team/[team_id]/seat_quote", () => {
  it("OWNER 拿得到試算結果", async () => {
    const { request, params } = get();

    const response = await seatQuoteRoute.GET(request, { params });
    const json = (await response.json()) as {
      payload?: { kind: string; amount: number };
    };

    expect(response.status).toBe(200);
    expect(json.payload).toMatchObject({
      kind: SEAT_QUOTE_KIND.CHARGE,
      amount: 420,
    });
  });

  it("未登入時不進入 service", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue(null);
    const { request, params } = get();

    const response = await seatQuoteRoute.GET(request, { params });

    expect(response.status).not.toBe(200);
    expect(quoteSeatAddition).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 這是團隊的帳單資訊：EDITOR / VIEWER 不得查詢。
   * 權限與邀請端點同一道——試算與真的送出看到的規則要一致，
   * 否則畫面會對一個其實不能邀請的人報價。
   */
  it.each(["EDITOR", "VIEWER"])(
    "%s 不得查詢，且不進入 service",
    async (role) => {
      asMock(teamRepo.getTeamMember).mockResolvedValue({ role });
      const { request, params } = get();

      const response = await seatQuoteRoute.GET(request, { params });

      expect(response.status).not.toBe(200);
      expect(quoteSeatAddition).not.toHaveBeenCalled();
    },
  );

  it("不是團隊成員也不得查詢", async () => {
    asMock(teamRepo.getTeamMember).mockResolvedValue(null);
    const { request, params } = get();

    const response = await seatQuoteRoute.GET(request, { params });

    expect(response.status).not.toBe(200);
    expect(quoteSeatAddition).not.toHaveBeenCalled();
  });

  // Info: (20260818 - Luphia) 席次數走 validator（`seatQuoteQuerySchema`），不是硬塞進 service
  it.each(["0", "-1", "abc", "999"])(
    "seats=%s 不合法時不進入 service",
    async (seats) => {
      const { request, params } = get(seats);

      const response = await seatQuoteRoute.GET(request, { params });

      expect(response.status).not.toBe(200);
      expect(quoteSeatAddition).not.toHaveBeenCalled();
    },
  );

  it("seats 省略時預設 1", async () => {
    const { request, params } = get();

    await seatQuoteRoute.GET(request, { params });

    expect(quoteSeatAddition).toHaveBeenCalledWith(
      expect.objectContaining({ seats: 1, teamId: "team-1" }),
    );
  });

  /**
   * Info: (20260818 - Luphia) 唯讀：這個模組不得匯出任何會寫入的 handler。
   *
   * 「試算」一旦長出 POST，就會有人把扣款接在它上面，而那正好繞過了整個
   * 「先揭露再收費」的設計。
   */
  it("只提供 GET，沒有任何寫入的 handler", () => {
    expect(Object.keys(seatQuoteRoute).sort()).toEqual(["GET"]);
  });
});

/**
 * Info: (20260819 - Luphia) 「沒有先試算過就不能送出」必須由**服務端**要求（review #6682 中）。
 *
 * 先前這條只活在送出按鈕的 `disabled` 陣列裡：把 `quoteFailed ||` 刪掉，行為就精準
 * 退回這個 PR 要修的事——試算掛掉照樣刷卡、事前事後都沒有金額，而服務端與 route
 * 層的測試一條都不會紅（全庫也沒有任何 modal 測試）。
 *
 * 這一組因此掃兩支邀請端點的原始碼，釘住「`expectedAmount` 是必填、而且被傳進扣款」。
 * 掃描而非行為斷言，是因為要證明的是**接線存在**，而那兩支端點的行為測試
 * 另有其檔（`invite_send_wiring.test.ts`）。
 */
describe("邀請端點要求 expectedAmount", () => {
  const ROUTES = [
    "src/app/api/v1/user/team/[team_id]/invitations/route.ts",
    "src/app/api/v1/user/team/[team_id]/invitations/email/route.ts",
  ];

  it.each(ROUTES)("%s 驗證並傳遞 expectedAmount", (relative) => {
    const source = readFileSync(join(process.cwd(), relative), "utf8");

    // Info: (20260819 - Luphia) 從 body 取出
    expect(source).toMatch(/expectedAmount\s*\}\s*=\s*body/);
    // Info: (20260819 - Luphia) 型別與非負的驗證（值為 0 也有效）
    expect(source).toMatch(/typeof expectedAmount !== "number"/);
    expect(source).toMatch(/expectedAmount < 0/);
    // Info: (20260819 - Luphia) 真的往下傳（只驗不傳＝驗完就丟掉）
    expect(source).toMatch(/expectedAmount,/);
  });
});
