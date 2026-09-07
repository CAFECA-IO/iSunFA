import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync } from "fs";
import { join } from "path";
import {
  cancelFaithMemoryExpiry,
  deleteFaithMemoryOnMemberRemoval,
  scheduleFaithMemoryExpiry,
} from "@/services/faith_memory.service";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import { FAITH_MEMORY_DELETION_REASON } from "@/constants/faith_memory";

/**
 * Info: (20260818 - Luphia) 成員離開後的記憶不該永久留存（PR #6652 第三輪 C-8）。
 *
 * 這不只是「少刪一次」：保留期對帳每 6 小時會把仍在訂閱之團隊的 `expiresAt`
 * 清成 null，所以一份沒有主人的記憶**永遠不會**到期——它會活得比成員資格久，
 * 也活得比條款 §3.7 承諾的期間久。
 */

jest.mock("@/repositories/faith_memory.repo", () => ({
  faithMemoryRepo: {
    deleteByScope: jest.fn(async () => true),
    setExpiry: jest.fn(async () => 1),
    clearExpiry: jest.fn(async () => 1),
  },
}));

// Info: (20260818 - Luphia) 保留天數是後台設定值（DB），這裡只驗來源標記，取預設即可
jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: { get: jest.fn(async () => "90") },
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

beforeEach(() => {
  jest.clearAllMocks();
  asMock(faithMemoryRepo.deleteByScope).mockResolvedValue(true);
  asMock(faithMemoryRepo.setExpiry).mockResolvedValue(1);
  asMock(faithMemoryRepo.clearExpiry).mockResolvedValue(1);
});

describe("deleteFaithMemoryOnMemberRemoval", () => {
  it("刪除該成員在該團隊的記憶，並標明原因", async () => {
    const removed = await deleteFaithMemoryOnMemberRemoval({
      userId: "u1",
      teamId: "t1",
    });

    expect(removed).toBe(true);
    expect(faithMemoryRepo.deleteByScope).toHaveBeenCalledWith(
      "u1",
      "t1",
      FAITH_MEMORY_DELETION_REASON.MEMBER_REMOVED,
    );
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：**永不拋錯**。
   *
   * 移除成員是使用者要做的事，而這支是附帶的清理。DB 出問題時應該讓移除照樣完成
   * ——否則「刪不掉記憶」會變成「踢不掉人」，而後者的急迫性高得多。
   * 對帳仍是最後一道防線：團隊降級時那份記憶照樣會被排入刪除。
   */
  it("repo 拋錯時回 false 而不是往外丟", async () => {
    asMock(faithMemoryRepo.deleteByScope).mockRejectedValue(
      new Error("db down"),
    );

    await expect(
      deleteFaithMemoryOnMemberRemoval({ userId: "u1", teamId: "t1" }),
    ).resolves.toBe(false);
  });

  // Info: (20260818 - Luphia) 沒有記憶的成員（多數情況）不是錯誤
  it("沒有記憶時回 false", async () => {
    asMock(faithMemoryRepo.deleteByScope).mockResolvedValue(false);

    expect(
      await deleteFaithMemoryOnMemberRemoval({ userId: "u1", teamId: "t1" }),
    ).toBe(false);
  });
});

/**
 * Info: (20260818 - Luphia) 移除成員的端點要真的呼叫它，且要在刪成員之前。
 *
 * 本專案沒有 route handler 層的測試環境（`src/__tests__` 裡沒有任何一支
 * 直接匯入 `@/app/api/...`），因此這一段以原始碼順序釘住。
 * 只掃**這一支端點**是刻意的：它不是「掃全域找違規」的測試，
 * 而是「這條路徑上的兩個呼叫順序不能被調換」。
 */
describe("移除成員的端點會清理記憶", () => {
  const route = readFileSync(
    join(
      process.cwd(),
      "src",
      "app",
      "api",
      "v1",
      "user",
      "team",
      "[team_id]",
      "members",
      "[member_id]",
      "route.ts",
    ),
    "utf8",
  );

  it("呼叫記憶清理", () => {
    expect(route).toMatch(/await deleteFaithMemoryOnMemberRemoval\(/);
  });

  /**
   * Info: (20260818 - Luphia) 順序有意義：先刪記憶再刪成員。
   * 反過來的話，兩者之間有個「成員已不在、記憶還在」的窗口，
   * 而該窗口內若程序中止，就沒有任何東西會再回來刪它。
   */
  it("清理排在刪除成員之前", () => {
    const cleanup = route.indexOf("await deleteFaithMemoryOnMemberRemoval(");
    const removal = route.indexOf("await teamRepo.deleteTeamMember(");
    expect(cleanup).toBeGreaterThan(-1);
    expect(removal).toBeGreaterThan(cleanup);
  });
});

/**
 * Info: (20260818 - Luphia) 對帳排定與取消的來源必須成對（第三輪 C-8）。
 *
 * 兩邊用的 reason 不一致，症狀是「取消完全無效」：對帳排了
 * `RETENTION_EXPIRED`，卻拿另一個 reason 去清，於是團隊恢復訂閱之後
 * 那個期限還在——記憶會在使用者付著錢的期間被刪掉。
 */
describe("對帳排定／取消的來源標記", () => {
  it("排定時標記為對帳排的", async () => {
    await scheduleFaithMemoryExpiry("t1", 1_760_000_000_000);

    expect(asMock(faithMemoryRepo.setExpiry).mock.calls[0][2]).toBe(
      FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    );
  });

  it("取消時只清對帳排的那一種", async () => {
    await cancelFaithMemoryExpiry("t1");

    expect(faithMemoryRepo.clearExpiry).toHaveBeenCalledWith(
      "t1",
      FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
    );
  });
});
