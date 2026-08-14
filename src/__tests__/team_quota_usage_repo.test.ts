import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260814 - Luphia) 額度用量聚合的 where 條件（PR #6652 第二輪 B-5 #1）。
 *
 * `sumWindowUsage` 是「一人一池」的唯一實作點：把 `where` 裡的 `userId` 拿掉，
 * 行為 100% 退回「全隊共用、先用先得」——一個人可以在一個視窗內用光整隊的額度。
 *
 * 而那個 mutation 先前**不會讓任何測試變紅**：service 測試斷言的是「service 傳給 repo
 * 的參數」，repo 本身在那支測試裡被整個 mock 掉，而 `src/__tests__` 下沒有這支 repo 的測試。
 * 參數留著、where 拿掉，tsc 與 lint 都不會出聲（未開 noUnusedParameters）。
 * 這支測試補的就是那個缺口：驗的是真正送進 Prisma 的查詢條件。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    teamQuotaUsage: {
      aggregate: jest.fn(async () => ({ _sum: { amount: BigInt(0) } })),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

describe("teamQuotaUsageRepo.sumWindowUsage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(prisma.teamQuotaUsage.aggregate).mockResolvedValue({
      _sum: { amount: BigInt(7) },
    });
  });

  it("scopes both windows to the individual member, not the whole team", async () => {
    await teamQuotaUsageRepo.sumWindowUsage("team-1", "user-1", 111, 222);

    expect(prisma.teamQuotaUsage.aggregate).toHaveBeenCalledWith({
      where: { teamId: "team-1", userId: "user-1", windowKey5h: 111 },
      _sum: { amount: true },
    });
    expect(prisma.teamQuotaUsage.aggregate).toHaveBeenCalledWith({
      where: { teamId: "team-1", userId: "user-1", windowKeyWeek: 222 },
      _sum: { amount: true },
    });
  });

  it("returns the summed usage of both windows", async () => {
    const usage = await teamQuotaUsageRepo.sumWindowUsage(
      "team-1",
      "user-1",
      111,
      222,
    );

    expect(usage).toEqual({ used5h: BigInt(7), usedWeek: BigInt(7) });
  });

  /**
   * Info: (20260814 - Luphia) 查無用量列時回 0 而非 null：
   * 呼叫端拿這個值去做減法，null 會讓可用額度算成 NaN 而全部放行。
   */
  it("treats a missing sum as zero usage", async () => {
    asMock(prisma.teamQuotaUsage.aggregate).mockResolvedValue({
      _sum: { amount: null },
    });

    const usage = await teamQuotaUsageRepo.sumWindowUsage(
      "team-1",
      "user-1",
      111,
      222,
    );

    expect(usage).toEqual({ used5h: BigInt(0), usedWeek: BigInt(0) });
  });
});
