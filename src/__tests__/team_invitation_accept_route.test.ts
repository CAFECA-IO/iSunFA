import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { POST as acceptRoute } from "@/app/api/v1/user/team/invitations/[invite_id]/accept/route";
import { teamRepo } from "@/repositories/team.repo";
import { userIdentityRepo } from "@/repositories/user_identity.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { INVITE_EMAIL_MATCH, TEAM_INVITATION_STATUS } from "@/constants/status";

/**
 * Info: (20260826 - Julian) 三道檢查要真的擋在**這支 handler** 上（checklist §1.7）。
 *
 * B1 的主要修法落在這裡（`canActOnInvitation` 的呼叫與 `if (!check.ok)`），
 * 而先前整個 `src/__tests__` 沒有任何一支匯入這支 route ——
 * `team_invitation_recipient.test.ts` 測的是純函式，
 * `team_invitation_email.test.ts` 接的是 decline 的 service。
 * reviewer 的 mutation 說明了差別：
 *
 *     刪掉 `if (!check.ok) return jsonFail(check.error);`（保留上面那次呼叫）
 *     → 任何登入者拿一個 invite id 就能接受別人的、以及已逾期的邀請
 *       （吃掉一個付費席次），稽核還會寫成 MATCHED —— 而測試全綠
 *
 * 這是 B5 修好的那個形狀，隔壁那條路徑。所以這一檔直接呼叫 handler。
 *
 * mock 的邊界落在**外部世界**（DB、WebAuthn、bundler），
 * `team_invitation.service` 用真的 —— 要證明的正是「請求走到這個 handler 時，
 * 那三道真的判定會不會擋下來」。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xinvitee",
    name: "受邀者",
  })),
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    getInvitationByIdWithDetails: jest.fn(),
    acceptInvitation: jest.fn(async () => ({ id: "member-1" })),
  },
}));

jest.mock("@/repositories/user_identity.repo", () => ({
  userIdentityRepo: { findByUserId: jest.fn(async () => []) },
}));

/**
 * Info: (20260826 - Julian) FIDO2 與鏈上訊息在這一檔一律成功。
 *
 * 它們排在三道檢查**之後**：讓它們永遠通過，才能保證下面任何一次
 * 「被擋下來」都是那三道擋的，而不是簽章驗證順手擋掉的。
 */
jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserById: jest.fn(async () => ({ currentChallenge: "challenge" })),
    clearChallenge: jest.fn(async () => undefined),
  },
}));

jest.mock("@/services/webauthn.service", () => ({
  webAuthnService: { verifySignature: jest.fn(async () => true) },
}));

jest.mock("@/services/bundler.service", () => ({
  bundlerService: { sendUserOp: jest.fn(async () => undefined) },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "invite-1",
    teamId: "team-1",
    role: "VIEWER",
    status: TEAM_INVITATION_STATUS.PENDING,
    expiresAt: null,
    inviteeAddress: null,
    inviteeEmail: null,
    inviter: { name: "邀請人", address: "0xinviter" },
    team: { name: "測試團隊" },
    ...overrides,
  };
}

async function accept(): Promise<{
  status: number;
  body: { success: boolean; errorCode?: string };
}> {
  const response = await acceptRoute(
    new NextRequest(
      "https://isunfa.com/api/v1/user/team/invitations/invite-1/accept",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dewt",
        },
        body: JSON.stringify({ authentication: { id: "cred" } }),
      },
    ),
    { params: Promise.resolve({ invite_id: "invite-1" }) },
  );
  return {
    status: response.status,
    body: (await response.json()) as { success: boolean; errorCode?: string },
  };
}

describe("接受邀請的 handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: "0xinvitee",
      name: "受邀者",
    });
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([]);
    asMock(teamRepo.acceptInvitation).mockResolvedValue({ id: "member-1" });
  });

  // Info: (20260826 - Julian) 位址邀請：既有路徑不能被 B1 的放寬弄壞
  it("位址相符時接受成功，稽核的 emailMatch 是 null", async () => {
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation({ inviteeAddress: "0xinvitee" }),
    );

    const { body } = await accept();

    expect(body.success).toBe(true);
    expect(asMock(teamRepo.acceptInvitation)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", emailMatch: null }),
    );
  });

  /**
   * Info: (20260826 - Julian) B1 本體：email 邀請要接得了。
   *
   * 這一條與下面的「未驗證信箱擋掉」成對。只留這一條的話，
   * 把 `resolveRecipientKeys` 的 `emailVerified` 過濾拿掉也會全綠。
   */
  it("已驗證信箱相符時接受成功，稽核記為 MATCHED", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "bob@corp.com", emailVerified: true },
    ]);
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation({
        inviteeEmail: "Bob@Corp.com",
        expiresAt: new Date(NOW + 3 * DAY),
      }),
    );

    const { body } = await accept();

    expect(body.success).toBe(true);
    expect(asMock(teamRepo.acceptInvitation)).toHaveBeenCalledWith(
      expect.objectContaining({ emailMatch: INVITE_EMAIL_MATCH.MATCHED }),
    );
  });

  /**
   * Info: (20260826 - Julian) 三道檢查各自擋得住，而且**都沒有寫入**。
   *
   * 斷言成對：回了錯誤碼**且** `acceptInvitation` 沒被呼叫。只驗前者的話，
   * 「先寫入再回錯」會通過 —— 而這支端點的寫入會佔掉一個付費席次。
   */
  it("不是收件者時擋下，且不寫入", async () => {
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation({ inviteeAddress: "0xsomeone-else" }),
    );

    const { body } = await accept();

    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(API_ERRORS.FO_YOU_ARE_NOT_THE_INTENDED_RE.code);
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) 逾期是 B1 順帶補的那一道，位址邀請上看不出來。
   *
   * 收件者本人、狀態也還是 PENDING —— 只有 `expiresAt` 過了。
   * 少了這一道，「逾期三個月的 email 邀請仍可接受並佔一個付費席次」成真。
   */
  it("逾期的邀請即使本人也擋下，且不寫入", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "bob@corp.com", emailVerified: true },
    ]);
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation({
        inviteeEmail: "bob@corp.com",
        expiresAt: new Date(NOW - DAY),
      }),
    );

    const { body } = await accept();

    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO.code);
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  // Info: (20260826 - Julian) 已接受過的邀請不能再接受一次（連點兩次的第二次）
  it("狀態不是 PENDING 時擋下，且不寫入", async () => {
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation({
        inviteeAddress: "0xinvitee",
        status: TEAM_INVITATION_STATUS.ACCEPTED,
      }),
    );

    const { body } = await accept();

    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO.code);
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) 未驗證的信箱不算數（review：既有護欄）。
   *
   * 少了 `emailVerified` 過濾，宣稱一個信箱就能加入別人的團隊。
   * 這一條與上面的「已驗證信箱相符」是同一組資料、只差那個布林。
   */
  it("信箱未驗證時擋下，且不寫入", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "bob@corp.com", emailVerified: false },
    ]);
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation({
        inviteeEmail: "bob@corp.com",
        expiresAt: new Date(NOW + 3 * DAY),
      }),
    );

    const { body } = await accept();

    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(API_ERRORS.FO_YOU_ARE_NOT_THE_INTENDED_RE.code);
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) canonical 相等但精確不等 → 擋（D28）。
   *
   * 自建網域上的 `bob+x@corp.com` 與 `bob@corp.com` 是兩把相同的 canonical 鍵、
   * 兩個可以不同的人。判定必須回到精確信箱。
   */
  it("canonical 相同但信箱不同時擋下", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      { email: "bob@corp.com", emailVerified: true },
    ]);
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation({
        inviteeEmail: "bob+x@corp.com",
        expiresAt: new Date(NOW + 3 * DAY),
      }),
    );

    const { body } = await accept();

    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(API_ERRORS.FO_YOU_ARE_NOT_THE_INTENDED_RE.code);
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Julian) 兩欄皆空的邀請不能被任何人接受。
   *
   * 今天造不出這種列，這一條防的是「今天造不出來」哪天不成立 ——
   * 失效時的形狀是 `null === null` 讓全站任何人接受它。
   */
  it("受邀位址與受邀信箱皆空時，任何人都接受不了", async () => {
    asMock(teamRepo.getInvitationByIdWithDetails).mockResolvedValue(
      invitation(),
    );

    const { body } = await accept();

    expect(body.success).toBe(false);
    expect(asMock(teamRepo.acceptInvitation)).not.toHaveBeenCalled();
  });
});
