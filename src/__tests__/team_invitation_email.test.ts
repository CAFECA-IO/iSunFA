import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  acceptInviteByToken,
  declineInvitationByMember,
  declineInviteByToken,
  inviteMemberByEmail,
  resolveInviteByToken,
  revokeInvitation,
} from "@/services/team_invitation.service";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { userIdentityRepo } from "@/repositories/user_identity.repo";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { sendMail, MailNotConfiguredError } from "@/services/mail.service";
import { systemSettingService } from "@/services/system_setting.service";
import { hashInviteToken } from "@/lib/team/invite_token";
import { INVITE_EMAIL_MATCH, TEAM_INVITATION_STATUS } from "@/constants/status";
import { logger } from "@/lib/utils/logger";
import { TeamRole } from "@/constants/team";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260815 - Luphia) Email 邀請（規範 §4 / P4）。
 *
 * 這條路徑會**動用戶的信用卡**（補收席次）並**寄出一封帶鑰匙的信**，
 * 因此要釘死的是三件事：
 * 1. 寄不出去時邀請要回滾——否則團隊付了錢、席次被佔住，而收件者永遠不知情
 * 2. 失效的連結一律當作不存在，不透露它曾經存在
 * 3. 接受後 token 即作廢，轉寄給第三人也沒有用
 */

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    getTeamById: jest.fn(),
    getTeamInvitationByEmail: jest.fn(async () => null),
    createTeamInvitation: jest.fn(),
    deleteInvitation: jest.fn(),
    declineInvitation: jest.fn(),
    // Info: (20260818 - Luphia) 撤回改為改狀態並記撤回者（第三輪 D）
    revokeInvitationById: jest.fn(async () => true),
    getInvitationByIdWithDetails: jest.fn(),
    findInvitationByTokenHash: jest.fn(),
    getTeamMember: jest.fn(async () => null),
    acceptInvitation: jest.fn(),
    // Info: (20260818 - Luphia) 接受時的免費版人數上限第二道防線（第三輪 B-1）
    countMembers: jest.fn(async () => 1),
  },
}));

jest.mock("@/repositories/user_identity.repo", () => ({
  userIdentityRepo: {
    // Info: (20260818 - Luphia) 邀請前確認對方是否已是成員（第三輪 C-4）
    findByEmail: jest.fn(async () => []),
    findByUserId: jest.fn(async () => []),
  },
}));

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: { updateOrderMintFailed: jest.fn() },
}));
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { getByTeamId: jest.fn() },
}));
jest.mock("@/services/team_subscription.service", () => ({
  resolveFreePlanMaxMembers: jest.fn(async () => 5),
}));

jest.mock("@/services/team_seat.service", () => ({
  chargeSeatAddition: jest.fn(async () => ({
    charged: true,
    amount: 100,
    seats: 1,
    orderId: "order-1",
  })),
}));

jest.mock("@/services/mail.service", () => {
  class MailNotConfiguredErrorMock extends Error {}
  return {
    sendMail: jest.fn(async () => undefined),
    MailNotConfiguredError: MailNotConfiguredErrorMock,
  };
});

/**
 * Info: (20260818 - Luphia) 信箱不符要**當下就可觀測**（第三輪 C-2）：
 * 成員清單上的標記是事後查核，告警紀錄才能接上監控。
 */
jest.mock("@/lib/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: {
    get: jest.fn(async () => "https://isunfa.com"),
  },
}));

/**
 * Info: (20260815 - Luphia) 與同層測試一致：本專案的 jest 型別以 `declare const` 引入，
 * `jest.Mocked<>` 這類命名空間型別在此不可用，故以 asMock 取代。
 */
function asMock(fn: unknown) {
  return fn as ReturnType<typeof jest.fn>;
}

const NOW = 1_760_000_000_000;
const TEAM = { id: "team-1", name: "測試團隊" };

beforeEach(() => {
  jest.clearAllMocks();
  asMock(teamRepo.getTeamById).mockResolvedValue(
    TEAM as unknown as Awaited<ReturnType<typeof teamRepo.getTeamById>>,
  );
  asMock(teamRepo.getTeamInvitationByEmail).mockResolvedValue(null);
  asMock(teamRepo.getTeamMember).mockResolvedValue(null);
  asMock(teamRepo.createTeamInvitation).mockResolvedValue({
    id: "inv-1",
  } as unknown as Awaited<ReturnType<typeof teamRepo.createTeamInvitation>>);
  asMock(chargeSeatAddition).mockResolvedValue({
    charged: true,
    amount: 100,
    seats: 1,
    orderId: "order-1",
  });
  asMock(sendMail).mockResolvedValue(undefined);
  asMock(systemSettingService.get).mockResolvedValue("https://isunfa.com");
  /**
   * Info: (20260816 - Luphia) acceptInvitation 回 null 代表「沒搶到那一列」，
   * 因此預設要回一個成員物件，否則每個測試都會走進併發的分支。
   */
  asMock(teamRepo.acceptInvitation).mockResolvedValue({
    id: "member-1",
  } as unknown as Awaited<ReturnType<typeof teamRepo.acceptInvitation>>);
  asMock(teamRepo.countMembers).mockResolvedValue(1);
  asMock(userIdentityRepo.findByEmail).mockResolvedValue([]);
  /**
   * Info: (20260818 - Luphia) 預設付費方案：接受時的免費版人數檢查提早返回。
   * 個別測試要驗那道防線時再改成 free（第三輪 B-1）。
   */
  asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
    planId: "team",
    status: "ACTIVE",
    currentPeriodEnd: new Date((NOW + 86_400_000) as number),
  });
  asMock(teamRepo.declineInvitation).mockResolvedValue(true);
  asMock(teamRepo.revokeInvitationById).mockResolvedValue(true);
  // Info: (20260817 - Luphia) 預設為 passkey 註冊的帳號：沒有任何第三方綁定，也就沒有 email
  asMock(userIdentityRepo.findByUserId).mockResolvedValue([]);
});

const invite = (email = "friend@example.com") =>
  inviteMemberByEmail({
    teamId: TEAM.id,
    operatorUserId: "user-1",
    email,
    role: TeamRole.VIEWER,
    nowMs: NOW,
  });

describe("inviteMemberByEmail", () => {
  it("建立邀請並寄出信件", async () => {
    const result = await invite();

    expect(result.invitationId).toBe("inv-1");
    expect(asMock(sendMail)).toHaveBeenCalledTimes(1);
    expect(asMock(teamRepo.deleteInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260815 - Luphia) 資料庫存雜湊、信裡帶明文，兩者不能是同一個字串。
   * 存明文的話，一份資料庫備份就等於一把可以進任何團隊的萬用鑰匙。
   */
  it("資料庫存的是雜湊，明文只出現在信裡", async () => {
    await invite();

    const created = asMock(teamRepo.createTeamInvitation).mock.calls[0][0];
    const mail = asMock(sendMail).mock.calls[0][0];

    expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    // Info: (20260818 - Luphia) 連結格式改為 `/invite#<token>`（第三輪 D）
    const plaintext = mail.text.match(/\/invite#([0-9a-f]{64})/)?.[1];
    expect(plaintext).toBeDefined();
    expect(created.tokenHash).not.toBe(plaintext);
    expect(created.tokenHash).toBe(hashInviteToken(plaintext as string));
  });

  it("信箱一律轉小寫存放", async () => {
    await invite("Friend@Example.COM");
    const created = asMock(teamRepo.createTeamInvitation).mock.calls[0][0];
    expect(created.inviteeEmail).toBe("friend@example.com");
  });

  it("格式不合法的信箱不會扣款也不會寄信", async () => {
    await expect(invite("not-an-email")).rejects.toThrow();
    expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
    expect(asMock(sendMail)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260815 - Luphia) 本檔最重要的一條：寄信失敗要回滾邀請。
   * 不回滾的話，那一席被一封沒寄出去的邀請永久佔住，
   * 而管理員從畫面上看不出任何異常。
   */
  /**
   * Info: (20260818 - Luphia) 席次擋下時**信不會寄出**（回報 20260818）。
   *
   * 免費團隊撞到人數上限時，`chargeSeatAddition` 丟錯，而它排在建立邀請與寄信
   * 之前——因此不會出現「信寄了、席次佔了、對方永遠加不進來」。
   * 順序本身就是這條保證，這一條把它釘住。
   */
  it("席次擋下時不建立邀請也不寄信", async () => {
    asMock(chargeSeatAddition).mockRejectedValue(
      new ApiError(
        API_ERRORS.TW_FREE_PLAN_MEMBER_LIMIT.code,
        API_ERRORS.TW_FREE_PLAN_MEMBER_LIMIT.message,
        API_ERRORS.TW_FREE_PLAN_MEMBER_LIMIT.status,
      ),
    );

    await expect(invite()).rejects.toMatchObject({ code: "TW000017" });
    expect(asMock(teamRepo.createTeamInvitation)).not.toHaveBeenCalled();
    expect(asMock(sendMail)).not.toHaveBeenCalled();
  });

  it("寄信失敗時刪除邀請，讓席次空出來給下一次使用", async () => {
    asMock(sendMail).mockRejectedValue(new Error("smtp down"));

    await expect(invite()).rejects.toThrow();

    expect(asMock(teamRepo.deleteInvitation)).toHaveBeenCalledWith("inv-1");
  });

  it("未設定 APP_BASE_URL 時不寄信並回滾邀請", async () => {
    asMock(systemSettingService.get).mockResolvedValue(undefined);

    await expect(invite()).rejects.toThrow();

    expect(asMock(sendMail)).not.toHaveBeenCalled();
    expect(asMock(teamRepo.deleteInvitation)).toHaveBeenCalledWith("inv-1");
  });

  it("同一信箱已有未逾期的邀請時不重複扣款", async () => {
    asMock(teamRepo.getTeamInvitationByEmail).mockResolvedValue({
      id: "inv-old",
      expiresAt: new Date(NOW + 1000),
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.getTeamInvitationByEmail>
    >);

    await expect(invite()).rejects.toThrow();
    expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
  });

  // Info: (20260815 - Luphia) 逾期的舊邀請不該擋住重新邀請同一個人
  it("舊邀請已逾期時可以再次邀請", async () => {
    asMock(teamRepo.getTeamInvitationByEmail).mockResolvedValue({
      id: "inv-old",
      expiresAt: new Date(NOW - 1000),
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.getTeamInvitationByEmail>
    >);

    await expect(invite()).resolves.toBeDefined();
    expect(asMock(sendMail)).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260816 - Luphia) 逾期的舊列狀態仍是 PENDING，還握著 `pendingKey`。
   * 不先刪掉，重邀同一個信箱會撞唯一鍵，而使用者只會看到「邀請失敗」。
   */
  it("重邀前會刪掉逾期的舊邀請，否則唯一鍵會擋住", async () => {
    asMock(teamRepo.getTeamInvitationByEmail).mockResolvedValue({
      id: "inv-old",
      expiresAt: new Date(NOW - 1000),
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.getTeamInvitationByEmail>
    >);

    await invite();

    expect(asMock(teamRepo.deleteInvitation)).toHaveBeenCalledWith("inv-old");
  });

  /**
   * Info: (20260816 - Luphia) 併發防護：兩位管理員同時邀請同一個信箱時，
   * 應用層的「是否已有 PENDING」檢查兩邊都會通過，擋下第二筆的是這個唯一鍵。
   */
  it("建立邀請時帶上 pendingKey，且信箱經過正規化", async () => {
    await invite("Friend@Example.COM");
    const created = asMock(teamRepo.createTeamInvitation).mock.calls[0][0];
    expect(created.pendingKey).toBe("team-1:mail:friend@example.com");
  });

  /**
   * Info: (20260815 - Luphia) 團隊名稱由使用者輸入，直接進 HTML 等於把版面交給對方。
   */
  it("團隊名稱在 HTML 中經過跳脫", async () => {
    asMock(teamRepo.getTeamById).mockResolvedValue({
      id: TEAM.id,
      name: '<img src=x onerror="alert(1)">',
    } as unknown as Awaited<ReturnType<typeof teamRepo.getTeamById>>);

    await invite();

    const mail = asMock(sendMail).mock.calls[0][0];
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img");
  });

  it("冪等鍵以團隊與信箱組成，重試同一封邀請不會扣第二次", async () => {
    await invite("Friend@Example.com");
    expect(asMock(chargeSeatAddition).mock.calls[0][0].idempotencyKey).toBe(
      "invite-email:team-1:friend@example.com",
    );
  });
});

describe("resolveInviteByToken", () => {
  const pending = {
    id: "inv-1",
    teamId: TEAM.id,
    team: TEAM,
    role: TeamRole.VIEWER,
    status: TEAM_INVITATION_STATUS.PENDING,
    inviteeEmail: "friend@example.com",
    expiresAt: new Date(NOW + 1000),
  };

  it("有效的邀請回團隊名稱", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );

    const view = await resolveInviteByToken("token", NOW);
    expect(view?.teamName).toBe(TEAM.name);
  });

  /**
   * Info: (20260815 - Luphia) 拿到連結的人不一定是收件者（信可能被轉寄），
   * 連結本身沒有理由洩漏第三人的信箱。
   */
  it("不回傳受邀者信箱", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );

    const view = await resolveInviteByToken("token", NOW);
    expect(JSON.stringify(view)).not.toContain("friend@example.com");
  });

  it("逾期的邀請視為不存在", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      expiresAt: new Date(NOW - 1),
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);

    expect(await resolveInviteByToken("token", NOW)).toBeNull();
  });

  it("已接受的邀請視為不存在", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      status: TEAM_INVITATION_STATUS.ACCEPTED,
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);

    expect(await resolveInviteByToken("token", NOW)).toBeNull();
  });
});

describe("acceptInviteByToken", () => {
  const pending = {
    id: "inv-1",
    teamId: TEAM.id,
    team: TEAM,
    role: TeamRole.EDITOR,
    status: TEAM_INVITATION_STATUS.PENDING,
    expiresAt: new Date(NOW + 1000),
  };

  it("加入團隊並沿用邀請中的角色", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );

    const result = await acceptInviteByToken({
      token: "token",
      userId: "user-2",
      nowMs: NOW,
    });

    expect(result.teamId).toBe(TEAM.id);
    expect(asMock(teamRepo.acceptInvitation)).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteId: "inv-1",
        teamId: TEAM.id,
        userId: "user-2",
        role: TeamRole.EDITOR,
      }),
    );
  });

  /**
   * Info: (20260817 - Luphia) 稽核軌跡：邀請記的是 email、成員記的是帳號，
   * 中間原本沒有任何欄位相連。這一條釘住「是誰用掉了這封邀請」有被寫下來。
   */
  it("記下接受者與接受時點", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );

    await acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW });

    const args = asMock(teamRepo.acceptInvitation).mock.calls[0][0];
    expect(args.userId).toBe("user-2");
    expect(args.acceptedAt.getTime()).toBe(NOW);
  });

  /**
   * Info: (20260817 - Luphia) passkey 註冊的帳號沒有任何 email 可比對
   * （`User` 沒有 email 欄位）。這是常態，要記成 UNAVAILABLE 而不是「不符」——
   * 兩者在稽核報告上的意義完全不同。
   */
  it("接受者沒有已驗證信箱時記為 UNAVAILABLE", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      inviteeEmail: "friend@example.com",
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([]);

    await acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW });

    expect(asMock(teamRepo.acceptInvitation).mock.calls[0][0].emailMatch).toBe(
      INVITE_EMAIL_MATCH.UNAVAILABLE,
    );
  });

  it("第三方綁定的已驗證信箱相符時記為 MATCHED", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      inviteeEmail: "friend@example.com",
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "Friend@Example.com", emailVerified: true },
    ]);

    await acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW });

    expect(asMock(teamRepo.acceptInvitation).mock.calls[0][0].emailMatch).toBe(
      INVITE_EMAIL_MATCH.MATCHED,
    );
  });

  /**
   * Info: (20260817 - Luphia) 用別的信箱登入**不會被擋**——
   * 工作信箱收到邀請、用個人 Google 帳號登入是正常行為。只記錄。
   */
  it("信箱不符時照樣加入，但記為 MISMATCHED", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      inviteeEmail: "friend@example.com",
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "someone.else@example.com", emailVerified: true },
    ]);

    const result = await acceptInviteByToken({
      token: "token",
      userId: "user-2",
      nowMs: NOW,
    });

    expect(result.teamId).toBe(TEAM.id);
    expect(asMock(teamRepo.acceptInvitation).mock.calls[0][0].emailMatch).toBe(
      INVITE_EMAIL_MATCH.MISMATCHED,
    );
  });

  /**
   * Info: (20260818 - Luphia) 不符要留下**可接上監控**的紀錄（第三輪 C-2）。
   *
   * 只寫進 `acceptedEmailMatch` 欄位的話，要發現「連結被轉寄出去、被別人用掉」
   * 得有人主動去翻那張表。這條保證它同時進 log。
   */
  it("信箱不符時留下告警紀錄", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      inviteeEmail: "friend@example.com",
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "someone.else@example.com", emailVerified: true },
    ]);

    await acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW });

    expect(asMock(logger.warn)).toHaveBeenCalledTimes(1);
    const [, context] = asMock(logger.warn).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(context).toEqual({
      teamId: TEAM.id,
      invitationId: pending.id,
      acceptedByUserId: "user-2",
    });
  });

  /**
   * Info: (20260818 - Luphia) 相符與「沒有可比對的信箱」都不該告警。
   * passkey 註冊的帳號永遠沒有信箱可比，那是本站的主要註冊方式——
   * 對它告警等於讓這個訊號變成噪音，而噪音等於沒有訊號。
   */
  it("相符或無信箱可比時不留告警", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      inviteeEmail: "friend@example.com",
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "friend@example.com", emailVerified: true },
    ]);
    await acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW });

    // Info: (20260818 - Luphia) 沒有任何第三方綁定＝UNAVAILABLE
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([]);
    await acceptInviteByToken({ token: "token", userId: "user-3", nowMs: NOW });

    expect(asMock(logger.warn)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260817 - Luphia) 未驗證的 email 是使用者宣稱的字串，
   * 拿它比出來的「相符」會被當成稽核證據，但它什麼都不保證。
   */
  it("未驗證的信箱不列入比對", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      inviteeEmail: "friend@example.com",
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "friend@example.com", emailVerified: false },
    ]);

    await acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW });

    expect(asMock(teamRepo.acceptInvitation).mock.calls[0][0].emailMatch).toBe(
      INVITE_EMAIL_MATCH.UNAVAILABLE,
    );
  });

  /**
   * Info: (20260816 - Luphia) 併發：轉寄出去的連結被兩個人同時點開。
   *
   * `acceptInvitation` 回 null 代表這一列在讀取之後已被搶走。此時**不能**當成成功——
   * 一個付費席次只能進一個人，而搶輸的那位並沒有加入任何團隊。
   */
  it("同一條連結被搶先接受時，後到的請求不會加入團隊", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );
    asMock(teamRepo.acceptInvitation).mockResolvedValue(null);
    // Info: (20260816 - Luphia) 搶輸的人不是成員（第一次檢查、事後重查都不是）
    asMock(teamRepo.getTeamMember).mockResolvedValue(null);

    await expect(
      acceptInviteByToken({ token: "token", userId: "user-3", nowMs: NOW }),
    ).rejects.toThrow();
  });

  /**
   * Info: (20260816 - Luphia) 同一個人連點兩下：第二次同樣拿到 null，
   * 但他確實已經加入了。回錯誤只會讓一個已經成功的人以為自己失敗。
   */
  it("同一個人連點兩下，第二次視為已完成而非失敗", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );
    asMock(teamRepo.acceptInvitation).mockResolvedValue(null);
    asMock(teamRepo.getTeamMember)
      // Info: (20260816 - Luphia) 進入時還不是成員，第一次的寫入在這中間完成
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "member-1" });

    const result = await acceptInviteByToken({
      token: "token",
      userId: "user-2",
      nowMs: NOW,
    });

    expect(result.teamId).toBe(TEAM.id);
  });

  it("逾期的連結不能加入", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      expiresAt: new Date(NOW - 1),
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);

    await expect(
      acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW }),
    ).rejects.toThrow();
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260815 - Luphia) 已接受的連結不能再用一次——
   * 否則轉寄那封信就等於把團隊的門永久打開。
   */
  it("已接受的連結不能重複使用", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      status: TEAM_INVITATION_STATUS.ACCEPTED,
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);

    await expect(
      acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW }),
    ).rejects.toThrow();
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  // Info: (20260815 - Luphia) 已是成員的人重複點連結不該看到錯誤，也不該建立第二筆成員
  it("已是成員時視為成功且不重複加人", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );
    asMock(teamRepo.getTeamMember).mockResolvedValue({
      id: "member-1",
    } as unknown as Awaited<ReturnType<typeof teamRepo.getTeamMember>>);

    const result = await acceptInviteByToken({
      token: "token",
      userId: "user-2",
      nowMs: NOW,
    });

    expect(result.teamId).toBe(TEAM.id);
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
    /**
     * Info: (20260816 - Luphia) 而且**不碰那封邀請**：點連結的人不見得是收件者
     * （信會被轉寄）。把 token 作廢等於替受邀者銷毀他還沒用過的連結。
     */
    expect(asMock(teamRepo.deleteInvitation)).not.toHaveBeenCalled();
  });
});

// Info: (20260815 - Luphia) 保留 import 以確保型別對得上（未設定寄信的分支由服務層轉譯錯誤碼）
void MailNotConfiguredError;

/**
 * Info: (20260816 - Luphia) 拒絕邀請（條款 §3.6「邀請經拒絕…即行釋出席次」）。
 *
 * 這條路徑**不需要登入**，因此它的每一道防線都在 token 上：
 * 只有 PENDING 且未逾期的邀請能被拒絕，而拒絕的寫入本身要擋得住併發。
 */
describe("declineInviteByToken", () => {
  const pending = {
    id: "inv-1",
    teamId: TEAM.id,
    team: TEAM,
    role: TeamRole.VIEWER,
    status: TEAM_INVITATION_STATUS.PENDING,
    expiresAt: new Date(NOW + 1000),
  };

  it("拒絕後回傳團隊，並交給 repo 改狀態", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );

    const result = await declineInviteByToken("token", NOW);

    expect(result.teamId).toBe(TEAM.id);
    expect(asMock(teamRepo.declineInvitation)).toHaveBeenCalledWith("inv-1");
  });

  /**
   * Info: (20260818 - Luphia) 未登入端點要留下呼叫者線索（第三輪 D）。
   *
   * 一次成功的拒絕就讓邀請作廢、席次當場釋出，而管理員只看到「對方拒絕了」。
   * 連結被轉寄出去、被別人按掉時，IP／UA 是唯一能事後追的東西。
   */
  it("把呼叫者的 IP 與 UA 記入稽核", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );

    await declineInviteByToken("token", NOW, {
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0",
    });

    const [, context] = asMock(logger.info).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(context).toEqual({
      teamId: TEAM.id,
      invitationId: "inv-1",
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0",
    });
  });

  /**
   * Info: (20260818 - Luphia) 沒有呼叫者資訊時記 "unknown"，而不是留下空欄位。
   * 「查不到」與「沒有這個欄位」在稽核上是兩件事。
   */
  it("沒有呼叫者資訊時記 unknown", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );

    await declineInviteByToken("token", NOW);

    const [, context] = asMock(logger.info).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(context).toMatchObject({ ip: "unknown", userAgent: "unknown" });
  });

  it("逾期的連結不能拒絕", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      expiresAt: new Date(NOW - 1),
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);

    await expect(declineInviteByToken("token", NOW)).rejects.toThrow();
    expect(asMock(teamRepo.declineInvitation)).not.toHaveBeenCalled();
  });

  it("已接受的連結不能再拒絕", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue({
      ...pending,
      status: TEAM_INVITATION_STATUS.ACCEPTED,
    } as unknown as Awaited<
      ReturnType<typeof teamRepo.findInvitationByTokenHash>
    >);

    await expect(declineInviteByToken("token", NOW)).rejects.toThrow();
    expect(asMock(teamRepo.declineInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260816 - Luphia) 併發：讀到 PENDING、寫入前那一列已被接受。
   * repo 回 false，此時**不能**回報拒絕成功——那會讓一個其實已經
   * 加入團隊的人以為自己成功退掉了。
   */
  it("寫入時發現已不是 PENDING，不回報拒絕成功", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );
    asMock(teamRepo.declineInvitation).mockResolvedValue(false);

    await expect(declineInviteByToken("token", NOW)).rejects.toThrow();
  });

  it("查無此 token 時視為不存在", async () => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(null);

    await expect(declineInviteByToken("token", NOW)).rejects.toThrow();
    expect(asMock(teamRepo.declineInvitation)).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260817 - Luphia) 撤回與位址拒絕的業務規則（自我 review：由 route 搬進 service）。
 *
 * 規則放在端口裡沒辦法單獨測試，也很容易在下一支類似的端點裡被漏抄一條——
 * 而這裡漏掉的那一條會讓別的團隊的管理員刪得掉你的邀請。
 */
describe("revokeInvitation", () => {
  const pending = {
    id: "inv-1",
    teamId: TEAM.id,
    status: TEAM_INVITATION_STATUS.PENDING,
  };

  beforeEach(() => {
    asMock(teamRepo.getTeamMember).mockResolvedValue({ role: "ADMIN" });
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(pending);
  });

  it("OWNER / ADMIN 可以撤回，且回報席次已釋出但不退費", async () => {
    const result = await revokeInvitation({
      teamId: TEAM.id,
      inviteId: "inv-1",
      operatorUserId: "user-1",
    });

    expect(result).toEqual({
      id: "inv-1",
      seatReleased: true,
      refunded: false,
    });
    /**
     * Info: (20260818 - Luphia) 改狀態而非實刪（第三輪 D）：
     * 撤回是動過信用卡、對外寄過信的動作，它不該無痕。
     * 同時記下撤回者——「由誰撤回」正是原本查不到的那一半。
     */
    expect(asMock(teamRepo.revokeInvitationById)).toHaveBeenCalledWith(
      "inv-1",
      "user-1",
    );
    expect(asMock(teamRepo.deleteInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 併發：更新落空代表這封邀請剛剛被接受或已被撤回。
   * 此時不能回「撤回成功」——那會讓管理員以為席次空出來了，
   * 而對方其實已經在團隊裡。
   */
  it("更新落空時不回報成功", async () => {
    asMock(teamRepo.revokeInvitationById).mockResolvedValue(false);

    await expect(
      revokeInvitation({
        teamId: TEAM.id,
        inviteId: "inv-1",
        operatorUserId: "user-1",
      }),
    ).rejects.toThrow();
  });

  it("一般成員不能撤回", async () => {
    asMock(teamRepo.getTeamMember).mockResolvedValue({ role: "VIEWER" });

    await expect(
      revokeInvitation({
        teamId: TEAM.id,
        inviteId: "inv-1",
        operatorUserId: "user-1",
      }),
    ).rejects.toThrow();
    expect(asMock(teamRepo.revokeInvitationById)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260817 - Luphia) 權限驗的是「他對 teamId 的權限」，
   * 不是「他對這筆邀請的權限」——少了歸屬檢查，任何團隊的管理員
   * 都能刪掉別的團隊的邀請。
   */
  it("不能撤回別的團隊的邀請", async () => {
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue({
      ...pending,
      teamId: "other-team",
    });

    await expect(
      revokeInvitation({
        teamId: TEAM.id,
        inviteId: "inv-1",
        operatorUserId: "user-1",
      }),
    ).rejects.toThrow();
    expect(asMock(teamRepo.revokeInvitationById)).not.toHaveBeenCalled();
  });

  it("已接受的邀請不能撤回", async () => {
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue({
      ...pending,
      status: TEAM_INVITATION_STATUS.ACCEPTED,
    });

    await expect(
      revokeInvitation({
        teamId: TEAM.id,
        inviteId: "inv-1",
        operatorUserId: "user-1",
      }),
    ).rejects.toThrow();
  });
});

describe("declineInvitationByMember", () => {
  const pending = {
    id: "inv-1",
    teamId: TEAM.id,
    status: TEAM_INVITATION_STATUS.PENDING,
    inviteeAddress: "0xabc",
  };

  beforeEach(() => {
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(pending);
    asMock(teamRepo.declineInvitation).mockResolvedValue(true);
  });

  it("受邀者本人可以拒絕", async () => {
    const result = await declineInvitationByMember({
      inviteId: "inv-1",
      userId: "user-2",
      address: "0xabc",
    });
    expect(result.teamId).toBe(TEAM.id);
  });

  // Info: (20260817 - Luphia) 不是收件者就不能替人拒絕
  it("非受邀者不能拒絕", async () => {
    await expect(
      declineInvitationByMember({
        inviteId: "inv-1",
        userId: "user-3",
        address: "0xdef",
      }),
    ).rejects.toThrow();
    expect(asMock(teamRepo.declineInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260817 - Luphia) 寫入時才發現已不是 PENDING：不能回「已拒絕」的假象，
   * 那會讓一個其實已經加入團隊的人以為自己退掉了。
   */
  it("寫入時發現已不是 PENDING 即視為查無", async () => {
    asMock(teamRepo.declineInvitation).mockResolvedValue(false);

    await expect(
      declineInvitationByMember({
        inviteId: "inv-1",
        userId: "user-2",
        address: "0xabc",
      }),
    ).rejects.toThrow();
  });
});

/**
 * Info: (20260818 - Luphia) fail-closed 的**順序**（第三輪 B-5）。
 *
 * 這個檔案的十幾條測試沒有一條釘住它：把 `chargeSeatAddition` 整段移到寄信之後，
 * 全部保持全綠——而「先扣款、成功才建立邀請」是這整個服務的設計主張，
 * 反過來就是「人已經進來、錢沒收到」，那筆錢沒有任何流程會回頭補。
 *
 * 用呼叫順序而不是原始碼比對：這裡測得到真正的行為（誰先被呼叫），
 * 比字串比對精確，而且重構搬動程式碼時不會誤報。
 */
describe("邀請的 fail-closed 順序", () => {
  it("扣款成功才建立邀請、才寄信", async () => {
    const order: string[] = [];
    asMock(chargeSeatAddition).mockImplementation(async () => {
      order.push("charge");
      return { charged: true, amount: 100, seats: 1, orderId: "order-1" };
    });
    asMock(teamRepo.createTeamInvitation).mockImplementation(async () => {
      order.push("create");
      return { id: "inv-1" };
    });
    asMock(sendMail).mockImplementation(async () => {
      order.push("mail");
    });

    await invite();

    expect(order).toEqual(["charge", "create", "mail"]);
  });

  /**
   * Info: (20260818 - Luphia) 扣款失敗即中止：不建立邀請、不寄信。
   * 這是「先付費、再開門」的另一半——沒有它，前一條只是巧合。
   */
  it("扣款失敗時不建立邀請也不寄信", async () => {
    asMock(chargeSeatAddition).mockRejectedValue(new Error("card declined"));

    await expect(invite()).rejects.toThrow();

    expect(asMock(teamRepo.createTeamInvitation)).not.toHaveBeenCalled();
    expect(asMock(sendMail)).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260818 - Luphia) 免費版人數上限的第二道防線（第三輪 B-1）。
 *
 * 邀請端的檢查是第一道，但邀請與接受之間可能隔好幾天：這期間其他人接受了、
 * 團隊從付費降級成免費、或上限被後台調低，都會讓當初通過的那封邀請
 * 在此刻不再合法。沒有這一道，「上限」就只是寄信當下的一個快照。
 */
describe("接受時的免費版人數上限", () => {
  const pending = {
    id: "inv-1",
    teamId: TEAM.id,
    team: TEAM,
    role: TeamRole.VIEWER,
    status: TEAM_INVITATION_STATUS.PENDING,
    expiresAt: new Date(NOW + 1000),
  };

  const mockFreePlan = () =>
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: "free",
      status: "ACTIVE",
      currentPeriodEnd: new Date(NOW + 86_400_000),
    });

  beforeEach(() => {
    asMock(teamRepo.findInvitationByTokenHash).mockResolvedValue(
      pending as unknown as Awaited<
        ReturnType<typeof teamRepo.findInvitationByTokenHash>
      >,
    );
  });

  it("免費團隊已滿時擋下接受", async () => {
    mockFreePlan();
    // Info: (20260818 - Luphia) 上限 5，已有 5 位成員，再加一位就超過
    asMock(teamRepo.countMembers).mockResolvedValue(5);

    await expect(
      acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW }),
    ).rejects.toThrow();
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  it("免費團隊未滿時照常接受", async () => {
    mockFreePlan();
    asMock(teamRepo.countMembers).mockResolvedValue(3);

    await expect(
      acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW }),
    ).resolves.toBeDefined();
  });

  /**
   * Info: (20260818 - Luphia) 付費方案不受此限：人數由「席次 × 單價」自然封頂，
   * 而那筆錢已經收過了。
   */
  it("付費團隊不受人數上限限制", async () => {
    asMock(teamRepo.countMembers).mockResolvedValue(999);

    await expect(
      acceptInviteByToken({ token: "token", userId: "user-2", nowMs: NOW }),
    ).resolves.toBeDefined();
  });
});

/**
 * Info: (20260818 - Luphia) 邀請前的兩道檢查與建單失敗的處置（第三輪 C-3 / C-4）。
 */
describe("邀請的前置檢查與失敗處置", () => {
  /**
   * Info: (20260818 - Luphia) C-4：已經是成員就不該再收一次席次費、再寄一封信。
   * 位址路徑早就有這道檢查，email 路徑漏了——結果是那封 PENDING 邀請
   * 佔住一席直到七天後逾期，而畫面顯示「邀請成功」。
   */
  it("對方已是成員時不扣款也不寄信", async () => {
    asMock(userIdentityRepo.findByEmail).mockResolvedValue([
      { userId: "user-9" },
    ]);
    asMock(teamRepo.getTeamMember).mockResolvedValue({ id: "member-9" });

    await expect(invite()).rejects.toThrow();

    expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
    expect(asMock(sendMail)).not.toHaveBeenCalled();
  });

  // Info: (20260818 - Luphia) 查不到綁定（passkey 註冊者）時照常往下走
  it("查不到對應帳號時照常邀請", async () => {
    asMock(userIdentityRepo.findByEmail).mockResolvedValue([]);

    await expect(invite()).resolves.toBeDefined();
  });

  /**
   * Info: (20260818 - Luphia) C-3：`pendingKey` 的唯一鍵在並發時**預期**會丟 P2002。
   * 那是這條路徑上唯一被設計成「一定會發生」的錯誤，先前卻是唯一沒被處理的，
   * 會一路落到 IS_UNKNOWN 500。
   */
  it("並發撞唯一鍵時回「已有待處理的邀請」而不是 500", async () => {
    asMock(teamRepo.createTeamInvitation).mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );

    const error = await invite().catch((e: unknown) => e);
    // Info: (20260818 - Luphia) VA000033 = VA_AN_INVITATION_IS_ALREADY_PE
    expect(error).toMatchObject({ code: "VA000033" });
  });

  /**
   * Info: (20260818 - Luphia) 其餘的建單失敗＝已收款未履行，要把訂單標記出來。
   * 不標的話這筆會停在 COMPLETED、席次也加了，而邀請不存在——沒有任何查詢篩得出它。
   */
  it("建立邀請失敗時把已扣款的訂單標為未履行", async () => {
    asMock(teamRepo.createTeamInvitation).mockRejectedValue(
      new Error("db down"),
    );

    await expect(invite()).rejects.toThrow();

    expect(asMock(paymentRepo.updateOrderMintFailed)).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({ teamId: TEAM.id }),
      expect.anything(),
      expect.stringContaining("invitation creation failed"),
    );
  });
});
