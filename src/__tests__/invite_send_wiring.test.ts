import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { POST as addressInvite } from "@/app/api/v1/user/team/[team_id]/invitations/route";
import { POST as emailInvite } from "@/app/api/v1/user/team/[team_id]/invitations/email/route";
import { teamRepo } from "@/repositories/team.repo";
import { inviteMemberByEmail } from "@/services/team_invitation.service";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnService } from "@/services/webauthn.service";
import { RATE_LIMIT_RULES, RateLimitBucketEnum } from "@/constants/rate_limit";

/**
 * Info: (20260819 - Luphia) 邀請**寄送端**的量控真的擋在路徑上（產品決定 20260819）。
 *
 * 免費版人數上限移除之後，寄信量沒有任何界線。新增的兩層（依操作者的限流、
 * 團隊層的兩道上限）如果只有函式而沒有接線，等於什麼都沒做——而那正是本 repo
 * 犯過的形狀（checklist §1.7：測到函式不等於測到接線）。
 *
 * 因此這一檔**直接匯入兩支 route handler 並呼叫它們**，限流器用真的，
 * mock 的邊界落在外部世界（DB、寄信、扣款）。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xowner",
  })),
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    getTeamMember: jest.fn(async () => ({ role: "OWNER" })),
    getTeamInvitation: jest.fn(async () => null),
    getTeamInvitationByAddress: jest.fn(async () => null),
    createTeamInvitation: jest.fn(async () => ({ id: "inv-1" })),
    countPendingInvitations: jest.fn(async () => 0),
    countInvitationsCreatedSince: jest.fn(async () => 0),
    getUserByAddress: jest.fn(async () => null),
  },
}));

jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserById: jest.fn(async () => ({
      id: "user-1",
      currentChallenge: "challenge",
    })),
    clearChallenge: jest.fn(),
  },
}));

jest.mock("@/services/webauthn.service", () => ({
  // Info: (20260819 - Luphia) 兩支端點都要求當下的 FIDO 簽章（會扣錢的動作）
  webAuthnService: { verifySignature: jest.fn(async () => true) },
}));

jest.mock("@/services/team_seat.service", () => ({
  chargeSeatAddition: jest.fn(async () => ({
    charged: false,
    amount: 0,
    seats: 0,
  })),
}));

jest.mock("@/services/team_invitation.service", () => ({
  inviteMemberByEmail: jest.fn(async () => ({ invitationId: "inv-1" })),
  assertInviteVolumeWithinLimits: jest.fn(async () => undefined),
}));

jest.mock("@/services/bundler.service", () => ({
  bundlerService: { sendUserOperation: jest.fn(async () => "0xhash") },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const PER_MINUTE =
  RATE_LIMIT_RULES[RateLimitBucketEnum.TEAM_INVITE_SEND][0].max;

function emailRequest(): {
  request: NextRequest;
  params: Promise<{ team_id: string }>;
} {
  return {
    request: new NextRequest(
      "https://isunfa.com/api/v1/user/team/team-1/invitations/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dewt",
        },
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "VIEWER",
          authentication: { id: "cred" },
        }),
      },
    ),
    params: Promise.resolve({ team_id: "team-1" }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({
    id: "user-1",
    address: "0xowner",
  });
  asMock(teamRepo.getTeamMember).mockResolvedValue({ role: "OWNER" });
  asMock(webAuthnService.verifySignature).mockResolvedValue(true);
});

describe("邀請寄送端的量控接線", () => {
  /**
   * Info: (20260819 - Luphia) 限流真的擋在路徑上：超限之後不得進入 service。
   *
   * 兩個斷言缺一不可——回應是 429，**且** service 沒有被多呼叫一次。
   * 只驗前者，改成「擋了但還是寄了」也會通過。
   */
  it("email 邀請：超過每分鐘上限後回 429 且不進入 service", async () => {
    for (let i = 0; i < PER_MINUTE; i += 1) {
      const { request, params } = emailRequest();
      const ok = await emailInvite(request, { params });
      expect(ok.status).toBe(200);
    }
    expect(asMock(inviteMemberByEmail)).toHaveBeenCalledTimes(PER_MINUTE);

    const { request, params } = emailRequest();
    const blocked = await emailInvite(request, { params });

    expect(blocked.status).toBe(429);
    expect(asMock(inviteMemberByEmail)).toHaveBeenCalledTimes(PER_MINUTE);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  /**
   * Info: (20260819 - Luphia) 位址邀請走的是同一個桶：兩支端點不能各有一份額度，
   * 否則「兩邊各寄 10 封」就是 20 封。
   */
  it("位址邀請與 email 邀請共用同一個限流桶", async () => {
    const address = "0xdifferent-operator";
    asMock(getIdentityFromDeWT).mockResolvedValue({ id: "user-2", address });

    for (let i = 0; i < PER_MINUTE; i += 1) {
      const { request, params } = emailRequest();
      await emailInvite(request, { params });
    }

    // Info: (20260819 - Luphia) 同一個操作者改打位址邀請，額度已經用完
    const request = new NextRequest(
      "https://isunfa.com/api/v1/user/team/team-1/invitations",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dewt",
        },
        body: JSON.stringify({
          address: `0x${"1".repeat(40)}`,
          role: "VIEWER",
          authentication: { id: "cred" },
        }),
      },
    );
    const blocked = await addressInvite(request, {
      params: Promise.resolve({ team_id: "team-1" }),
    });

    expect(blocked.status).toBe(429);
    expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
  });

  // Info: (20260819 - Luphia) 未登入時連限流都不該記帳（記了就是替匿名流量佔用某個維度）
  it("未登入時不進入 service", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue(null);

    const { request, params } = emailRequest();
    const response = await emailInvite(request, { params });

    expect(response.status).not.toBe(200);
    expect(asMock(inviteMemberByEmail)).not.toHaveBeenCalled();
  });
});
