import { prisma } from "@/lib/prisma";
import { INVITE_EMAIL_MATCH } from "@/constants/status";
import { resolveInviteEmailMatch } from "@/lib/team/invite_email_match";

/**
 * Info: (20260818 - Luphia) 以新的比對規則重算既有的 `acceptedEmailMatch`（第五輪 C-5）。
 *
 * 為什麼需要：比對規則於 2026-08-18 改為「同一個收件匣」（去子地址、Gmail 系列
 * 去點號，見 `canonicalizeEmailForKey`）。在那之前，把邀請寄到
 * `alice+isunfa@gmail.com`、本人以已驗證的 `alice@gmail.com` 接受，會被記成
 * `MISMATCHED`——而 C-2 剛把這個訊號接上告警與成員卡片。
 *
 * **會誤報的稽核訊號比沒有訊號更糟**：看過幾次之後沒有人會再認真看它。
 * 那次改動修好了「以後不會再誤記」，但既有的列仍然誤報，而 AAD 那次有回填、
 * 這次沒有——同一個 PR 裡兩種待遇。這支補上後者。
 *
 * 執行方式：
 *   npx tsx scripts/backfill_invite_email_match.ts                 # 預演，只統計不寫入
 *   npx tsx scripts/backfill_invite_email_match.ts --commit        # 實際更新
 *   npx tsx scripts/backfill_invite_email_match.ts --team <teamId> # 只處理某一個團隊
 *
 * `--team` 供逐團隊處理（例如先在一個團隊上確認結果），也讓測試不必改寫整個
 * 資料庫——e2e 只跑自己建的那一團（第六輪第 5 條）。
 *
 * **只往「誤報 → 相符」一個方向改**（`MISMATCHED` → `MATCHED`）：
 *
 * 重算用的是**現在**的第三方綁定，而使用者可能在加入之後才綁定或解除某個信箱。
 * 因此把當時記為 `MATCHED` 的列改成 `MISMATCHED` 會憑今天的狀態否定一筆
 * 當時可能正確的稽核紀錄——那是在製造假訊號，而不是消除假訊號。
 * 反方向（誤報變相符）沒有這個問題：新規則說它們是同一個收件匣，
 * 而「同一個收件匣」不會因為之後綁了別的信箱而改變。
 *
 * 冪等：已是 `MATCHED` 的列不在查詢範圍內，重跑不會再動它們。
 */

export interface IMatchBackfillSummary {
  // Info: (20260818 - Luphia) 掃到的 MISMATCHED 列數（有受邀信箱與接受者的才算）
  examined: number;
  // Info: (20260818 - Luphia) 以新規則重算後應改為 MATCHED 的列數
  corrected: number;
  // Info: (20260818 - Luphia) 重算後仍為 MISMATCHED：真的不是同一個收件匣
  unchanged: number;
}

export async function run(
  commit: boolean,
  options: { teamId?: string } = {},
): Promise<IMatchBackfillSummary> {
  const rows = await prisma.teamInvitation.findMany({
    where: {
      // Info: (20260818 - Luphia) 未指定即全庫；指定時只處理那一個團隊
      ...(options.teamId ? { teamId: options.teamId } : {}),
      acceptedEmailMatch: INVITE_EMAIL_MATCH.MISMATCHED,
      acceptedByUserId: { not: null },
      inviteeEmail: { not: null },
    },
    select: { id: true, inviteeEmail: true, acceptedByUserId: true },
    orderBy: { id: "asc" },
  });

  const summary: IMatchBackfillSummary = {
    examined: rows.length,
    corrected: 0,
    unchanged: 0,
  };

  for (const row of rows) {
    /**
     * Info: (20260818 - Luphia) 只採信**已驗證**的信箱，與接受邀請時的規則一致。
     * 未驗證的 email 是使用者宣稱的字串，拿它比出來的「相符」會被當成稽核證據。
     */
    const identities = await prisma.userIdentity.findMany({
      where: { userId: row.acceptedByUserId as string, emailVerified: true },
      select: { email: true },
    });

    const recomputed = resolveInviteEmailMatch(
      row.inviteeEmail,
      identities.map((identity) => identity.email),
    );

    if (recomputed !== INVITE_EMAIL_MATCH.MATCHED) {
      summary.unchanged += 1;
      continue;
    }

    summary.corrected += 1;
    if (!commit) continue;

    await prisma.teamInvitation.update({
      where: { id: row.id },
      data: { acceptedEmailMatch: INVITE_EMAIL_MATCH.MATCHED },
    });
  }

  return summary;
}

async function main(): Promise<void> {
  const commit = process.argv.includes("--commit");
  const teamFlag = process.argv.indexOf("--team");
  const teamId = teamFlag === -1 ? undefined : process.argv[teamFlag + 1];
  if (teamFlag !== -1 && !teamId) {
    console.error("[backfill_invite_email_match] --team 後面要接 teamId");
    process.exitCode = 1;
    return;
  }

  const summary = await run(commit, { teamId });

  console.log(
    `[backfill_invite_email_match] ${commit ? "COMMIT" : "DRY-RUN"} ` +
      `${teamId ? `team=${teamId} ` : ""}` +
      `examined=${summary.examined} corrected=${summary.corrected} ` +
      `unchanged=${summary.unchanged}`,
  );

  if (!commit && summary.corrected > 0) {
    console.log(
      "[backfill_invite_email_match] 以 --commit 重跑才會實際更新；" +
        "在那之前成員清單上會有 corrected 筆誤報的標記。",
    );
  }
}

/**
 * Info: (20260818 - Luphia) 只有直接執行時才跑 main（同 backfill_faith_memory_aad）：
 * 這個檔案會被測試匯入，而匯入時自動連線、自動 `$disconnect` 會把測試的連線關掉。
 */
if (process.argv[1]?.includes("backfill_invite_email_match")) {
  main()
    .catch((error: unknown) => {
      console.error("[backfill_invite_email_match] failed:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
