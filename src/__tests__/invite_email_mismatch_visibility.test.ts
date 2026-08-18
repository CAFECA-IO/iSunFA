import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { attachEmailMismatch } from "@/lib/team/member_visibility";
import { teamRepo } from "@/repositories/team.repo";
import { TeamRole } from "@/constants/team";
import { INVITE_EMAIL_MATCH } from "@/constants/status";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260818 - Luphia) 信箱不符必須被看見（PR #6652 第三輪 C-2）。
 *
 * `acceptedEmailMatch` 先前是純寫入欄位——寫得很認真，沒有任何讀者。
 * 稽核欄位沒有讀者等於沒有稽核：連結被轉寄出去、被別人用掉，
 * 資料庫裡留了痕跡而沒有人會看到。
 *
 * 這一檔釘住兩件事：查得出來（repo），以及只給有權處置的人看（可見性規則）。
 */

/**
 * Info: (20260818 - Luphia) 標記改以**來源邀請的外鍵**查詢（第六輪第 1 條）：
 * 從成員那一側查，因此只需要 mock `teamMember.findMany`。
 */
jest.mock("@/lib/prisma", () => ({
  prisma: { teamMember: { findMany: jest.fn(async () => []) } },
}));

const memberMock = prisma.teamMember.findMany as unknown as ReturnType<
  typeof jest.fn
>;

beforeEach(() => {
  jest.clearAllMocks();
  memberMock.mockResolvedValue([]);
});

const MEMBERS = [
  { id: "m1", userId: "u1", role: TeamRole.EDITOR },
  { id: "m2", userId: "u2", role: TeamRole.VIEWER },
];

describe("listMismatchedAcceptorIds", () => {
  /**
   * Info: (20260818 - Luphia) **整組**比對查詢參數（第五輪 T-3 的理由不變）。
   *
   * 逐欄斷言擋不住「多一個鍵」——例如 `take: 1` 會讓整個團隊只檢查一位成員，
   * 而幾乎所有標記都會消失（一個安靜的「保護還在、但沒在保護」）。
   */
  it("查詢參數完全符合預期（不多也不少）", async () => {
    await teamRepo.listMismatchedAcceptorIds("team-1");

    expect(memberMock.mock.calls[0][0]).toEqual({
      /**
       * Info: (20260818 - Luphia) 三個條件各自對應一句話：
       * 這個團隊的（teamId）、現任成員（`TeamMember` 列存在本身）、
       * 且**這一段**成員資格的來源邀請記為不符（外鍵 + 巢狀條件）。
       */
      where: {
        teamId: "team-1",
        joinedByInvitation: {
          acceptedEmailMatch: INVITE_EMAIL_MATCH.MISMATCHED,
        },
      },
      // Info: (20260818 - Luphia) 只要 userId：不為了畫一個標記把別人的信箱撈出來
      select: { userId: true },
    });
  });

  it("回傳不符者的 userId 清單", async () => {
    memberMock.mockResolvedValue([{ userId: "u1" }, { userId: "u9" }]);

    expect(await teamRepo.listMismatchedAcceptorIds("team-1")).toEqual([
      "u1",
      "u9",
    ]);
  });

  it("沒有人不符時回空陣列", async () => {
    memberMock.mockResolvedValue([]);

    expect(await teamRepo.listMismatchedAcceptorIds("team-1")).toEqual([]);
  });

  /**
   * Info: (20260818 - Luphia) 「只看現在這段成員資格」與「只看現任成員」這兩件事
   * 現在都由查詢本身保證，因此不再有對應的單元測試——
   * 它們不是程式裡的判斷，而是資料模型的性質（外鍵 + 列的存在）。
   * 真實流程的驗證在 `src/__tests__/e2e/invite_mismatch_badge.e2e.test.ts`。
   */
});

describe("attachEmailMismatch", () => {
  it("管理職看得到標記，且只標在對應的那位成員上", () => {
    const result = attachEmailMismatch(MEMBERS, TeamRole.OWNER, ["u2"]);

    expect(result).toEqual([
      { id: "m1", userId: "u1", role: TeamRole.EDITOR, emailMismatch: false },
      { id: "m2", userId: "u2", role: TeamRole.VIEWER, emailMismatch: true },
    ]);
  });

  // Info: (20260818 - Luphia) ADMIN 同樣有處置成員的權限，因此同樣看得到（產品決定 20260817）
  it("ADMIN 也看得到", () => {
    const result = attachEmailMismatch(MEMBERS, TeamRole.ADMIN, ["u1"]);
    expect(result[0]).toHaveProperty("emailMismatch", true);
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：非管理職拿到的是**原樣的清單**。
   *
   * 刻意不給 `emailMismatch: false`——一個恆為 false 的欄位會讓前端
   * 把「沒有標記」讀成「已驗證相符」，而一般成員根本沒有這項資訊。
   */
  it("非管理職完全不會拿到這個欄位", () => {
    for (const role of [TeamRole.EDITOR, TeamRole.VIEWER, null, undefined]) {
      const result = attachEmailMismatch(MEMBERS, role, ["u1", "u2"]);
      for (const member of result) {
        expect(member).not.toHaveProperty("emailMismatch");
      }
    }
  });

  it("不改動傳進來的陣列", () => {
    const input = [{ id: "m1", userId: "u1" }];
    attachEmailMismatch(input, TeamRole.OWNER, ["u1"]);
    expect(input[0]).not.toHaveProperty("emailMismatch");
  });

  it("沒有不符的成員時，每個人都是 false", () => {
    const result = attachEmailMismatch(MEMBERS, TeamRole.OWNER, []);
    expect(result.every((m) => "emailMismatch" in m && !m.emailMismatch)).toBe(
      true,
    );
  });
});
