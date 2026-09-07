import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  assertInviteVolumeWithinLimits,
  getInviteLimits,
  resolveCooldownRemaining,
} from "@/services/team_invitation.service";
import { teamRepo } from "@/repositories/team.repo";
import { systemSettingService } from "@/services/system_setting.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import {
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";
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
    // Info: (20260819 - Luphia) 冷卻讀最近一封邀請的時間（產品決定 20260819）
    findLastInvitationSentAt: jest.fn(async () => null),
  },
}));

jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: { get: jest.fn(async () => undefined) },
}));

/**
 * Info: (20260819 - Luphia) 冷卻只對免費方案生效（產品決定 20260819），
 * 因此閘門會讀訂閱。預設查無訂閱＝免費方案。
 */
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { getByTeamId: jest.fn(async () => null) },
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
  asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(null);
  asMock(systemSettingService.get).mockResolvedValue(undefined);
  asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
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

/**
 * Info: (20260819 - Luphia) 邀請寄送的冷卻（產品決定 20260819）。
 *
 * 與「每分鐘 10 封」的限流分工不同：限流擋的是狂點，冷卻擋的是**穩定地一直寄**
 * ——後者在限流眼中完全正常（每分鐘 1 封，永遠不超限）。
 */
describe("resolveCooldownRemaining", () => {
  const LAST = new Date(NOW_MS - 20_000);

  it("沒有寄過就沒有冷卻", () => {
    expect(resolveCooldownRemaining(null, NOW_MS, 60)).toBe(0);
  });

  it("距上一封 20 秒、冷卻 60 秒 → 還要等 40 秒", () => {
    expect(resolveCooldownRemaining(LAST, NOW_MS, 60)).toBe(40);
  });

  /**
   * Info: (20260819 - Luphia) **向上取整**：回 0 的意思是「現在可以寄」。
   * 還差 0.4 秒時回 0，前端倒數結束的那一刻按下去會被服務端擋——
   * 顯示的與實際的必須是同一件事。
   */
  it("不足一秒的剩餘無條件進位為 1", () => {
    expect(
      resolveCooldownRemaining(new Date(NOW_MS - 59_600), NOW_MS, 60),
    ).toBe(1);
  });

  it("已經過了冷卻就回 0，不回負數", () => {
    expect(
      resolveCooldownRemaining(new Date(NOW_MS - 120_000), NOW_MS, 60),
    ).toBe(0);
  });
});

describe("assertInviteVolumeWithinLimits：冷卻", () => {
  it("冷卻中擋下，並帶出剩餘秒數", async () => {
    asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(
      new Date(NOW_MS - 15_000),
    );

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).rejects.toMatchObject({
      code: "TW000027",
      data: { retryAfterSeconds: 45 },
    });
  });

  /**
   * Info: (20260819 - Luphia) 冷卻要擋在兩道總量上限**之前**。
   *
   * 三道同時成立時，回哪一個決定使用者看到什麼：冷卻是唯一「等一下就好」的那個，
   * 而另外兩道要他撤回邀請或等到明天。回錯的那一個會讓人做多餘的事。
   */
  it("冷卻與總量上限同時成立時，回的是冷卻", async () => {
    asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(
      new Date(NOW_MS - 1_000),
    );
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(999);

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).rejects.toMatchObject({ code: "TW000027" });
  });
});

describe("getInviteLimits", () => {
  // Info: (20260819 - Luphia) 唯讀：對話框開啟時讀一次，讓倒數在按下去之前就看得到
  it("回冷卻剩餘與兩道上限的現況", async () => {
    asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(
      new Date(NOW_MS - 10_000),
    );
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(3);
    asMock(teamRepo.countInvitationsCreatedSince).mockResolvedValue(7);

    await expect(getInviteLimits("team-1", NOW_MS)).resolves.toEqual({
      cooldownSecondsRemaining: 50,
      pendingCount: 3,
      sentToday: 7,
      pendingLimit: DEFAULT_TEAM_PENDING_INVITE_LIMIT,
      dailyLimit: DEFAULT_TEAM_INVITE_DAILY_LIMIT,
    });
  });
});

/**
 * Info: (20260819 - Luphia) **三道量控只對免費方案**（產品決定 20260819）。
 *
 * 三道存在的理由是「免費團隊不收席次費，寄信量沒有經濟上的煞車」。付費團隊每加
 * 一席都在付錢，那本身就是煞車——而三道對他們的代價是實際的：60 席的公司一次邀
 * 60 位員工，會在第 21 封撞到同時未接受數，每分鐘一封更要花一小時。
 *
 * 付費團隊剩下的界線是每操作者的限流（10/分、100/日）。那一層擋得住「一個人狂點」，
 * 擋不住「總量」——這是這個決定明知而為的取捨，因此下面刻意有一條**驗證總量確實
 * 不再擋**，而不是讓它變成一個沒有人記得的行為。
 */
describe("三道量控只對免費方案", () => {
  const JUST_SENT = new Date(NOW_MS - 1_000);
  const ACTIVE_PAID = {
    planId: TEAM_PLAN.TEAM,
    status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodEnd: new Date(NOW_MS + 86_400_000),
  };

  it("付費團隊剛寄過也不受冷卻", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(ACTIVE_PAID);
    asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(JUST_SENT);

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).resolves.toBeUndefined();
  });

  // Info: (20260819 - Luphia) 付費團隊連查都不查——那筆查詢只有免費方案需要
  it("付費團隊不查最近一封的時間", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(ACTIVE_PAID);

    await assertInviteVolumeWithinLimits("team-1", NOW_MS);

    expect(asMock(teamRepo.findLastInvitationSentAt)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 兩道總量上限對付費團隊**也不套用**（產品決定 20260819）。
   *
   * 這一條是刻意寫下來的：它記錄的是一個放寬，而放寬最容易在日後被當成 bug 修掉。
   * 60 席的公司一次邀 60 人不該在第 21 封被擋——那些席次的錢已經付了。
   */
  it.each([
    [
      "同時未接受數",
      () => asMock(teamRepo.countPendingInvitations).mockResolvedValue(999),
    ],
    [
      "今日寄送數",
      () =>
        asMock(teamRepo.countInvitationsCreatedSince).mockResolvedValue(999),
    ],
  ])("付費團隊不受%s的上限", async (_label, arrange) => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(ACTIVE_PAID);
    arrange();

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).resolves.toBeUndefined();
  });

  // Info: (20260819 - Luphia) 免費方案完全不受影響：三道都還在
  it("免費方案仍受兩道總量上限", async () => {
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(
      DEFAULT_TEAM_PENDING_INVITE_LIMIT,
    );

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).rejects.toMatchObject({ code: "TW000023" });
  });

  /**
   * Info: (20260819 - Luphia) 訂閱過期＝免費方案，冷卻回來。
   * 否則「讓訂閱過期」就成了免除冷卻的方法。
   */
  it("訂閱已過期的團隊仍受冷卻", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      ...ACTIVE_PAID,
      currentPeriodEnd: new Date(NOW_MS - 86_400_000),
    });
    asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(JUST_SENT);

    await expect(
      assertInviteVolumeWithinLimits("team-1", NOW_MS),
    ).rejects.toMatchObject({ code: "TW000027" });
  });

  /**
   * Info: (20260819 - Luphia) 畫面不該對付費團隊顯示倒數，**上限也要回 null**。
   *
   * `null` 是「不適用」，與「上限很高」是兩件事——回一個假的大數字，某天就會被
   * 當成真的上限顯示出去。
   */
  it("付費團隊的 invite_limits 不回冷卻，上限為 null", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(ACTIVE_PAID);
    asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(JUST_SENT);
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(30);

    const view = await getInviteLimits("team-1", NOW_MS);

    expect(view).toMatchObject({
      cooldownSecondsRemaining: 0,
      pendingCount: 30,
      pendingLimit: null,
      dailyLimit: null,
    });
  });
});
