import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { teamRepo } from "@/repositories/team.repo";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260819 - Luphia) 每日寄送數的查詢條件（review #6684 高的同一個成因）。
 *
 * `countInvitationsCreatedSince` 的 `where` 先前完全沒有測試（Prisma 全 mock），
 * 於是把 `teamId` 拿掉會變成**全站計數**——任何團隊在全站累積 50 封之後，
 * 所有團隊一起無法邀請，而測試仍然全綠。
 *
 * 條件有三個各自獨立的性質，因此逐一斷言而不是只看「有沒有呼叫」：
 * 限定團隊、以建立時間為界、**不濾 status**（撤回與被拒絕的仍然算——信已經寄出去了，
 * 而這道上限管的是寄信量，不是目前還有效的邀請數）。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    teamInvitation: { count: jest.fn(async () => 7) },
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const SINCE = new Date(Date.UTC(2026, 7, 18, 12, 0, 0));

beforeEach(() => {
  jest.clearAllMocks();
  asMock(prisma.teamInvitation.count).mockResolvedValue(7);
});

describe("teamRepo.countInvitationsCreatedSince", () => {
  it("以 teamId 與 createdAt 為條件，且不濾 status", async () => {
    const result = await teamRepo.countInvitationsCreatedSince("team-1", SINCE);

    expect(result).toBe(7);
    expect(asMock(prisma.teamInvitation.count)).toHaveBeenCalledWith({
      where: { teamId: "team-1", createdAt: { gte: SINCE } },
    });
  });

  /**
   * Info: (20260819 - Luphia) 上面那條用 `toHaveBeenCalledWith` 做整組比對，
   * 因此少一個鍵、多一個鍵、或把 `gte` 寫成 `gt` 都會紅。這裡再逐一點名，
   * 是為了讓紅的時候直接看得出壞在哪一個性質。
   */
  it("條件裡確實含 teamId（拿掉會變成全站計數）", async () => {
    await teamRepo.countInvitationsCreatedSince("team-2", SINCE);

    const [args] = asMock(prisma.teamInvitation.count).mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(args.where.teamId).toBe("team-2");
    expect(args.where.status).toBeUndefined();
  });
});
