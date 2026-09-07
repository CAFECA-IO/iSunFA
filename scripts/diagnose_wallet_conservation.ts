/**
 * Info: (20260818 - Luphia) 團隊錢包守恆勾稽的診斷工具（唯讀）。
 *
 * `wallet_audit.cron` 判定違反守恆時只留一行 log 就把錢包凍結，而那行 log 只有兩個
 * 總數（`ledgerTotal` / `actualTotal`）。要修得先知道**差額從哪來**，這支就是把
 * 恆等式兩側拆開，逐一列出每個分錄型別的小計與所有 `ALLOCATE` 分錄。
 *
 * 恆等式（見 `wallet_audit.cron`）：
 *
 *     Σ(PURCHASE + ADJUST + CONSUME + REFUND) = 池餘額 + Σ 分配餘額
 *
 * `ALLOCATE` / `REVOKE` 被排除，理由是「只在池與分配之間搬動、淨額為零」。
 * 這個理由在 2026-08-14 分配改為鑄到成員的鏈上錢包（ADR 015 修訂）之後**不再成立**。
 *
 * 完全唯讀：不寫任何資料、不解凍。用法：
 *
 *     npx tsx scripts/diagnose_wallet_conservation.ts            # 全部團隊
 *     npx tsx scripts/diagnose_wallet_conservation.ts --team <id> # 單一團隊
 */
import { prisma } from "@/lib/prisma";
import {
  TEAM_WALLET_ENTRY_TYPE,
  TEAM_WALLET_STATUS,
} from "@/constants/subscription_quota";

// Info: (20260818 - Luphia) 與 wallet_audit.cron 同一份清單（不一致就沒有診斷價值）
const CONSERVATION_ENTRY_TYPES: readonly string[] = [
  TEAM_WALLET_ENTRY_TYPE.PURCHASE,
  TEAM_WALLET_ENTRY_TYPE.ADJUST,
  TEAM_WALLET_ENTRY_TYPE.CONSUME,
  TEAM_WALLET_ENTRY_TYPE.REFUND,
];

function parseTeamId(argv: string[]): string | undefined {
  const index = argv.indexOf("--team");
  return index >= 0 ? argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const teamId = parseTeamId(process.argv);

  const wallets = await prisma.teamWallet.findMany({
    where: teamId ? { teamId } : undefined,
    orderBy: { createdAt: "asc" },
  });

  if (wallets.length === 0) {
    process.stdout.write("找不到任何團隊錢包\n");
    return;
  }

  for (const wallet of wallets) {
    const [byType, allocations, allocateEntries] = await Promise.all([
      prisma.teamWalletLedger.groupBy({
        by: ["entryType"],
        where: { teamWalletId: wallet.id },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.teamWalletAllocation.findMany({
        where: { teamId: wallet.teamId },
        select: { userId: true, balance: true },
      }),
      prisma.teamWalletLedger.findMany({
        where: {
          teamWalletId: wallet.id,
          entryType: TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
        },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          amount: true,
          targetUserId: true,
          txHash: true,
          idempotencyKey: true,
        },
      }),
    ]);

    const sumOf = (type: string): bigint =>
      byType.find((row) => row.entryType === type)?._sum.amount ?? BigInt(0);

    const ledgerTotal = CONSERVATION_ENTRY_TYPES.reduce(
      (total, type) => total + sumOf(type),
      BigInt(0),
    );
    const allocationTotal = allocations.reduce(
      (total, row) => total + row.balance,
      BigInt(0),
    );
    const actualTotal = wallet.unallocatedBalance + allocationTotal;
    const diff = ledgerTotal - actualTotal;

    process.stdout.write(
      `\n=== team ${wallet.teamId}  wallet ${wallet.id}  status ${wallet.status}\n`,
    );
    process.stdout.write("  恆等式左側（進勾稽的分錄）\n");
    for (const type of CONSERVATION_ENTRY_TYPES) {
      const row = byType.find((item) => item.entryType === type);
      process.stdout.write(
        `    ${type.padEnd(9)} ${String(sumOf(type)).padStart(12)}  (${row?._count ?? 0} 筆)\n`,
      );
    }
    process.stdout.write(
      `    ${"合計".padEnd(9)} ${String(ledgerTotal).padStart(12)}\n`,
    );

    process.stdout.write("  恆等式右側（實際餘額）\n");
    process.stdout.write(
      `    ${"池餘額".padEnd(9)} ${String(wallet.unallocatedBalance).padStart(12)}\n`,
    );
    process.stdout.write(
      `    ${"分配餘額".padEnd(7)} ${String(allocationTotal).padStart(12)}  (${allocations.length} 列)\n`,
    );
    process.stdout.write(
      `    ${"合計".padEnd(9)} ${String(actualTotal).padStart(12)}\n`,
    );

    process.stdout.write("  被排除的分錄型別（ALLOCATE / REVOKE）\n");
    for (const type of [
      TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
      TEAM_WALLET_ENTRY_TYPE.REVOKE,
    ]) {
      const row = byType.find((item) => item.entryType === type);
      process.stdout.write(
        `    ${type.padEnd(9)} ${String(sumOf(type)).padStart(12)}  (${row?._count ?? 0} 筆)\n`,
      );
    }

    if (diff === BigInt(0)) {
      process.stdout.write("  ✅ 守恆成立\n");
      if (wallet.status === TEAM_WALLET_STATUS.FROZEN) {
        process.stdout.write(
          "  ⚠️ 但錢包是 FROZEN：差額已被修掉，或凍結來自別的原因（人工凍結／其他守護行程）\n",
        );
      }
      continue;
    }

    process.stdout.write(`  ❌ 差額 ${diff}（左 − 右）\n`);

    /**
     * Info: (20260818 - Luphia) 判定差額是否來自「分配沒有登記在恆等式任何一側」。
     *
     * 分配改為鑄到成員的鏈上錢包之後：池減少了 amount、`ALLOCATE` 被勾稽排除、
     * 而**不再有 `TeamWalletAllocation` 列**去承接那筆餘額——右側因此少 amount，
     * 左側不動。每成功分配一次，差額就永久多一個 amount。
     *
     * 對照組：遷移腳本與成員移除的沖銷都會補一筆負的 `ADJUST`（價值離開離鏈帳本
     * 要記在左側），只有 `allocate()` 這條活路徑沒有。
     */
    const netAllocate =
      sumOf(TEAM_WALLET_ENTRY_TYPE.ALLOCATE) +
      sumOf(TEAM_WALLET_ENTRY_TYPE.REVOKE);
    if (diff === netAllocate && netAllocate > BigInt(0)) {
      process.stdout.write(
        "  → 差額等於 Σ ALLOCATE − Σ REVOKE：分配把價值送出離鏈帳本，卻沒有記在恆等式的任何一側\n",
      );
    } else {
      process.stdout.write(
        `  → 差額與 Σ ALLOCATE − Σ REVOKE（${netAllocate}）不同，可能混合了多個成因，逐筆看下面的 ALLOCATE\n`,
      );
    }

    if (allocateEntries.length > 0) {
      process.stdout.write("  ALLOCATE 分錄逐筆：\n");
      for (const entry of allocateEntries) {
        const when = entry.createdAt
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
        const minted = entry.txHash ? "已上鏈" : "無 txHash（未確認上鏈）";
        process.stdout.write(
          `    ${when}  ${String(entry.amount).padStart(8)}  → ${entry.targetUserId ?? "(none)"}  ${minted}  ${entry.idempotencyKey}\n`,
        );
      }
    }
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
    await prisma.$disconnect();
  });
