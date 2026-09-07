import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { teamRepo } from "@/repositories/team.repo";
import { acceptInviteByToken } from "@/services/team_invitation.service";
import { createInviteToken } from "@/lib/team/invite_token";
import { buildPendingInviteKey } from "@/lib/team/pending_invite_key";
import { INVITE_EMAIL_MATCH, TEAM_INVITATION_STATUS } from "@/constants/status";
import { TeamRole } from "@/constants/team";

/**
 * Info: (20260818 - Luphia) 「信箱不符」的標記要真的出現（PR #6652 第六輪第 1 條）。
 *
 * 這一條**只有真資料庫測得出來**，因為壞掉的原因就在真實世界的兩個時間戳關係：
 *
 * | | 來源 | 產生時機 |
 * |---|---|---|
 * | `TeamInvitation.acceptedAt` | app 的 `Date.now()` | route 收到請求那一刻 |
 * | `TeamMember.createdAt` | 資料庫的 `CURRENT_TIMESTAMP`（`@default(now())`） | 那一列真的寫進去那一刻 |
 *
 * 先前的判斷是「邀請的接受時間不早於成員資格的建立時間」，而中間隔著五次以上
 * 查詢——實測差 +19ms，於是條件永遠不成立、**標記永遠不顯示**。
 * 而先前那組單元測試把「加入時間 = 2020-01-01」與「兩個時間精確相等」當成
 * fixture——**兩種狀態在真實資料裡都不可能出現**，所以測試是綠的、功能是死的。
 *
 * 因此這一支跑**真的接受流程**（真的 token、真的 service、真的交易），
 * 然後讀 `listMismatchedAcceptorIds`。
 */

// Info: (20260818 - Luphia) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免建立真實團隊與成員！",
  );
}

const STAMP = Date.now();
let teamId = "";
let ownerId = "";
/** Info: (20260818 - Luphia) 以不同的收件匣接受 → 應被標記 */
let mismatchedUserId = "";
/** Info: (20260818 - Luphia) 以同一個收件匣接受 → 不應被標記 */
let matchedUserId = "";

async function createUserWithEmail(
  suffix: string,
  email: string,
): Promise<string> {
  const user = await prisma.user.create({
    data: { address: `e2e_badge_${suffix}_${STAMP}`, name: `E2E ${suffix}` },
  });
  await prisma.userIdentity.create({
    data: {
      userId: user.id,
      provider: "google",
      providerUserId: `badge-${suffix}-${STAMP}`,
      email,
      emailVerified: true,
    },
  });
  return user.id;
}

/**
 * Info: (20260818 - Luphia) 走真的接受流程：自己產 token、建 PENDING 邀請，
 * 再呼叫 service。刻意不直接寫 `TeamMember`——那樣就繞過了要驗證的那段交易。
 */
async function inviteAndAccept(
  inviteeEmail: string,
  acceptorUserId: string,
): Promise<void> {
  const { token, tokenHash, expiresAt } = createInviteToken(Date.now());
  await prisma.teamInvitation.create({
    data: {
      teamId,
      inviterId: ownerId,
      inviteeEmail,
      tokenHash,
      expiresAt,
      role: TeamRole.VIEWER,
      status: TEAM_INVITATION_STATUS.PENDING,
      pendingKey: buildPendingInviteKey({ teamId, inviteeEmail }),
    },
  });

  await acceptInviteByToken({
    token,
    userId: acceptorUserId,
    nowMs: Date.now(),
  });
}

beforeAll(async () => {
  const team = await prisma.team.create({
    data: { name: `e2e-badge-${STAMP}` },
  });
  teamId = team.id;

  const owner = await prisma.user.create({
    data: { address: `e2e_badge_owner_${STAMP}`, name: "E2E owner" },
  });
  ownerId = owner.id;
  await prisma.teamMember.create({
    data: { teamId, userId: ownerId, role: TeamRole.OWNER },
  });

  /**
   * Info: (20260818 - Luphia) 付費訂閱：接受邀請時有免費版人數上限的第二道防線，
   * 免費團隊只容得下擁有者一人，這支測試要加兩位成員。
   */
  await prisma.teamSubscription.create({
    data: {
      teamId,
      planId: "team",
      status: "ACTIVE",
      currentPeriodStart: new Date(STAMP - 86_400_000),
      currentPeriodEnd: new Date(STAMP + 86_400_000),
      seats: 10,
      unitPrice: 0,
    },
  });

  mismatchedUserId = await createUserWithEmail(
    "mismatch",
    `someone_${STAMP}@example.com`,
  );
  matchedUserId = await createUserWithEmail(
    "match",
    `friend_${STAMP}@example.com`,
  );

  // Info: (20260818 - Luphia) 受邀信箱與接受者的已驗證信箱是不同的收件匣
  await inviteAndAccept(`invited_${STAMP}@example.com`, mismatchedUserId);
  // Info: (20260818 - Luphia) 對照組：同一個收件匣
  await inviteAndAccept(`friend_${STAMP}@example.com`, matchedUserId);
});

afterAll(async () => {
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.teamInvitation.deleteMany({ where: { teamId } });
  await prisma.teamSubscription.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  const userIds = [ownerId, mismatchedUserId, matchedUserId];
  await prisma.userIdentity.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("信箱不符的標記（真資料庫）", () => {
  // Info: (20260818 - Luphia) 前提：資料庫真的記下了 MISMATCHED（這一段先前是對的）
  it("接受流程把比對結果寫進資料庫", async () => {
    const rows = await prisma.teamInvitation.findMany({
      where: { teamId },
      select: { acceptedByUserId: true, acceptedEmailMatch: true },
    });

    expect(rows).toHaveLength(2);
    expect(
      rows.find((row) => row.acceptedByUserId === mismatchedUserId)
        ?.acceptedEmailMatch,
    ).toBe(INVITE_EMAIL_MATCH.MISMATCHED);
    expect(
      rows.find((row) => row.acceptedByUserId === matchedUserId)
        ?.acceptedEmailMatch,
    ).toBe(INVITE_EMAIL_MATCH.MATCHED);
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：標記**真的出現**。
   *
   * 這正是先前壞掉的地方，而任何 mock 都測不出來——mock 裡的兩個時間戳是我寫的，
   * 而真實世界那兩個值來自兩個時鐘、相差 19ms。
   */
  it("以不同收件匣接受的成員會被標記", async () => {
    const flagged = await teamRepo.listMismatchedAcceptorIds(teamId);

    expect(flagged).toContain(mismatchedUserId);
  });

  // Info: (20260818 - Luphia) 另一半：相符的人不得被標記（否則「一律標記」也會過）
  it("以同一個收件匣接受的成員不會被標記", async () => {
    const flagged = await teamRepo.listMismatchedAcceptorIds(teamId);

    expect(flagged).not.toContain(matchedUserId);
    expect(flagged).not.toContain(ownerId);
  });

  /**
   * Info: (20260818 - Luphia) 標記不得比它描述的那段成員資格活得久。
   *
   * 移出再以**位址**直接加回（不建立任何邀請列）——這是原本用時間戳也蓋不住的
   * 情境。新的成員資格 `joinedByInvitationId` 為 NULL，因此標記自然消失。
   */
  it("被移出後以位址重新加入的人不再被標記", async () => {
    await prisma.teamMember.deleteMany({
      where: { teamId, userId: mismatchedUserId },
    });
    await prisma.teamMember.create({
      data: { teamId, userId: mismatchedUserId, role: TeamRole.VIEWER },
    });

    const flagged = await teamRepo.listMismatchedAcceptorIds(teamId);

    expect(flagged).not.toContain(mismatchedUserId);
  });
});
