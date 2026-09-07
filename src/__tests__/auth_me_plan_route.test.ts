import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";

import { GET as authMe } from "@/app/api/v1/auth/me/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import {
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) `/auth/me` 真的回得出方案（回報 20260819）。
 *
 * 這一支刻意**不 mock service**：缺陷正是在 route 與訂閱資料之間沒有接線
 * （route 從來沒有回過 plan 欄位），mock 掉中間那層就等於把缺陷本身 mock 掉。
 * 因此只 mock 最外圈的身分驗證、鏈上餘額與 repository，讓
 * route → service → `resolveEffectivePlanId` 這條路真的跑一次。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0x00000000000000000000000000000000000000b2",
    identityAddress: null,
    role: "USER",
  })),
}));

jest.mock("@/lib/auth/user_approval", () => ({
  resolveCustodyType: jest.fn(async () => "PASSKEY"),
}));

// Info: (20260819 - Luphia) 鏈上餘額查詢與方案無關，但不 mock 會真的連 RPC
jest.mock("@/lib/viem_public", () => ({
  publicClient: {
    readContract: jest.fn(async () => BigInt(0)),
  },
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    listOwnedTeamsWithSubscription: jest.fn(async () => []),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function ownedTeam(planId: string, overrides: Record<string, unknown> = {}) {
  return {
    teamId: `team-${planId}`,
    subscription: {
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      ...overrides,
    },
  };
}

async function callAuthMe() {
  const response = await authMe(
    new NextRequest("https://isunfa.com/api/v1/auth/me", {
      headers: { authorization: "Bearer dewt" },
    }),
  );
  return (await response.json()) as {
    payload: { plan?: string; ownedPlans?: string[] };
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({
    id: "user-1",
    address: "0x00000000000000000000000000000000000000b2",
    identityAddress: null,
    role: "USER",
  });
  asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([]);
});

describe("GET /api/v1/auth/me 的方案欄位", () => {
  it("沒有擁有任何團隊時回免費版", async () => {
    const body = await callAuthMe();

    expect(body.payload.plan).toBe(TEAM_PLAN.FREE);
    expect(body.payload.ownedPlans).toEqual([]);
  });

  /**
   * Info: (20260819 - Luphia) 這一條就是回報的症狀：訂閱是團隊版，畫面卻顯示免費版。
   */
  it("擁有訂閱中的團隊時回該方案", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.TEAM),
    ]);

    const body = await callAuthMe();

    expect(body.payload.plan).toBe(TEAM_PLAN.TEAM);
    expect(body.payload.ownedPlans).toEqual([TEAM_PLAN.TEAM]);
  });

  it("多個團隊時徽章取最高，逐團事實一併回傳", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.FREE),
      ownedTeam(TEAM_PLAN.BUSINESS),
    ]);

    const body = await callAuthMe();

    expect(body.payload.plan).toBe(TEAM_PLAN.BUSINESS);
    expect(body.payload.ownedPlans).toEqual([
      TEAM_PLAN.FREE,
      TEAM_PLAN.BUSINESS,
    ]);
  });

  /**
   * Info: (20260819 - Luphia) 過期與 PAST_DUE 一律折算為免費版。
   *
   * 與扣費側同一個判準（`resolveEffectivePlanId`）：畫面說團隊版而額度按免費版扣，
   * 比顯示免費版更糟——那會變成客服案件。
   */
  it("已過期的付費訂閱顯示免費版", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.TEAM, {
        currentPeriodEnd: new Date(Date.now() - 1000),
      }),
    ]);

    const body = await callAuthMe();

    expect(body.payload.plan).toBe(TEAM_PLAN.FREE);
  });

  it("PAST_DUE 的付費訂閱顯示免費版", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam(TEAM_PLAN.BUSINESS, {
        status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
      }),
    ]);

    const body = await callAuthMe();

    expect(body.payload.plan).toBe(TEAM_PLAN.FREE);
  });

  /**
   * Info: (20260819 - Luphia) 方案查不到**不能讓登入壞掉**。
   *
   * `refreshAuth` 拿不到 payload 就等於未登入：讓一個徽章用的查詢把整個 session
   * 拖下去，代價與收益完全不成比例。退成免費版顯示，並留下 log。
   */
  it("訂閱查詢失敗時仍回 200，方案退為免費版", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockRejectedValue(
      new Error("db down"),
    );

    const response = await authMe(
      new NextRequest("https://isunfa.com/api/v1/auth/me", {
        headers: { authorization: "Bearer dewt" },
      }),
    );
    const body = (await response.json()) as {
      payload: { plan?: string; ownedPlans?: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.payload.plan).toBe(TEAM_PLAN.FREE);
    expect(body.payload.ownedPlans).toEqual([]);
  });
});
