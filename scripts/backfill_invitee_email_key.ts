import { teamRepo } from "@/repositories/team.repo";
import { disconnectPrisma } from "@/repositories/prisma_lifecycle.repo";
import { canonicalizeEmailForKey } from "@/lib/team/email_identity";
import { TEAM_INVITATION_STATUS } from "@/constants/status";

/**
 * Info: (20260825 - Julian) 回填 `team_invitation.invitee_email_key`。
 *
 * 這一欄是 `inviteeEmail` 的正規化形式，讓小鈴鐺能以「已驗證的信箱」反查
 * 待接受的邀請。沒有它，email 邀請的受邀者在鈴鐺上看不到任何東西 ——
 * 位址邀請看得到，因為那條路徑查的是 `inviteeAddress`。
 *
 * ## 回填沒做完會怎樣
 *
 * **不會壞，只會晚一點生效。** 新欄位是 NULL，查詢就是查不到，行為與回填前
 * 完全一樣。所以 `prisma db push` 與這支腳本的先後順序不影響正確性 ——
 * 這在本專案是罕見的（多數回填做錯順序會安靜停擺）。
 *
 * ## 為什麼要對 `pendingKey` 做自我驗證
 *
 * canonical 值在資料庫裡其實已經存在了：PENDING 的 email 邀請，
 * `pendingKey` 就是 `{teamId}:mail:{canonical}`。所以這支腳本重算出來的值
 * **必須**等於那個後綴。不等於只有一種可能：正規化的規則在某個時間點分岔了，
 * 而那意味著唯一鍵與通知會對「這兩個信箱是不是同一個人」給出不同答案。
 *
 * 那種時候要停下來，不是靜靜寫入一個不一致的值。
 *
 * 非 PENDING 的列沒有 `pendingKey` 可比對（那是刻意的設計），只能直接寫入。
 *
 * 用法（預設預演，不寫入）：
 *
 *     npx tsx scripts/backfill_invitee_email_key.ts
 *     npx tsx scripts/backfill_invitee_email_key.ts --commit
 *
 * 冪等：只處理 `invitee_email_key` 為 NULL 且 `invitee_email` 有值的列。
 */

const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

interface IRow {
  id: string;
  status: string;
  emailKey: string;
}

async function main(): Promise<void> {
  const commit = process.argv.includes("--commit");
  out(
    commit
      ? "=== 實際寫入模式（--commit）"
      : "=== 預演（未加 --commit，不會寫入）",
  );

  const invitations = await teamRepo.listInvitationsMissingEmailKey();

  out(`待回填 ${invitations.length} 列`);

  const rows: IRow[] = [];
  const mismatches: string[] = [];

  for (const invitation of invitations) {
    const email = invitation.inviteeEmail?.trim();
    if (!email) continue;
    const emailKey = canonicalizeEmailForKey(email);

    /**
     * Info: (20260825 - Julian) PENDING 的列拿 `pendingKey` 的後綴對照。
     *
     * 只對 PENDING 做得到 —— 非 PENDING 的 `pendingKey` 是 NULL，
     * 那是「歷史列不該被唯一鍵約束」的刻意設計，不是資料缺漏。
     */
    if (
      invitation.status === TEAM_INVITATION_STATUS.PENDING &&
      invitation.pendingKey
    ) {
      const suffix = `:mail:${emailKey}`;
      if (!invitation.pendingKey.endsWith(suffix)) {
        mismatches.push(
          `${invitation.id}: 重算得到 "${emailKey}"，但 pendingKey 是 "${invitation.pendingKey}"`,
        );
        continue;
      }
    }

    rows.push({ id: invitation.id, status: invitation.status, emailKey });
  }

  /**
   * Info: (20260825 - Julian) 有任何一列對不上就整批不寫。
   *
   * 不是「跳過那一列、其餘照寫」：對不上代表 `canonicalizeEmailForKey`
   * 的行為與寫入 `pendingKey` 當時不同，那麼**其他列算出來的值也不可信** ——
   * 它們只是剛好沒有觸發到差異的那部分規則（子地址、Gmail 點號）。
   */
  if (mismatches.length > 0) {
    process.stderr.write(
      `\n🛑 ${mismatches.length} 列與 pendingKey 的正規化結果不一致，整批中止：\n`,
    );
    mismatches.forEach((line) => process.stderr.write(`  ${line}\n`));
    process.stderr.write(
      "\n這代表正規化規則在某個時間點分岔了。先確認 canonicalizeEmailForKey，不要繞過這道檢查。\n",
    );
    process.exitCode = 1;
    return;
  }

  const byStatus = new Map<string, number>();
  rows.forEach((row) => {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  });
  [...byStatus.entries()].forEach(([status, count]) => {
    out(`  ${status.padEnd(10)} ${count}`);
  });

  if (!commit) {
    out(`\n將寫入 ${rows.length} 列。加上 --commit 才會實際執行。`);
    return;
  }

  let written = 0;
  const failures: string[] = [];
  for (const row of rows) {
    try {
      await teamRepo.setInvitationEmailKey(row.id, row.emailKey);
      written += 1;
    } catch (error) {
      failures.push(
        `${row.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  out(`已寫入 ${written} 列`);

  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} 列寫入失敗：\n`);
    failures.forEach((line) => process.stderr.write(`  ${line}\n`));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
