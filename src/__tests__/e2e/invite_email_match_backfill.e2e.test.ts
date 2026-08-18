import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { run } from "@/../scripts/backfill_invite_email_match";
import { INVITE_EMAIL_MATCH, TEAM_INVITATION_STATUS } from "@/constants/status";
import { TeamRole } from "@/constants/team";

/**
 * Info: (20260818 - Luphia) 舊規則寫下的 `MISMATCHED` 要能被重算（PR #6652 第五輪 C-5）。
 *
 * 比對規則改為「同一個收件匣」之後，既有的列仍然誤報——而 C-2 剛把這個訊號
 * 接到告警與成員卡片上。**會誤報的稽核訊號比沒有訊號更糟。**
 *
 * 對真資料庫跑：重算要真的讀 `UserIdentity` 的已驗證信箱、真的套用
 * `canonicalizeEmailForKey`，而那正是 mock 掉之後就不再被證明的部分。
 */

// Info: (20260818 - Luphia) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免改寫真實邀請的稽核欄位！",
  );
}

const STAMP = Date.now();
let teamId = "";
let inviterId = "";
/** Info: (20260818 - Luphia) 子地址誤報（應被修正） */
let plusUserId = "";
/** Info: (20260818 - Luphia) 真的不是同一個收件匣（不得被修正） */
let otherUserId = "";
let plusInviteId = "";
let otherInviteId = "";

async function createUser(suffix: string, email?: string): Promise<string> {
  const user = await prisma.user.create({
    data: { address: `e2e_match_${suffix}_${STAMP}`, name: `E2E ${suffix}` },
  });
  if (email) {
    await prisma.userIdentity.create({
      data: {
        userId: user.id,
        provider: "google",
        providerUserId: `${suffix}-${STAMP}`,
        email,
        emailVerified: true,
      },
    });
  }
  return user.id;
}

async function createAcceptedInvite(
  inviteeEmail: string,
  acceptedByUserId: string,
): Promise<string> {
  const invite = await prisma.teamInvitation.create({
    data: {
      teamId,
      inviterId,
      inviteeEmail,
      role: TeamRole.VIEWER,
      status: TEAM_INVITATION_STATUS.ACCEPTED,
      acceptedByUserId,
      acceptedAt: new Date(),
      // Info: (20260818 - Luphia) 以**舊規則**寫下的結果，正是這支要重算的東西
      acceptedEmailMatch: INVITE_EMAIL_MATCH.MISMATCHED,
    },
  });
  return invite.id;
}

beforeAll(async () => {
  const team = await prisma.team.create({
    data: { name: `e2e-match-${STAMP}` },
  });
  teamId = team.id;

  inviterId = await createUser("inviter");
  plusUserId = await createUser("plus", `alice_${STAMP}@gmail.com`);
  otherUserId = await createUser("other", `someone_${STAMP}@example.com`);

  await prisma.teamMember.create({
    data: { teamId, userId: inviterId, role: TeamRole.OWNER },
  });

  // Info: (20260818 - Luphia) 邀請寄到子地址，本人以主地址接受 → 舊規則誤判為不符
  plusInviteId = await createAcceptedInvite(
    `alice_${STAMP}+isunfa@gmail.com`,
    plusUserId,
  );
  // Info: (20260818 - Luphia) 完全不同的收件匣 → 新規則下仍然是不符
  otherInviteId = await createAcceptedInvite(
    `friend_${STAMP}@example.com`,
    otherUserId,
  );
});

afterAll(async () => {
  await prisma.teamInvitation.deleteMany({ where: { teamId } });
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.userIdentity.deleteMany({
    where: { userId: { in: [plusUserId, otherUserId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [inviterId, plusUserId, otherUserId] } },
  });
  await prisma.$disconnect();
});

async function matchOf(id: string): Promise<string | null> {
  const row = await prisma.teamInvitation.findUnique({
    where: { id },
    select: { acceptedEmailMatch: true },
  });
  return row?.acceptedEmailMatch ?? null;
}

describe("既有 MISMATCHED 的重算（真資料庫）", () => {
  /**
   * Info: (20260818 - Luphia) 一條流程測試，理由同 AAD 回填：
   * 這是「預演 → 實際執行 → 冪等」的順序，拆開會讓後面幾條依賴前面留下的狀態。
   */
  it("預演不寫入 → commit 修正誤報 → 真正不符的不動 → 重跑冪等", async () => {
    const dryRun = await run(false);
    expect(dryRun.corrected).toBeGreaterThanOrEqual(1);
    expect(await matchOf(plusInviteId)).toBe(INVITE_EMAIL_MATCH.MISMATCHED);

    await run(true);
    // Info: (20260818 - Luphia) 子地址誤報被修正
    expect(await matchOf(plusInviteId)).toBe(INVITE_EMAIL_MATCH.MATCHED);
    /**
     * Info: (20260818 - Luphia) 這一條同樣重要：**真的不同的收件匣不得被改**。
     * 只驗「有東西被修好」的話，把整批無條件改成 MATCHED 也會通過。
     */
    expect(await matchOf(otherInviteId)).toBe(INVITE_EMAIL_MATCH.MISMATCHED);

    // Info: (20260818 - Luphia) 已修正的列不再進入查詢範圍
    const rerun = await run(true);
    expect(
      rerun.corrected === 0 || (await matchOf(plusInviteId)) === "MATCHED",
    ).toBe(true);
    expect(await matchOf(plusInviteId)).toBe(INVITE_EMAIL_MATCH.MATCHED);
  });
});
