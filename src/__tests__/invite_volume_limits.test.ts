import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { assertInviteVolumeWithinLimits } from "@/services/team_invitation.service";
import { teamRepo } from "@/repositories/team.repo";
import { systemSettingService } from "@/services/system_setting.service";
import { SystemSettingKey } from "@/constants/system_setting";
import {
  DEFAULT_TEAM_INVITE_DAILY_LIMIT,
  DEFAULT_TEAM_PENDING_INVITE_LIMIT,
} from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 邀請量的兩道團隊層上限（產品決定 20260819）。
 *
 * 免費版人數上限移除之後（額度改為全隊共用一份），寄信量失去所有界線：免費團隊
 * 不收席次費，而每一封 email 邀請都是真的寄出去的信。這兩道就是新的界線。
 *
 * 兩道分工不同，因此**兩邊的邊界都要測**：只測其中一道的話，另一道寫錯
 * （例如日上限拿去比未接受數）不會有任何測試變紅。
 */

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    countPendingInvitations: jest.fn(async () => 0),
    countInvitationsCreatedSince: jest.fn(async () => 0),
  },
}));

jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: { get: jest.fn(async () => undefined) },
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

// Info: (20260819 - Luphia) 固定時點，讓「24 小時內」的區間可驗
const NOW_MS = Date.UTC(2026, 7, 19, 12, 0, 0);
const DAY_MS = 86_400_000;

beforeEach(() => {
  jest.clearAllMocks();
  asMock(teamRepo.countPendingInvitations).mockResolvedValue(0);
  asMock(teamRepo.countInvitationsCreatedSince).mockResolvedValue(0);
  asMock(systemSettingService.get).mockResolvedValue(undefined);
});

describe("assertInviteVolumeWithinLimits", () => {
  it("量都在上限內時直接通過", async () => {
    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).resolves.toBeUndefined();
  });

  /**
   * Info: (20260819 - Luphia) 邊界：**等於**上限就要擋。
   *
   * 上限的語意是「同時最多這麼多封未接受」，因此已經有 N 封時第 N+1 封必須被擋——
   * 寫成 `>` 的話實際容量是 N+1，而文件與設定頁說的是 N。
   */
  it.each([
    [DEFAULT_TEAM_PENDING_INVITE_LIMIT - 1, false],
    [DEFAULT_TEAM_PENDING_INVITE_LIMIT, true],
    [DEFAULT_TEAM_PENDING_INVITE_LIMIT + 5, true],
  ])("未接受數 %s 時擋下＝%s", async (pending, blocked) => {
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(pending);

    const run = assertInviteVolumeWithinLimits("team-1", NOW_MS);

    if (blocked) {
      await expect(run).rejects.toMatchObject({ code: "TW000023" });
    } else {
      await expect(run).resolves.toBeUndefined();
    }
  });

  it.each([
    [DEFAULT_TEAM_INVITE_DAILY_LIMIT - 1, false],
    [DEFAULT_TEAM_INVITE_DAILY_LIMIT, true],
  ])("今日寄送數 %s 時擋下＝%s", async (sent, blocked) => {
    asMock(teamRepo.countInvitationsCreatedSince).mockResolvedValue(sent);

    const run = assertInviteVolumeWithinLimits("team-1", NOW_MS);

    if (blocked) {
      await expect(run).rejects.toMatchObject({ code: "TW000024" });
    } else {
      await expect(run).resolves.toBeUndefined();
    }
  });

  /**
   * Info: (20260819 - Luphia) 日上限的區間是**滾動 24 小時**，不是日曆日。
   *
   * 用日曆日的話，23:59 寄滿、00:01 再寄滿，兩小時內就是兩倍的量。
   */
  it("今日寄送數以 nowMs 往前 24 小時為區間", async () => {
    await assertInviteVolumeWithinLimits("team-1", NOW_MS);

    expect(asMock(teamRepo.countInvitationsCreatedSince)).toHaveBeenCalledWith(
      "team-1",
      new Date(NOW_MS - DAY_MS),
    );
  });

  // Info: (20260819 - Luphia) 兩道各自讀自己的設定鍵（拿錯鍵＝拿到另一道的值）
  it("兩道上限各自讀對應的系統設定", async () => {
    await assertInviteVolumeWithinLimits("team-1", NOW_MS);

    expect(asMock(systemSettingService.get)).toHaveBeenCalledWith(
      SystemSettingKey.TEAM_PENDING_INVITE_LIMIT,
    );
    expect(asMock(systemSettingService.get)).toHaveBeenCalledWith(
      SystemSettingKey.TEAM_INVITE_DAILY_LIMIT,
    );
  });

  // Info: (20260819 - Luphia) 設定值生效（後台調小之後要真的變嚴）
  it("系統設定的值優先於程式內的保底值", async () => {
    asMock(systemSettingService.get).mockImplementation(async (key: unknown) =>
      key === SystemSettingKey.TEAM_PENDING_INVITE_LIMIT ? "2" : "50",
    );
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(2);

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).rejects.toMatchObject({ code: "TW000023" });
  });

  /**
   * Info: (20260819 - Luphia) 設定壞掉時退回保底值，**不是**放行。
   *
   * 驗簽失敗（UNTRUSTED）時 `get()` 會丟錯。若在那裡 fail-open，一次設定異常
   * 就等於上限消失——而這兩道上限存在的理由正是「沒有其他煞車」。
   */
  it.each([
    [
      "讀取丟錯",
      () =>
        asMock(systemSettingService.get).mockRejectedValue(
          new Error("untrusted"),
        ),
    ],
    [
      "值不是正整數",
      () => asMock(systemSettingService.get).mockResolvedValue("0"),
    ],
    [
      "值是垃圾字串",
      () => asMock(systemSettingService.get).mockResolvedValue("abc"),
    ],
  ])("%s 時退回保底值而不是放行", async (_label, arrange) => {
    arrange();
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(
      DEFAULT_TEAM_PENDING_INVITE_LIMIT,
    );

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).rejects.toMatchObject({ code: "TW000023" });
  });
});
