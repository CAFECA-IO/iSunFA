import { prisma } from "@/lib/prisma";
import { TEAM_WALLET_ENTRY_TYPE } from "@/constants/subscription_quota";
import { issuePurchasedPointsToMember } from "@/services/member.service";

/**
 * Info: (20260814 - Luphia) 把既有的離鏈分配餘額一次鑄到成員自己的區塊鏈錢包
 * （ADR 015 修訂、產品拍板 20260814：分配即個人點數）。
 *
 * 為什麼需要這支：分配的**新行為**是直接鑄到成員錢包，但改版前已經分配出去的餘額
 * 還躺在 `TeamWalletAllocation` 裡。不遷移的話會有兩套餘額並存很久——
 * 舊餘額只能在團隊情境花、新分配到處都能花，而用戶看到的是同一個「我的點數」。
 *
 * 執行方式（需連得到主資料庫與鏈上 RPC）：
 *   npx tsx scripts/migrate_allocations_onchain.ts          # 預演，只印出將要做什麼
 *   npx tsx scripts/migrate_allocations_onchain.ts --commit # 實際鑄造並歸零
 *
 * 冪等：每筆以 `migrate-allocation:{teamId}:{userId}` 為分錄鍵，重跑不會重複鑄造。
 * 失敗處理：單筆鑄造失敗即跳過該筆（餘額保持原狀、不歸零），最後印出清單；
 * 修好 RPC 後重跑即可——**絕不在鑄造未確認的情況下歸零**，那會讓點數平白消失。
 */

interface IMigrationResult {
  migrated: number;
  skipped: number;
  failed: { teamId: string; userId: string; reason: string }[];
}

async function migrateAllocations(commit: boolean): Promise<IMigrationResult> {
  const result: IMigrationResult = { migrated: 0, skipped: 0, failed: [] };

  const allocations = await prisma.teamWalletAllocation.findMany({
    where: { balance: { gt: BigInt(0) } },
  });

  for (const allocation of allocations) {
    const key = `migrate-allocation:${allocation.teamId}:${allocation.userId}`;
    const done = await prisma.teamWalletLedger.findUnique({
      where: { idempotencyKey: key },
    });
    if (done) {
      result.skipped += 1;
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { id: allocation.userId },
      select: { address: true },
    });
    if (!user?.address) {
      result.failed.push({
        teamId: allocation.teamId,
        userId: allocation.userId,
        reason: "no wallet address",
      });
      continue;
    }

    const wallet = await prisma.teamWallet.findUnique({
      where: { teamId: allocation.teamId },
    });
    if (!wallet) {
      result.failed.push({
        teamId: allocation.teamId,
        userId: allocation.userId,
        reason: "no team wallet",
      });
      continue;
    }

    if (!commit) {
      console.info(
        `[dry-run] would mint ${allocation.balance} to ${user.address} (team ${allocation.teamId})`,
      );
      result.migrated += 1;
      continue;
    }

    const minted = await issuePurchasedPointsToMember(
      user.address,
      Number(allocation.balance),
    );
    if (!minted.success) {
      result.failed.push({
        teamId: allocation.teamId,
        userId: allocation.userId,
        reason: minted.message ?? "mint failed",
      });
      continue;
    }

    /**
     * Info: (20260814 - Luphia) 鑄造成功後才歸零，並寫一筆 ADJUST 分錄留下軌跡。
     * 順序不能反：先歸零再鑄造，一旦鑄造失敗，那筆點數就是憑空消失。
     */
    await prisma.$transaction(async (tx) => {
      await tx.teamWalletAllocation.update({
        where: { id: allocation.id },
        data: { balance: BigInt(0) },
      });
      await tx.teamWalletLedger.create({
        data: {
          teamWalletId: wallet.id,
          entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
          // Info: (20260814 - Luphia) 分配視角出帳（點數離開離鏈帳本、進入鏈上）
          amount: -allocation.balance,
          allocationBalanceAfter: BigInt(0),
          targetUserId: allocation.userId,
          operatorUserId: allocation.userId,
          idempotencyKey: key,
          txHash: (minted.data as { tx?: string })?.tx ?? null,
        },
      });
    });
    result.migrated += 1;
  }

  return result;
}

async function main() {
  const commit = process.argv.includes("--commit");
  const result = await migrateAllocations(commit);

  console.info(
    `[migrate-allocations] ${commit ? "committed" : "dry-run"}: ` +
      `migrated=${result.migrated} skipped=${result.skipped} failed=${result.failed.length}`,
  );
  for (const failure of result.failed) {
    console.error(
      `[migrate-allocations] FAILED team=${failure.teamId} user=${failure.userId}: ${failure.reason}`,
    );
  }
  // Info: (20260814 - Luphia) 有失敗就以非零碼結束，讓部署腳本不會誤判成功
  process.exit(result.failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("[migrate-allocations] aborted:", error);
  process.exit(1);
});
