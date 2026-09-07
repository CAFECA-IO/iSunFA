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

/**
 * Info: (20260818 - Luphia) 到期時間：`n` 越小代表**越早到期**，因此排序上越前面
 * （守護行程是「最久到期優先」）。寫成減去 `(10 - n)` 天而不是減 `n` 天，
 * 是為了讓測試裡的 `T(1), T(2), T(3)` 讀起來就是處理順序。
 */
const T = (n: number) => new Date(NOW_MS - 86_400_000 * (10 - n));

interface IRow {
  id: string;
  userId: string;
  teamId: string;
  itemCount: number;
  expiresAt: Date;
}
type Cursor = { expiresAt: Date; id: string } | undefined;

/**
 * Info: (20260818 - Luphia) 照實模擬 `listExpired` 的游標語意（checklist §1.8）：
 * 以 `(expiresAt, id)` 排序、只回排在游標之後的列、照 limit 切。
 * mock 少了任何一項，測到的就是一個不存在的資料庫。
 */
function nextPage(rows: IRow[], limit: number, after: Cursor): IRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      a.expiresAt.getTime() - b.expiresAt.getTime() || a.id.localeCompare(b.id),
  );
  const remaining = after
    ? sorted.filter(
        (row) =>
          row.expiresAt.getTime() > after.expiresAt.getTime() ||
          (row.expiresAt.getTime() === after.expiresAt.getTime() &&
            row.id > after.id),
      )
    : sorted;
  return remaining.slice(0, limit);
}

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
   * Info: (20260818 - Luphia) 同一輪內每一列最多被看到一次（第五輪 T-6、第六輪第 6 條）。
   *
   * 先前靠「排除失敗過的 id」達成，而那個清單在資料庫整體故障時會長到上萬個
   * 參數。改成游標之後，保證更強也更便宜：`(expiresAt, id)` 全序往前推進。
   *
   * mock 照實模擬游標語意（checklist §1.8）：回傳「排在游標之後」的列、
   * 照 limit 切、刪掉的列不再出現。少了任何一項，這條測的就是一個
   * 不存在的資料庫。
   */
  it("毒資料只失敗一次，不會被反覆撈回來", async () => {
    const rows = [
      { id: "a-ok", userId: "u1", teamId: "t1", itemCount: 1, expiresAt: T(1) },
      {
        id: "b-bad",
        userId: "u2",
        teamId: "t2",
        itemCount: 1,
        expiresAt: T(2),
      },
      { id: "c-ok", userId: "u3", teamId: "t3", itemCount: 1, expiresAt: T(3) },
    ];
    let remaining = [...rows];
    let fetches = 0;

    asMock(faithMemoryRepo.listExpired).mockImplementation(
      async (_now: unknown, limit: unknown, after: unknown) => {
        fetches += 1;
        if (fetches > 4) {
          throw new Error("撈第五次：游標沒有往前推進");
        }
        return nextPage(remaining, limit as number, after as Cursor);
      },
    );
    asMock(faithMemoryRepo.deleteWithLog).mockImplementation(
      async (params: unknown) => {
        const { id } = params as { id: string };
        if (id === "b-bad") throw new Error("poison row");
        remaining = remaining.filter((row) => row.id !== id);
        return undefined;
      },
    );

    const result = await runFaithMemoryRetention(NOW_MS, { batchSize: 1 });

    expect(result.deleted).toBe(2);
    expect(result.failed).toBe(1);
  });

  /**
   * Info: (20260818 - Luphia) 上界只算**成功刪除**（第五輪 T-6）。
   *
   * 常數是 10,000，測試撞不到，於是把條件改回 `deleted + failed` 全部照樣綠——
   * 而那正是先前的缺陷（毒資料多時預算被失敗吃光，真正該刪的一列都輪不到）。
   * 這裡把上界壓到 2 並逐列處理：失敗那列若算進預算，第三列就撈不到。
   */
  it("上界只算成功刪除，失敗不佔預算", async () => {
    const rows = [
      {
        id: "a-bad",
        userId: "u9",
        teamId: "t9",
        itemCount: 1,
        expiresAt: T(1),
      },
      { id: "b-ok", userId: "u1", teamId: "t1", itemCount: 1, expiresAt: T(2) },
      { id: "c-ok", userId: "u2", teamId: "t2", itemCount: 1, expiresAt: T(3) },
    ];
    let remaining = [...rows];

    asMock(faithMemoryRepo.listExpired).mockImplementation(
      async (_now: unknown, limit: unknown, after: unknown) =>
        nextPage(remaining, limit as number, after as Cursor),
    );
    asMock(faithMemoryRepo.deleteWithLog).mockImplementation(
      async (params: unknown) => {
        const { id } = params as { id: string };
        if (id === "a-bad") throw new Error("poison");
        remaining = remaining.filter((row) => row.id !== id);
        return undefined;
      },
    );

    const result = await runFaithMemoryRetention(NOW_MS, {
      maxDeletes: 2,
      batchSize: 1,
    });

    expect(result.deleted).toBe(2);
    expect(result.failed).toBe(1);
  });

  /**
   * Info: (20260818 - Luphia) 失敗次數有自己的上界（第五輪 T-6）。
   *
   * 游標讓候選集合單調往前，因此迴圈本來就會結束；這個上界是另一層保險：
   * DB 整個掛掉時不要在同一輪試上萬次、寫上萬筆 error log。
   *
   * 這裡的 mock **不理會游標**（模擬「每次都查得到列、但每一列都刪不掉」），
   * 確認它停在上界。
   */
  it("失敗次數達到上界就停", async () => {
    asMock(faithMemoryRepo.listExpired).mockResolvedValue([
      { id: "m1", userId: "u1", teamId: "t1", itemCount: 1, expiresAt: T(1) },
    ]);
    asMock(faithMemoryRepo.deleteWithLog).mockRejectedValue(
      new Error("db down"),
    );

    const result = await runFaithMemoryRetention(NOW_MS, { maxFailures: 3 });

    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(3);
  });
});
