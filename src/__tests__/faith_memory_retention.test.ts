import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { runFaithMemoryRetention } from "@/services/cron/faith_memory_retention.cron";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import {
  cancelFaithMemoryExpiry,
  scheduleFaithMemoryExpiry,
} from "@/services/faith_memory.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { FAITH_MEMORY_DELETION_REASON } from "@/constants/faith_memory";

/**
 * Info: (20260817 - Luphia) 保留期守護行程（第一輪 C-1、規範 §7.2）。
 *
 * 這支是條款 §3.7 與隱私政策 §5 那句「90 天後刪除」的執行者。
 * 它沒跑或跑錯不是「少一個背景任務」，是承諾沒有兌現。
 */

jest.mock("@/repositories/faith_memory.repo", () => ({
  faithMemoryRepo: {
    listTeamRetentionState: jest.fn(async () => []),
    listExpired: jest.fn(async () => []),
    deleteWithLog: jest.fn(async () => undefined),
  },
}));

jest.mock("@/services/faith_memory.service", () => ({
  scheduleFaithMemoryExpiry: jest.fn(async () => 1),
  cancelFaithMemoryExpiry: jest.fn(async () => 1),
}));
/**
 * Info: (20260818 - Luphia) 訂閱改為批次載入（第三輪 C-10）：對帳不再逐團隊
 * 呼叫 `isFaithMemoryEnabled`（那支每次都會自己查一次訂閱，正是 N+1 的來源）。
 */
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { listByTeamIds: jest.fn(async () => []) },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;
const NOW_MS = 1_760_000_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  asMock(faithMemoryRepo.listTeamRetentionState).mockResolvedValue([]);
  asMock(faithMemoryRepo.listExpired).mockResolvedValue([]);
  asMock(teamSubscriptionRepo.listByTeamIds).mockResolvedValue([]);
  asMock(scheduleFaithMemoryExpiry).mockResolvedValue(1);
  asMock(cancelFaithMemoryExpiry).mockResolvedValue(1);
});

describe("runFaithMemoryRetention", () => {
  /**
   * Info: (20260817 - Luphia) 對帳而非掛事件：降級路徑不只一條，
   * 而這個功能上線前就已經降級的團隊根本沒有事件可掛。
   */
  it("為已降級的團隊排定刪除", async () => {
    asMock(faithMemoryRepo.listTeamRetentionState).mockResolvedValue([
      { teamId: "team-free", _count: { _all: 3 } },
    ]);
    // Info: (20260818 - Luphia) 查無訂閱＝免費版（fail-closed）
    asMock(teamSubscriptionRepo.listByTeamIds).mockResolvedValue([]);

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(scheduleFaithMemoryExpiry).toHaveBeenCalledWith("team-free", NOW_MS);
    expect(result.scheduled).toBe(1);
  });

  // Info: (20260817 - Luphia) 恢復訂閱即取消排定的刪除，記憶延續（規範 §7.1）
  it("為付費中的團隊取消已排定的刪除", async () => {
    asMock(faithMemoryRepo.listTeamRetentionState).mockResolvedValue([
      { teamId: "team-paid", _count: { _all: 2 } },
    ]);
    asMock(teamSubscriptionRepo.listByTeamIds).mockResolvedValue([
      {
        teamId: "team-paid",
        planId: "team",
        status: "ACTIVE",
        currentPeriodEnd: new Date(NOW_MS + 86_400_000),
      },
    ]);

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(cancelFaithMemoryExpiry).toHaveBeenCalledWith("team-paid");
    expect(scheduleFaithMemoryExpiry).not.toHaveBeenCalled();
    expect(result.cancelled).toBe(1);
  });

  /**
   * Info: (20260817 - Luphia) 到期即**硬刪除**並寫稽核。
   * 條款承諾的是「刪除」，留一筆 deletedAt 不算刪除。
   */
  it("刪除到期的記憶並標明原因", async () => {
    // Info: (20260818 - Luphia) 一輪內會分批清到沒有為止，第二批回空表示清完
    asMock(faithMemoryRepo.listExpired)
      .mockResolvedValueOnce([
        { id: "m1", userId: "u1", teamId: "t1", itemCount: 4 },
      ])
      .mockResolvedValueOnce([]);

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(faithMemoryRepo.deleteWithLog).toHaveBeenCalledWith({
      id: "m1",
      userId: "u1",
      teamId: "t1",
      itemCount: 4,
      reason: FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    });
    expect(result.deleted).toBe(1);
  });

  /**
   * Info: (20260817 - Luphia) 一筆壞資料不該讓其他所有到期的記憶都留下來——
   * 那是「該刪的沒刪」，屬合規風險。失敗要計數，且下一輪會再試。
   */
  it("單筆刪除失敗不中斷整批", async () => {
    asMock(faithMemoryRepo.listExpired)
      .mockResolvedValueOnce([
        { id: "m1", userId: "u1", teamId: "t1", itemCount: 1 },
        { id: "m2", userId: "u2", teamId: "t2", itemCount: 2 },
      ])
      .mockResolvedValueOnce([]);
    asMock(faithMemoryRepo.deleteWithLog)
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(undefined);

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(result.failed).toBe(1);
    expect(result.deleted).toBe(1);
  });

  it("沒有任何記憶時安靜結束", async () => {
    const result = await runFaithMemoryRetention(NOW_MS);
    expect(result).toEqual({
      scheduled: 0,
      cancelled: 0,
      deleted: 0,
      failed: 0,
    });
  });

  /**
   * Info: (20260818 - Luphia) 訂閱一次批次載入（第三輪 C-10）。
   *
   * 原本每個團隊打一趟 `getByTeamId` 且完全序列——一萬個有記憶的團隊就是
   * 一萬趟往返。這支跑得越久，落後的刪除就越多，而落後期間資料仍留在庫裡
   * 超過條款承諾的期間。
   */
  it("對帳只查一次訂閱，不是每個團隊一次", async () => {
    asMock(faithMemoryRepo.listTeamRetentionState).mockResolvedValue([
      { teamId: "t1", _count: { _all: 1 } },
      { teamId: "t2", _count: { _all: 1 } },
      { teamId: "t3", _count: { _all: 1 } },
    ]);

    await runFaithMemoryRetention(NOW_MS);

    expect(teamSubscriptionRepo.listByTeamIds).toHaveBeenCalledTimes(1);
    expect(teamSubscriptionRepo.listByTeamIds).toHaveBeenCalledWith([
      "t1",
      "t2",
      "t3",
    ]);
  });

  /**
   * Info: (20260818 - Luphia) 一輪內清到沒有為止（第三輪 C-10）。
   *
   * 原本是「每輪 500 筆、每 6 小時一次」＝每日上限 2,000 筆。大批同期到期
   * 會逐日落後，而落後期間資料留庫超過條款期間。
   */
  it("一輪內分批清空，不是只清一批", async () => {
    asMock(faithMemoryRepo.listExpired)
      .mockResolvedValueOnce([
        { id: "m1", userId: "u1", teamId: "t1", itemCount: 1 },
      ])
      .mockResolvedValueOnce([
        { id: "m2", userId: "u2", teamId: "t2", itemCount: 1 },
      ])
      .mockResolvedValueOnce([]);

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(result.deleted).toBe(2);
    expect(asMock(faithMemoryRepo.listExpired).mock.calls).toHaveLength(3);
  });

  /**
   * Info: (20260818 - Luphia) 部分失敗時要**在毒資料那一批**停下（第四輪 B-4）。
   *
   * 停止條件原本比對累計 `failed` 與本批長度，而先前只餵「單列、單批、全失敗」
   * ——那剛好是累計等於本批的唯一一格，於是那個 bug 全綠。
   *
   * 這裡餵混合批：第一批 2 列（1 成功 1 毒），第二批只剩那列毒資料。
   * 正確行為是第二批 `batchFailed === expired.length` 成立即停，總共撈 2 次；
   * 用累計值比對則是 `1 === 2` 不成立而繼續，之後永遠不相等，
   * 一路轉到每輪總量上限（約 4,750 次無用迴圈、約 9,500 筆 error log），
   * 而失敗吃掉刪除預算，本輪其餘到期的列一列都刪不到。
   */
  it("部分失敗後在毒資料那一批停下，不是累計比對", async () => {
    const BAD = { id: "bad", userId: "u2", teamId: "t2", itemCount: 1 };
    let fetches = 0;
    /**
     * Info: (20260818 - Luphia) mock 自己當上界：撈超過 2 次就丟錯。
     *
     * 不這樣做的話，壞掉的版本會安靜地轉到每輪總量上限（10,000）才結束——
     * 測試最後仍會紅，但要跑上兩分鐘。讓多餘的那一次呼叫當場失敗，
     * 迴圈沒停的症狀就變成一個立即、訊息明確的失敗。
     */
    asMock(faithMemoryRepo.listExpired).mockImplementation(async () => {
      fetches += 1;
      if (fetches > 2) {
        throw new Error("listExpired 被撈第三次：毒資料批沒有讓迴圈停下");
      }
      return fetches === 1
        ? [{ id: "ok", userId: "u1", teamId: "t1", itemCount: 1 }, BAD]
        : [BAD];
    });
    asMock(faithMemoryRepo.deleteWithLog).mockImplementation(
      async (params: unknown) => {
        const { id } = params as { id: string };
        if (id === "bad") throw new Error("poison row");
        return undefined;
      },
    );

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(result.deleted).toBe(1);
    expect(result.failed).toBe(2);
    expect(fetches).toBe(2);
  });

  /**
   * Info: (20260818 - Luphia) 失敗不得吃掉刪除預算（第五輪 C-3）。
   *
   * 上界原本是 `deleted + failed`：499 筆毒資料時每批只刪得掉 1 筆，
   * 20 批就把 10,000 的上界用完，而真正該刪的列一列都輪不到。
   * 上界的用意是「單次執行不要無限延長」，那該由**做成的事**來計量。
   */
  it("失敗的列會被排除，且不佔用刪除預算", async () => {
    const BAD = { id: "bad", userId: "u9", teamId: "t9", itemCount: 1 };
    const OK = (n: number) => ({
      id: `ok-${n}`,
      userId: "u1",
      teamId: "t1",
      itemCount: 1,
    });
    let fetches = 0;

    asMock(faithMemoryRepo.listExpired).mockImplementation(
      async (_now: unknown, _limit: unknown, excludeIds: unknown) => {
        fetches += 1;
        const excluded = (excludeIds as string[]) ?? [];
        // Info: (20260818 - Luphia) 毒資料只在還沒被排除時出現，模擬真實查詢
        const poison = excluded.includes(BAD.id) ? [] : [BAD];
        if (fetches === 1) return [...poison, OK(1)];
        if (fetches === 2) return [...poison, OK(2)];
        return [];
      },
    );
    asMock(faithMemoryRepo.deleteWithLog).mockImplementation(
      async (params: unknown) => {
        if ((params as { id: string }).id === BAD.id) {
          throw new Error("poison row");
        }
        return undefined;
      },
    );

    const result = await runFaithMemoryRetention(NOW_MS);

    // Info: (20260818 - Luphia) 毒資料只失敗一次，第二批不再撈到它
    expect(result.failed).toBe(1);
    expect(result.deleted).toBe(2);

    const secondCall = asMock(faithMemoryRepo.listExpired).mock.calls[1];
    expect(secondCall[2]).toEqual([BAD.id]);
  });

  /**
   * Info: (20260818 - Luphia) 整批都失敗就停止，不要無限迴圈。
   * `listExpired` 的條件沒有改變，再撈一次會拿到同一批列。
   */
  it("整批失敗時停止而不是無限重撈", async () => {
    asMock(faithMemoryRepo.listExpired).mockResolvedValue([
      { id: "m1", userId: "u1", teamId: "t1", itemCount: 1 },
    ]);
    asMock(faithMemoryRepo.deleteWithLog).mockRejectedValue(
      new Error("db down"),
    );

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(result.failed).toBe(1);
    expect(result.deleted).toBe(0);
    expect(asMock(faithMemoryRepo.listExpired).mock.calls).toHaveLength(1);
  });
});
