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
   * Info: (20260818 - Luphia) 毒資料只失敗一次，不會被反覆撈回來（第五輪 T-6 修訂）。
   *
   * 原本這一條測的是「整批都失敗就停」。加上排除機制（第五輪 C-3）之後，那個
   * 停止條件不但多餘、而且有害：一批剛好全是毒資料就讓整輪結束，後面刪得掉的
   * 列一列都輪不到（批次越小越容易踩到）。現在改測真正該成立的性質——
   * 失敗過的列不會再出現在下一批。
   */
  it("毒資料只失敗一次，不會被反覆撈回來", async () => {
    const BAD = { id: "bad", userId: "u2", teamId: "t2", itemCount: 1 };
    const OK = { id: "ok", userId: "u1", teamId: "t1", itemCount: 1 };
    // Info: (20260818 - Luphia) 模擬真實資料庫：刪掉的列不會再被查到
    let remaining = [OK, BAD];
    let fetches = 0;

    /**
     * Info: (20260818 - Luphia) mock 自己當上界：撈超過 3 次就丟錯。
     * 壞掉的版本會安靜地一直重撈同一列、最後靠總量上界才停——測試會紅，
     * 但要跑很久。讓多餘的那一次呼叫當場失敗，症狀就變成立即而明確的失敗。
     */
    asMock(faithMemoryRepo.listExpired).mockImplementation(
      async (_now: unknown, _limit: unknown, excludeIds: unknown) => {
        fetches += 1;
        if (fetches > 3) {
          throw new Error("listExpired 被撈第四次：失敗的列沒有被排除");
        }
        const excluded = (excludeIds as string[]) ?? [];
        return remaining.filter((row) => !excluded.includes(row.id));
      },
    );
    asMock(faithMemoryRepo.deleteWithLog).mockImplementation(
      async (params: unknown) => {
        const { id } = params as { id: string };
        if (id === BAD.id) throw new Error("poison row");
        remaining = remaining.filter((row) => row.id !== id);
        return undefined;
      },
    );

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(result.deleted).toBe(1);
    expect(result.failed).toBe(1);
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
   * Info: (20260818 - Luphia) 上界只算**成功刪除**（第五輪 T-6）。
   *
   * 這個性質先前沒有任何測試釘得住：常數是 10,000，測試撞不到它，於是把條件
   * 改回 `deleted + failed` 全部照樣綠——而那正是 C-3 修掉的缺陷本身
   * （499 筆毒資料時 20 批就把預算用完，真正該刪的一列都輪不到）。
   *
   * 現在把上界壓到 2、**每批只取一列**（`batchSize: 1`）——上界是在批與批之間
   * 才檢查的，整批一次處理完的話兩種寫法的結果一樣，測不出差別。
   * 逐列之後：失敗那列若算進預算，第三列就撈不到（deleted 只會是 1）。
   */
  it("上界只算成功刪除，失敗不佔預算", async () => {
    const rows = [
      { id: "bad", userId: "u9", teamId: "t9", itemCount: 1 },
      { id: "ok-1", userId: "u1", teamId: "t1", itemCount: 1 },
      { id: "ok-2", userId: "u2", teamId: "t2", itemCount: 1 },
    ];
    asMock(faithMemoryRepo.listExpired).mockImplementation(
      async (_now: unknown, limit: unknown, excludeIds: unknown) => {
        const excluded = (excludeIds as string[]) ?? [];
        // Info: (20260818 - Luphia) 要照 limit 切，否則「每批一列」測不出批與批之間的判斷
        return rows
          .filter((row) => !excluded.includes(row.id))
          .slice(0, limit as number);
      },
    );
    asMock(faithMemoryRepo.deleteWithLog).mockImplementation(
      async (params: unknown) => {
        if ((params as { id: string }).id === "bad") throw new Error("poison");
        return undefined;
      },
    );

    const result = await runFaithMemoryRetention(NOW_MS, {
      maxDeletes: 2,
      batchSize: 1,
    });

    // Info: (20260818 - Luphia) 兩筆都刪到了：失敗那筆沒有佔掉其中一格
    expect(result.deleted).toBe(2);
    expect(result.failed).toBe(1);
  });

  /**
   * Info: (20260818 - Luphia) 失敗次數有自己的上界（第五輪 T-6）。
   *
   * 排除機制讓候選集合每輪嚴格變小，因此迴圈本來就會結束；這個上界是另一層
   * 保險：DB 整個掛掉時，不要在同一輪裡試上萬次、寫上萬筆 error log——
   * 那既幫不上忙，也會把真正有用的日誌淹掉。
   *
   * 這裡的 mock **不理會排除清單**（模擬「每次都查得到列、但每一列都刪不掉」），
   * 確認它停在上界。
   */
  it("失敗次數達到上界就停", async () => {
    asMock(faithMemoryRepo.listExpired).mockResolvedValue([
      { id: "m1", userId: "u1", teamId: "t1", itemCount: 1 },
    ]);
    asMock(faithMemoryRepo.deleteWithLog).mockRejectedValue(
      new Error("db down"),
    );

    const result = await runFaithMemoryRetention(NOW_MS, { maxFailures: 3 });

    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(3);
  });
});
