import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { POST as addressInvite } from "@/app/api/v1/user/team/[team_id]/invitations/route";
import { POST as emailInvite } from "@/app/api/v1/user/team/[team_id]/invitations/email/route";
import { POST as addMember } from "@/app/api/v1/user/team/[team_id]/members/route";
import {
  DELETE as removeMember,
  PATCH as changeMemberRole,
} from "@/app/api/v1/user/team/[team_id]/members/[member_id]/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { inviteMemberByEmail } from "@/services/team_invitation.service";
import { webAuthnService } from "@/services/webauthn.service";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { writeOffAllocationOnMemberRemoval } from "@/services/team_wallet.service";

/**
 * Info: (20260819 - Luphia) 管理職權限閘真的擋在路徑上（review #6685 高-2）。
 *
 * 取消 ADMIN 那一輪改寫了五道權限閘，而**一條測試都沒有**：新增的掃描測試只驗
 * 列舉、`TEAM_MANAGER_ROLES` 與原始碼字串，擋的是「ADMIN 悄悄回來」——擋不到
 * 「閘被拆掉」。
 *
 * reviewer 給的 mutation 很具體：把 `invitations/route.ts` 的
 * `if (!isTeamManagerRole(operator?.role))` 改成 `if (!operator)`，
 * **任何 VIEWER 都能邀請成員**，而同一支 route 接著就會向訂閱那張卡補收席次費用。
 * 全套測試綠，掃描測試也綠——因為沒有出現 `"ADMIN"` 這個字。
 *
 * 這一檔因此直接匯入三支會**動錢或動成員**的 route handler，對每一種非管理職
 * 斷言「被擋下」且「沒有進入扣款」。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xoperator",
  })),
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    getTeamMember: jest.fn(async () => ({ role: "OWNER" })),
    getTeamInvitation: jest.fn(async () => null),
    createTeamInvitation: jest.fn(async () => ({ id: "inv-1" })),
    countPendingInvitations: jest.fn(async () => 0),
    countInvitationsCreatedSince: jest.fn(async () => 0),
    findLastInvitationSentAt: jest.fn(async () => null),
    getTeamById: jest.fn(async () => ({ id: "team-1", name: "T" })),
    createTeamMember: jest.fn(async () => ({ id: "member-1" })),
    /**
     * Info: (20260819 - Luphia) `members/[member_id]` 的四支（review #6685 的一句備註）。
     * 逐項列舉而不是 `...actual`：teamRepo 直接碰 prisma，requireActual 會把真連線帶進來。
     */
    getTeamMemberById: jest.fn(async () => ({
      id: "member-2",
      teamId: "team-1",
      userId: "user-target",
      role: "VIEWER",
    })),
    countTeamMembersByRole: jest.fn(async () => 2),
    updateTeamMember: jest.fn(async () => ({ id: "member-2", role: "EDITOR" })),
    deleteTeamMember: jest.fn(async () => ({ id: "member-2" })),
  },
}));

/**
 * Info: (20260819 - Luphia) 移除成員的兩個副作用（分配沖銷、記憶刪除）都要 stub：
 * 兩者都會碰資料庫，而它們與被測的權限閘無關——不 stub 的話「閘擋下了嗎」
 * 會被一個資料庫錯誤蓋掉（checklist §1.8）。
 */
jest.mock("@/services/team_wallet.service", () => ({
  writeOffAllocationOnMemberRemoval: jest.fn(async () => undefined),
}));

jest.mock("@/services/faith_memory.service", () => ({
  deleteFaithMemoryOnMemberRemoval: jest.fn(async () => undefined),
}));

jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserById: jest.fn(async () => ({
      id: "user-1",
      currentChallenge: "challenge",
    })),
    findUserByAddress: jest.fn(async () => null),
    clearChallenge: jest.fn(),
  },
}));

jest.mock("@/services/webauthn.service", () => ({
  webAuthnService: { verifySignature: jest.fn(async () => true) },
}));

jest.mock("@/services/team_seat.service", () => ({
  chargeSeatAddition: jest.fn(async () => ({
    charged: false,
    amount: 0,
    seats: 0,
  })),
}));

jest.mock("@/services/team_invitation.service", () => {
  const actual = jest.requireActual<
    typeof import("@/services/team_invitation.service")
  >("@/services/team_invitation.service");
  /**
   * Info: (20260819 - Luphia) `...actual` 之後才覆寫要 stub 的那兩支。
   *
   * 這樣寫是為了**跨分支穩健**：邀請量控那條分支（#6684）在同一個模組裡加了
   * `InviteCooldownError`，而兩支邀請 route 會對它做 `instanceof`。逐項列舉的
   * mock 在合併之後會少掉那個類別，於是 `instanceof undefined` 讓整條路徑丟
   * TypeError——與被測的權限閘無關（checklist §1.8：mock 要照實模擬被 mock 的東西）。
   */
  return {
    ...actual,
    inviteMemberByEmail: jest.fn(async () => ({ invitationId: "inv-1" })),
    assertInviteVolumeWithinLimits: jest.fn(async () => undefined),
  };
});

jest.mock("@/services/bundler.service", () => ({
  bundlerService: { sendUserOp: jest.fn(async () => "0xhash") },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const PARAMS = Promise.resolve({ team_id: "team-1" });

function body(extra: Record<string, unknown>): string {
  return JSON.stringify({
    role: "VIEWER",
    authentication: { id: "cred" },
    expectedAmount: 0,
    ...extra,
  });
}

function post(path: string, payload: string): NextRequest {
  return new NextRequest(`https://isunfa.com/api/v1/user/team/team-1/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer dewt",
    },
    body: payload,
  });
}

const ADDRESS = `0x${"1".repeat(40)}`;

/**
 * Info: (20260819 - Luphia) 三支端點的共同性質：管理職以外一律擋下，而且**擋在扣款之前**。
 * 每個案例用獨立的操作者位址：寄送端有依操作者的限流，共用位址會讓前面的案例
 * 打滿桶子而汙染後面的（那種耦合與被測的行為無關）。
 */
const ENDPOINTS = [
  {
    name: "位址邀請",
    call: (): Promise<Response> =>
      addressInvite(post("invitations", body({ address: ADDRESS })), {
        params: PARAMS,
      }),
  },
  {
    name: "email 邀請",
    call: (): Promise<Response> =>
      emailInvite(post("invitations/email", body({ email: "a@example.com" })), {
        params: PARAMS,
      }),
  },
  {
    name: "直接加入成員",
    call: (): Promise<Response> =>
      addMember(post("members", body({ address: ADDRESS })), {
        params: PARAMS,
      }),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  asMock(webAuthnService.verifySignature).mockResolvedValue(true);
  asMock(teamRepo.getTeamMember).mockResolvedValue({ role: "OWNER" });
  /**
   * Info: (20260819 - Luphia) `clearAllMocks()` 清呼叫紀錄但**不還原
   * `mockResolvedValue` / `mockImplementation`**，因此角色驗證那組設下的
   * 「受邀者存在」會滲進後面的案例，讓「OWNER 可以邀請」撞上「已經是成員」。
   * 這裡逐案重設（本檔實際發生過）。
   */
  asMock(webAuthnRepo.findUserByAddress).mockResolvedValue(null);
});

describe("會動錢的端點：管理職以外一律擋下", () => {
  /**
   * Info: (20260819 - Luphia) 含**殘留的 `"ADMIN"` 字串**：回填跑之前那種列還在，
   * 而它們不該還能替 OWNER 的卡刷錢。
   */
  const NON_MANAGERS = ["EDITOR", "VIEWER", "ADMIN"];

  ENDPOINTS.forEach((endpoint, endpointIndex) => {
    it.each(NON_MANAGERS)(
      `${endpoint.name}：%s 被擋下，且不進入扣款`,
      async (role) => {
        asMock(getIdentityFromDeWT).mockResolvedValue({
          id: "user-1",
          address: `0xgate-${endpointIndex}-${role}`,
        });
        asMock(teamRepo.getTeamMember).mockResolvedValue({ role });

        const response = await endpoint.call();

        expect(response.status).not.toBe(200);
        expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
        expect(asMock(inviteMemberByEmail)).not.toHaveBeenCalled();
        expect(asMock(teamRepo.createTeamInvitation)).not.toHaveBeenCalled();
        expect(asMock(teamRepo.createTeamMember)).not.toHaveBeenCalled();
      },
    );

    it(`${endpoint.name}：不是團隊成員也被擋下`, async () => {
      asMock(getIdentityFromDeWT).mockResolvedValue({
        id: "user-1",
        address: `0xgate-${endpointIndex}-none`,
      });
      asMock(teamRepo.getTeamMember).mockResolvedValue(null);

      const response = await endpoint.call();

      expect(response.status).not.toBe(200);
      expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
    });
  });

  /**
   * Info: (20260819 - Luphia) 送出已移除的角色要**拒絕**，不是靜默降為 VIEWER
   * （review #6685 中-3）。
   *
   * 具體情境：部署後 OWNER 的瀏覽器還跑著快取的舊 JS（對話框仍列出 ADMIN 選項），
   * 或某個 integration 仍送 `role: "ADMIN"`。舊行為是流程走完、**先扣一席的錢**、
   * 建一封 VIEWER 邀請、回 200——團隊付了錢、拿到一個角色不對的成員，
   * 而畫面沒有任何錯誤。
   *
   * 斷言成對：回應不是 200 **且**沒有進入扣款。只驗前者的話，「擋了但錢已經刷了」
   * 也會通過。
   */
  it.each([
    [
      "位址邀請",
      (): Promise<Response> =>
        addressInvite(
          post("invitations", body({ address: ADDRESS, role: "ADMIN" })),
          { params: PARAMS },
        ),
    ],
    [
      "email 邀請",
      (): Promise<Response> =>
        emailInvite(
          post(
            "invitations/email",
            body({ email: "a@example.com", role: "ADMIN" }),
          ),
          { params: PARAMS },
        ),
    ],
    [
      "直接加入成員",
      (): Promise<Response> =>
        addMember(post("members", body({ address: ADDRESS, role: "ADMIN" })), {
          params: PARAMS,
        }),
    ],
  ])("%s：送出已移除的 ADMIN 角色被拒絕，且不扣款", async (_label, call) => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: `0xrole-${_label}`,
    });
    /**
     * Info: (20260819 - Luphia) 這三條要真的走到「角色驗證」那一步才有意義。
     *
     * 第一版沒有安排受邀者存在，於是「直接加入成員」是在更後面的
     * `findUserByAddress → NF_USER` 被擋下的——斷言照樣通過，而拿掉角色驗證
     * 也照樣通過。**判準與缺陷相容**（checklist §1.9）。
     *
     * 因此這裡讓受邀者存在、且尚未是成員：擋下來的理由就只剩角色驗證。
     */
    asMock(webAuthnRepo.findUserByAddress).mockResolvedValue({
      id: "user-target",
      address: ADDRESS,
    });
    asMock(teamRepo.getTeamMember).mockImplementation(
      async (userId: unknown) =>
        userId === "user-1" ? { role: "OWNER" } : null,
    );

    const response = await call();

    expect(response.status).not.toBe(200);
    expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
    expect(asMock(inviteMemberByEmail)).not.toHaveBeenCalled();
    expect(asMock(teamRepo.createTeamMember)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 另一半：OWNER 要真的走得通。
   * 少了這一條，把三道閘都寫成「一律擋」也會讓上面全部通過。
   */
  it("OWNER 可以邀請（否則「一律擋」也會通過上面所有案例）", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: "0xgate-owner",
    });

    const response = await addressInvite(
      post("invitations", body({ address: ADDRESS })),
      { params: PARAMS },
    );

    expect(response.status).toBe(200);
    expect(asMock(chargeSeatAddition)).toHaveBeenCalledTimes(1);
  });
});

/**
 * Info: (20260819 - Luphia) 第五道閘：`members/[member_id]`（改角色 / 移除成員）。
 *
 * 上一輪 reviewer 的一句備註——接線測試涵蓋三支「會動錢」的 route，而這一支
 * 「若要補值得補」：它能**改角色**（把人升成 OWNER 就等於多一位可以動錢的人）
 * 也能**移除成員**（移除會釋出席次，而席次是計費單位）。
 *
 * 兩支 handler 的閘不同，所以分開驗：
 *
 * - `PATCH`（改角色）是硬性 `operator.role !== "OWNER"`
 * - `DELETE`（移除）走 `isTeamManagerRole`，但**自己退出團隊不受限**
 *
 * 最後一條（自刪）是這一組裡最容易被改壞的：把 `!isSelfDelete && !isManager`
 * 簡化成 `!isManager` 會讓任何非管理職**無法退出團隊**，而所有「被擋下」的
 * 斷言都還是綠的。
 */
describe("成員管理端點：改角色限 OWNER、移除他人限管理職", () => {
  const MEMBER_PARAMS = Promise.resolve({
    team_id: "team-1",
    member_id: "member-2",
  });

  function memberRequest(method: string): NextRequest {
    return new NextRequest(
      "https://isunfa.com/api/v1/user/team/team-1/members/member-2",
      {
        method,
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dewt",
        },
        body: JSON.stringify({
          role: "EDITOR",
          authentication: { id: "cred" },
        }),
      },
    );
  }

  const NON_OWNERS = ["EDITOR", "VIEWER", "ADMIN"];

  it.each(NON_OWNERS)("改角色：%s 被擋下，且沒有改任何角色", async (role) => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: `0xpatch-${role}`,
    });
    asMock(teamRepo.getTeamMember).mockResolvedValue({ id: "member-1", role });

    const response = await changeMemberRole(memberRequest("PATCH"), {
      params: MEMBER_PARAMS,
    });

    expect(response.status).not.toBe(200);
    expect(asMock(teamRepo.updateTeamMember)).not.toHaveBeenCalled();
  });

  it.each(NON_OWNERS)(
    "移除他人：%s 被擋下，且沒有移除、沒有沖銷分配",
    async (role) => {
      asMock(getIdentityFromDeWT).mockResolvedValue({
        id: "user-1",
        address: `0xdelete-${role}`,
      });
      asMock(teamRepo.getTeamMember).mockResolvedValue({
        id: "member-1",
        role,
      });

      const response = await removeMember(memberRequest("DELETE"), {
        params: MEMBER_PARAMS,
      });

      expect(response.status).not.toBe(200);
      expect(asMock(teamRepo.deleteTeamMember)).not.toHaveBeenCalled();
      expect(asMock(writeOffAllocationOnMemberRemoval)).not.toHaveBeenCalled();
    },
  );

  it("移除他人：不是團隊成員也被擋下", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: "0xdelete-none",
    });
    asMock(teamRepo.getTeamMember).mockResolvedValue(null);

    const response = await removeMember(memberRequest("DELETE"), {
      params: MEMBER_PARAMS,
    });

    expect(response.status).not.toBe(200);
    expect(asMock(teamRepo.deleteTeamMember)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 改角色送出已移除的 ADMIN 值要**拒絕**，
   * 不是靜默寫進資料庫（那會造出一個權限判斷一律 false 的成員）。
   */
  it("改角色：OWNER 送出已移除的 ADMIN 值也被拒絕", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: "0xpatch-admin-value",
    });
    asMock(teamRepo.getTeamMember).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    });

    const response = await changeMemberRole(
      new NextRequest(
        "https://isunfa.com/api/v1/user/team/team-1/members/member-2",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer dewt",
          },
          body: JSON.stringify({
            role: "ADMIN",
            authentication: { id: "cred" },
          }),
        },
      ),
      { params: MEMBER_PARAMS },
    );

    expect(response.status).not.toBe(200);
    expect(asMock(teamRepo.updateTeamMember)).not.toHaveBeenCalled();
  });

  // Info: (20260819 - Luphia) 另一半之一：OWNER 真的改得動、也移得動
  it("OWNER 改得動角色", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: "0xpatch-owner",
    });
    asMock(teamRepo.getTeamMember).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    });

    const response = await changeMemberRole(memberRequest("PATCH"), {
      params: MEMBER_PARAMS,
    });

    expect(response.status).toBe(200);
    expect(asMock(teamRepo.updateTeamMember)).toHaveBeenCalledWith("member-2", {
      role: "EDITOR",
    });
  });

  it("OWNER 移除得了他人", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: "0xdelete-owner",
    });
    asMock(teamRepo.getTeamMember).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    });

    const response = await removeMember(memberRequest("DELETE"), {
      params: MEMBER_PARAMS,
    });

    expect(response.status).toBe(200);
    expect(asMock(teamRepo.deleteTeamMember)).toHaveBeenCalledWith("member-2");
  });

  /**
   * Info: (20260819 - Luphia) 另一半之二：**自己退出團隊不受角色限制**。
   *
   * 這一條擋的是「把閘簡化成一律限管理職」那種改法——所有「被擋下」的斷言
   * 都還會是綠的，而 EDITOR 從此無法離開團隊（只能請 OWNER 動手）。
   */
  it("EDITOR 可以自己退出團隊（自刪不受管理職限制）", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue({
      id: "user-1",
      address: "0xdelete-self",
    });
    asMock(teamRepo.getTeamMember).mockResolvedValue({
      id: "member-2",
      role: "EDITOR",
    });
    asMock(teamRepo.getTeamMemberById).mockResolvedValue({
      id: "member-2",
      teamId: "team-1",
      userId: "user-1",
      role: "EDITOR",
    });

    const response = await removeMember(memberRequest("DELETE"), {
      params: MEMBER_PARAMS,
    });

    expect(response.status).toBe(200);
    expect(asMock(teamRepo.deleteTeamMember)).toHaveBeenCalledWith("member-2");
  });
});
