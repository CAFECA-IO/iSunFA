import { prisma } from "@/lib/prisma";
import { TEAM_INVITATION_STATUS } from "@/constants/status";
import { buildPendingInviteKey } from "@/lib/team/pending_invite_key";

/**
 * Info: (20260816 - Luphia) 回填 `team_invitation.pending_key`。
 *
 * 為什麼需要：這個欄位是「同一團隊、同一對象同時只能有一封待接受邀請」的唯一鍵，
 * 取代原本的 `@@unique([teamId, invitee*, status])`。schema 一套用，
 * 舊的複合唯一鍵會被 `prisma db push` 移除，而新欄位在既有列上是 NULL——
 * 於是**既有的待接受邀請暫時失去併發防護**：兩位管理員同時邀請同一個位址時，
 * 應用層的「是否已有 PENDING」檢查兩邊都會通過，各建一列、各扣一次席次費用。
 *
 * 非 PENDING 的列刻意保持 NULL：那正是這次改動的重點——歷史列不該被唯一鍵約束，
 * 否則「離職後再邀請同一個人」會在接受的那一刻撞鍵、永遠加不進來。
 *
 * 執行方式：
 *   npx tsx scripts/backfill_pending_invite_key.ts          # 預演，只印出將要寫入什麼
 *   npx tsx scripts/backfill_pending_invite_key.ts --commit # 實際寫入
 *
 * 冪等：只處理 `pending_key` 為 NULL 的 PENDING 列，重跑不會改動已回填的資料。
 */

interface IBackfillRow {
  id: string;
  teamId: string;
  target: string;
  pendingKey: string;
}

async function collectRows(): Promise<{
  rows: IBackfillRow[];
  conflicts: Map<string, IBackfillRow[]>;
}> {
  const invitations = await prisma.teamInvitation.findMany({
    where: {
      status: TEAM_INVITATION_STATUS.PENDING,
      pendingKey: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: IBackfillRow[] = [];
  const byKey = new Map<string, IBackfillRow[]>();

  for (const invitation of invitations) {
    const pendingKey = buildPendingInviteKey({
      teamId: invitation.teamId,
      inviteeAddress: invitation.inviteeAddress,
      inviteeEmail: invitation.inviteeEmail,
    });

    /**
     * Info: (20260816 - Luphia) 位址與信箱都沒有的邀請無從識別對象，
     * 不該被唯一鍵約束，也不該被這支腳本猜一個鍵出來。
     */
    if (!pendingKey) continue;

    const row: IBackfillRow = {
      id: invitation.id,
      teamId: invitation.teamId,
      target: invitation.inviteeEmail ?? invitation.inviteeAddress ?? "",
      pendingKey,
    };
    rows.push(row);
    byKey.set(pendingKey, [...(byKey.get(pendingKey) ?? []), row]);
  }

  const conflicts = new Map(
    [...byKey.entries()].filter(([, group]) => group.length > 1),
  );
  return { rows, conflicts };
}

async function main() {
  const commit = process.argv.includes("--commit");
  const { rows, conflicts } = await collectRows();

  if (rows.length === 0) {
    console.log("沒有需要回填的邀請。");
    return;
  }

  /**
   * Info: (20260816 - Luphia) 重複的 PENDING 邀請必須先人工處理。
   * 舊的複合唯一鍵理論上擋掉了它們，但那個約束是 2026-08-15 才加上的，
   * 更早的資料可能留有殘骸——而寫入時撞唯一鍵會讓整支腳本半途而廢。
   */
  if (conflicts.size > 0) {
    console.error(
      `發現 ${conflicts.size} 組重複的待接受邀請，回填會撞唯一鍵。請先保留最新一列、其餘撤回：`,
    );
    for (const [key, group] of conflicts) {
      console.error(`  ${key}`);
      group.forEach((row, index) => {
        console.error(
          `    ${index === 0 ? "保留(最新)" : "應撤回"} id=${row.id}`,
        );
      });
    }
    process.exitCode = 1;
    return;
  }

  console.log(`${commit ? "寫入" : "預演"} ${rows.length} 筆：`);
  rows.forEach((row) => {
    console.log(`  ${row.teamId}  ${row.target}  -> ${row.pendingKey}`);
  });

  if (!commit) {
    console.log("\n加上 --commit 才會實際寫入。");
    return;
  }

  for (const row of rows) {
    await prisma.teamInvitation.update({
      where: { id: row.id },
      data: { pendingKey: row.pendingKey },
    });
  }
  console.log(`\n已回填 ${rows.length} 筆。`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
