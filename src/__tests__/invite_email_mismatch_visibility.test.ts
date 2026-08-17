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

jest.mock("@/lib/prisma", () => ({
  prisma: { teamInvitation: { findMany: jest.fn(async () => []) } },
}));

const findManyMock = prisma.teamInvitation.findMany as unknown as ReturnType<
  typeof jest.fn
>;

beforeEach(() => {
  jest.clearAllMocks();
  findManyMock.mockResolvedValue([]);
});

const MEMBERS = [
  { id: "m1", userId: "u1", role: TeamRole.EDITOR },
  { id: "m2", userId: "u2", role: TeamRole.VIEWER },
];

describe("listMismatchedAcceptorIds", () => {
  it("只查這個團隊已接受的邀請，並依接受時間遞減", async () => {
    await teamRepo.listMismatchedAcceptorIds("team-1");

    const args = findManyMock.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    };
    expect(args.where).toEqual({
      teamId: "team-1",
      acceptedByUserId: { not: null },
      /**
       * Info: (20260818 - Luphia) `acceptedAt` 非 null 是排序正確的前提（第四輪自審）：
       * Postgres 的 DESC 把 NULL 排最前面，缺時間的異常列會被當成最新那一筆。
       */
      acceptedAt: { not: null },
    });
    /**
     * Info: (20260818 - Luphia) 排序是「取每人最新一筆」的依據（第四輪 B-4）。
     * 少了它，挑到的是資料庫回傳順序裡的任意一筆。
     */
    expect(args.orderBy).toEqual({ acceptedAt: "desc" });
  });

  /**
   * Info: (20260818 - Luphia) 只取判定需要的三欄。
   *
   * 邀請列裡有受邀者的信箱，而呼叫端要的只是「這個人要不要標一下」——
   * 為了畫一個標記而把別人的信箱一併撈出來，是不必要的暴露。
   */
  it("只取判定所需的欄位，不撈受邀者的信箱", async () => {
    await teamRepo.listMismatchedAcceptorIds("team-1");

    const args = findManyMock.mock.calls[0][0] as {
      select: Record<string, unknown>;
    };
    expect(args.select).toEqual({
      acceptedByUserId: true,
      acceptedEmailMatch: true,
      acceptedAt: true,
    });
  });

  const accepted = (
    userId: string | null,
    match: string | null,
    acceptedAt: string,
  ) => ({
    acceptedByUserId: userId,
    acceptedEmailMatch: match,
    acceptedAt: new Date(acceptedAt),
  });

  it("回傳不符者的 userId 清單", async () => {
    findManyMock.mockResolvedValue([
      accepted("u1", INVITE_EMAIL_MATCH.MISMATCHED, "2026-08-10"),
      accepted("u2", INVITE_EMAIL_MATCH.MATCHED, "2026-08-09"),
      accepted("u9", INVITE_EMAIL_MATCH.MISMATCHED, "2026-08-08"),
    ]);

    expect(await teamRepo.listMismatchedAcceptorIds("team-1")).toEqual([
      "u1",
      "u9",
    ]);
  });

  /**
   * Info: (20260818 - Luphia) 本組最重要的一條：**只看最近一次加入**（第四輪 B-4）。
   *
   * 一月以不符的信箱加入、被移出、二月以正確信箱重新加入並記為 MATCHED——
   * 舊寫法會永遠掛著標記，而且沒有任何操作能清掉它。
   */
  it("重新加入且相符時不再標記", async () => {
    findManyMock.mockResolvedValue([
      accepted("u1", INVITE_EMAIL_MATCH.MATCHED, "2026-02-01"),
      accepted("u1", INVITE_EMAIL_MATCH.MISMATCHED, "2026-01-01"),
    ]);

    expect(await teamRepo.listMismatchedAcceptorIds("team-1")).toEqual([]);
  });

  // Info: (20260818 - Luphia) 反向也要成立：最近一次不符就要標，即使先前相符過
  it("最近一次不符時仍要標記", async () => {
    findManyMock.mockResolvedValue([
      accepted("u1", INVITE_EMAIL_MATCH.MISMATCHED, "2026-02-01"),
      accepted("u1", INVITE_EMAIL_MATCH.MATCHED, "2026-01-01"),
    ]);

    expect(await teamRepo.listMismatchedAcceptorIds("team-1")).toEqual(["u1"]);
  });

  // Info: (20260818 - Luphia) 位址邀請沒有可比對的信箱（null），不是「不符」
  it("比對結果為 null 或 UNAVAILABLE 都不標記", async () => {
    findManyMock.mockResolvedValue([
      accepted("u1", null, "2026-08-10"),
      accepted("u2", INVITE_EMAIL_MATCH.UNAVAILABLE, "2026-08-10"),
    ]);

    expect(await teamRepo.listMismatchedAcceptorIds("team-1")).toEqual([]);
  });

  // Info: (20260818 - Luphia) 併發下可能讀到尚未寫入接受者的列；null 不該變成 "null" 字串
  it("濾掉沒有接受者的列", async () => {
    findManyMock.mockResolvedValue([
      accepted(null, INVITE_EMAIL_MATCH.MISMATCHED, "2026-08-10"),
      accepted("u1", INVITE_EMAIL_MATCH.MISMATCHED, "2026-08-09"),
    ]);

    expect(await teamRepo.listMismatchedAcceptorIds("team-1")).toEqual(["u1"]);
  });
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
