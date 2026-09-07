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

jest.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: jest.fn(),
    teamQuotaUsage: {
      aggregate: jest.fn(async () => ({ _sum: { amount: BigInt(0) } })),
      create: jest.fn(),
    },
  };
  return {
    prisma: {
      teamQuotaUsage: {
        aggregate: jest.fn(async () => ({ _sum: { amount: BigInt(0) } })),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (arg: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    },
    txMock: tx,
  };
});

interface ITxMock {
  $executeRaw: ReturnType<typeof jest.fn>;
  teamQuotaUsage: {
    aggregate: ReturnType<typeof jest.fn>;
    create: ReturnType<typeof jest.fn>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { txMock } = require("@/lib/prisma") as { txMock: ITxMock };

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

/**
 * Info: (20260815 - Luphia) 額度的讀與寫必須在同一把鎖內（PR #6652 第二輪 C-6）。
 *
 * 「先 SUM 再寫入」中間沒有互斥時，併發的 N 個請求會讀到同一個 used、
 * 各自判斷「還有額度」、各寫一筆——超額幅度是併發數 × 單筆。
 * §5.1 容許的是「最後一筆超額」，指的是一筆。
 */
describe("teamQuotaUsageRepo.withMemberQuotaLock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("takes an advisory lock before running the operation", async () => {
    const order: string[] = [];
    txMock.$executeRaw.mockImplementation(async () => {
      order.push("lock");
      return 1;
    });

    await teamQuotaUsageRepo.withMemberQuotaLock(
      "team-1",
      "user-1",
      async () => {
        order.push("operation");
        return null;
      },
    );

    // Info: (20260815 - Luphia) 鎖必須先於操作——反過來就等於沒有鎖
    expect(order).toEqual(["lock", "operation"]);
  });

  it("scopes the lock to the member, not just the team", async () => {
    await teamQuotaUsageRepo.withMemberQuotaLock(
      "team-1",
      "user-1",
      async () => null,
    );

    /**
     * Info: (20260815 - Luphia) 鎖必須同時吃到 teamId 與 userId：
     * 只鎖團隊會讓不同成員互相阻塞，只鎖成員則跨團隊的同一人會互相阻塞。
     */
    const call = txMock.$executeRaw.mock.calls[0];
    expect(JSON.stringify(call)).toContain("team-1");
    expect(JSON.stringify(call)).toContain("user-1");
  });

  it("aggregates inside the locked transaction", async () => {
    txMock.teamQuotaUsage.aggregate.mockResolvedValue({
      _sum: { amount: BigInt(4) },
    });

    const usage = await teamQuotaUsageRepo.withMemberQuotaLock(
      "team-1",
      "user-1",
      (tx) =>
        teamQuotaUsageRepo.sumWindowUsageInTx(tx, "team-1", "user-1", 1, 2),
    );

    expect(usage).toEqual({ used5h: BigInt(4), usedWeek: BigInt(4) });
    // Info: (20260815 - Luphia) 讀取要走交易的 client，不能繞回全域 prisma
    expect(txMock.teamQuotaUsage.aggregate).toHaveBeenCalled();
    expect(prisma.teamQuotaUsage.aggregate).not.toHaveBeenCalled();
  });
});
