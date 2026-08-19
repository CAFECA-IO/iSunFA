/**
 * Info: (20260819 - Luphia) 團隊 ADMIN 角色取消後的資料回填（產品決定 20260819）。
 *
 * ## 為什麼要降級而不是留著
 *
 * `TeamRole` 已移除 ADMIN，所有權限閘改走 `isTeamManagerRole`（只認 OWNER）。
 * 資料庫的 `role` 是字串欄位，因此殘留的 `"ADMIN"` 列**不會報錯**——它只是
 * 對不上任何一個已知角色：權限判斷一律 false（fail-closed，安全），但畫面上
 * 那個成員的角色標籤會是空的，而管理者看不出他到底是什麼。
 *
 * ## 降為 EDITOR，不是升為 OWNER
 *
 * OWNER 是**持卡人**：邀請成員會即時向訂閱那張卡補收席次費用。把 ADMIN 升為
 * OWNER 等於在沒有人同意的情況下多發一位可以動錢的人，而且收不回來
 * （「最後一位 OWNER」的保護會讓降級變得更麻煩）。降級的錯是「權限不夠」，
 * 由 OWNER 個別補回即可；升級的錯是「權限太多」，沒有對應的補救。
 *
 * 尚未接受的**邀請**若指定 ADMIN 角色，一併降為 EDITOR：那封邀請被接受時
 * 會照著寫進 `TeamMember`，等於從後門造出一個沒有角色的成員。
 *
 * 用法（預設預演，不寫入）：
 *
 *     npx tsx scripts/backfill_remove_team_admin.ts
 *     npx tsx scripts/backfill_remove_team_admin.ts --commit
 *     npx tsx scripts/backfill_remove_team_admin.ts --team <teamId> --commit
 */
import { prisma } from "@/lib/prisma";
import { TeamRole } from "@/constants/team";

// Info: (20260819 - Luphia) 已移除的角色字串。列在這裡而不是引用列舉——它已經不在列舉裡了
const REMOVED_ROLE = "ADMIN";

async function main(): Promise<void> {
  const argv = process.argv;
  const commit = argv.includes("--commit");
  const teamIndex = argv.indexOf("--team");
  const teamId = teamIndex >= 0 ? argv[teamIndex + 1] : undefined;
  const scope = teamId ? { teamId } : {};

  const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };

  out(
    commit
      ? "=== 實際寫入模式（--commit）"
      : "=== 預演（未加 --commit，不會寫入）",
  );

  const [members, invitations] = await Promise.all([
    prisma.teamMember.findMany({
      where: { ...scope, role: REMOVED_ROLE },
      select: { id: true, teamId: true, userId: true },
    }),
    prisma.teamInvitation.findMany({
      where: { ...scope, role: REMOVED_ROLE },
      select: { id: true, teamId: true, status: true },
    }),
  ]);

  out(
    `成員 ${members.length} 筆、邀請 ${invitations.length} 筆的角色是 ${REMOVED_ROLE}`,
  );

  for (const member of members) {
    out(`  team ${member.teamId}  user ${member.userId} → ${TeamRole.EDITOR}`);
  }
  for (const invitation of invitations) {
    out(
      `  team ${invitation.teamId}  invitation ${invitation.id}（${invitation.status}）→ ${TeamRole.EDITOR}`,
    );
  }

  if (members.length === 0 && invitations.length === 0) {
    out("沒有需要處理的資料。");
    return;
  }

  if (!commit) {
    out("\n加上 --commit 才會實際寫入。");
    return;
  }

  /**
   * Info: (20260819 - Luphia) 兩張表一起改，或都不改。
   *
   * 只改成員而漏掉邀請，那封邀請被接受時又會寫回一個 ADMIN 成員——
   * 回填做完卻沒做乾淨，而且症狀要等到有人點連結才出現。
   */
  const [memberResult, invitationResult] = await prisma.$transaction([
    prisma.teamMember.updateMany({
      where: { ...scope, role: REMOVED_ROLE },
      data: { role: TeamRole.EDITOR },
    }),
    prisma.teamInvitation.updateMany({
      where: { ...scope, role: REMOVED_ROLE },
      data: { role: TeamRole.EDITOR },
    }),
  ]);

  out(
    `\n已更新：成員 ${memberResult.count} 筆、邀請 ${invitationResult.count} 筆`,
  );
  out(
    "⚠️ 這些成員已失去管理權（邀請、成員管理、錢包與訂閱操作）。需要的話請由 OWNER 個別調整。",
  );
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
