import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { assertCanOwnAnotherFreeTeam } from "@/services/team.service";
import { teamRepo } from "@/repositories/team.repo";
import {
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 一個人只能**擁有**一個免費團隊（產品決定 20260819）。
 *
 * 邀請量的兩道上限（同時未接受數、每日寄送數）是 per-team 的，而建立團隊先前
 * 沒有數量上限也沒有限流——一個帳號建 10 個免費團隊就有 10 份額度，兩道上限
 * 一次都不會觸發（review #6684 中）。
 */

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { listOwnedTeamsWithSubscription: jest.fn(async () => []) },
}));
jest.mock("@/repositories/user.repo", () => ({
  userRepo: { findMany: jest.fn() },
}));
jest.mock("@/lib/utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_SEC = 1786075200;
const FUTURE = new Date((NOW_SEC + 86_400) * 1000);
const PAST = new Date((NOW_SEC - 86_400) * 1000);

beforeEach(() => {
  jest.clearAllMocks();
  asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([]);
});

describe("assertCanOwnAnotherFreeTeam", () => {
  it("一個都沒有時放行", async () => {
    await expect(
      assertCanOwnAnotherFreeTeam("user-1", NOW_SEC),
    ).resolves.toBeUndefined();
  });

  it("已經擁有一個免費團隊時擋下", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      { teamId: "team-1", subscription: null },
    ]);

    await expect(
      assertCanOwnAnotherFreeTeam("user-1", NOW_SEC),
    ).rejects.toMatchObject({ code: "TW000026" });
  });

  /**
   * Info: (20260819 - Luphia) 付費團隊不算：那些團隊每一席都在收費，
   * 本來就有經濟上的煞車，再擋一次等於不讓客戶多開團隊。
   */
  it("擁有的是付費團隊時放行", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      {
        teamId: "team-1",
        subscription: {
          planId: TEAM_PLAN.TEAM,
          status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodEnd: FUTURE,
        },
      },
    ]);

    await expect(
      assertCanOwnAnotherFreeTeam("user-1", NOW_SEC),
    ).resolves.toBeUndefined();
  });

  /**
   * Info: (20260819 - Luphia) 「什麼是免費方案」交給 `resolveEffectivePlanId`：
   * 過期或非 ACTIVE 的訂閱一律視為免費。否則「讓訂閱過期」就是繞過這道上限的方法。
   */
  it.each([
    ["訂閱已過期", TEAM_SUBSCRIPTION_STATUS.ACTIVE, PAST],
    ["訂閱已取消", TEAM_SUBSCRIPTION_STATUS.CANCELED, FUTURE],
  ])("%s 的團隊算免費團隊，擋下", async (_label, status, periodEnd) => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      {
        teamId: "team-1",
        subscription: {
          planId: TEAM_PLAN.TEAM,
          status,
          currentPeriodEnd: periodEnd,
        },
      },
    ]);

    await expect(
      assertCanOwnAnotherFreeTeam("user-1", NOW_SEC),
    ).rejects.toMatchObject({ code: "TW000026" });
  });

  /**
   * Info: (20260819 - Luphia) 只算 OWNER —— 這一條由 repo 的查詢保證
   * （`where: { role: OWNER }`）。被別人邀請加入的團隊不是他能開的量，
   * 算進去等於因為別人的行為擋住他建立自己的團隊。
   */
  it("只看擁有的團隊（查詢限定 OWNER）", async () => {
    await assertCanOwnAnotherFreeTeam("user-1", NOW_SEC);

    expect(
      asMock(teamRepo.listOwnedTeamsWithSubscription),
    ).toHaveBeenCalledWith("user-1");
  });
});
