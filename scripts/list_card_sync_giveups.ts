/**
 * Info: (20260821 - Luphia) 列出「訂閱卡同步已放棄」的團隊（review #6687 中-1）。
 *
 * 放棄（重試達上限）的代價是那個團隊的鏈上憑證停在舊內容，而在此之前
 * 「哪些團隊放棄了」**無法列舉**——`nftSyncError` 只躺在各自的列裡，
 * 診斷腳本又必須先知道是哪個 user。這支把它們一次撈出來。**只讀，不寫。**
 *
 * 修好原因（錢包升級、解黑名單、補角色）之後，把該列的 `nft_sync_attempts`
 * 歸零即可自動接續（worker 的佇列條件是 `nft_synced_at IS NULL AND attempts < 上限`）。
 *
 * 用法：
 *
 *     npx tsx scripts/list_card_sync_giveups.ts
 */
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS } from "@/constants/subscription_nft";

async function main(): Promise<void> {
  const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };

  const rows = await prisma.teamSubscription.findMany({
    where: {
      nftSyncedAt: null,
      nftSyncAttempts: { gte: SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS },
    },
    select: {
      teamId: true,
      planId: true,
      nftSyncAttempts: true,
      nftSyncError: true,
      updatedAt: true,
      team: { select: { name: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  if (rows.length === 0) {
    out("沒有已放棄的訂閱卡同步。");
    return;
  }

  out(
    `已放棄 ${rows.length} 筆（重試 ≥ ${SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS} 次）：\n`,
  );
  for (const row of rows) {
    out(
      `team ${row.teamId}（${row.team?.name ?? "?"}）plan=${row.planId} ` +
        `attempts=${row.nftSyncAttempts} lastTouched=${row.updatedAt.toISOString()}`,
    );
    out(`  error: ${row.nftSyncError ?? "(無紀錄)"}\n`);
  }
  out("修好原因後將該列的 nft_sync_attempts 歸零即可自動接續。");
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
