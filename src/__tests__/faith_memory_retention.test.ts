import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { runFaithMemoryRetention } from "@/services/cron/faith_memory_retention.cron";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import {
  cancelFaithMemoryExpiry,
  isFaithMemoryEnabled,
  scheduleFaithMemoryExpiry,
} from "@/services/faith_memory.service";
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
  isFaithMemoryEnabled: jest.fn(async () => true),
  scheduleFaithMemoryExpiry: jest.fn(async () => 1),
  cancelFaithMemoryExpiry: jest.fn(async () => 1),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;
const NOW_MS = 1_760_000_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  asMock(faithMemoryRepo.listTeamRetentionState).mockResolvedValue([]);
  asMock(faithMemoryRepo.listExpired).mockResolvedValue([]);
  asMock(isFaithMemoryEnabled).mockResolvedValue(true);
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
    asMock(isFaithMemoryEnabled).mockResolvedValue(false);

    const result = await runFaithMemoryRetention(NOW_MS);

    expect(scheduleFaithMemoryExpiry).toHaveBeenCalledWith("team-free", NOW_MS);
    expect(result.scheduled).toBe(1);
  });

  // Info: (20260817 - Luphia) 恢復訂閱即取消排定的刪除，記憶延續（規範 §7.1）
  it("為付費中的團隊取消已排定的刪除", async () => {
    asMock(faithMemoryRepo.listTeamRetentionState).mockResolvedValue([
      { teamId: "team-paid", _count: { _all: 2 } },
    ]);
    asMock(isFaithMemoryEnabled).mockResolvedValue(true);

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
    asMock(faithMemoryRepo.listExpired).mockResolvedValue([
      { id: "m1", userId: "u1", teamId: "t1", itemCount: 4 },
    ]);

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
    asMock(faithMemoryRepo.listExpired).mockResolvedValue([
      { id: "m1", userId: "u1", teamId: "t1", itemCount: 1 },
      { id: "m2", userId: "u2", teamId: "t2", itemCount: 2 },
    ]);
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
});
