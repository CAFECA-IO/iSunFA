import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  acceptInviteByToken,
  inviteMemberByEmail,
  resolveInviteByToken,
} from "@/services/team_invitation.service";
import { teamRepo } from "@/repositories/team.repo";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { sendMail, MailNotConfiguredError } from "@/services/mail.service";
import { systemSettingService } from "@/services/system_setting.service";
import { hashInviteToken } from "@/lib/team/invite_token";
import { TEAM_INVITATION_STATUS } from "@/constants/status";
import { TeamRole } from "@/constants/team";

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
    consumeInvitationToken: jest.fn(),
    findInvitationByTokenHash: jest.fn(),
    getTeamMember: jest.fn(async () => null),
    acceptInvitation: jest.fn(),
  },
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
    const plaintext = mail.text.match(/\/invite\/([0-9a-f]{64})/)?.[1];
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
      "inv-1",
      TEAM.id,
      "user-2",
      TeamRole.EDITOR,
    );
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
    expect(asMock(teamRepo.consumeInvitationToken)).toHaveBeenCalledWith(
      "inv-1",
    );
  });
});

// Info: (20260815 - Luphia) 保留 import 以確保型別對得上（未設定寄信的分支由服務層轉譯錯誤碼）
void MailNotConfiguredError;
