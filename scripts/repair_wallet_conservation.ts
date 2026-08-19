/**
 * Info: (20260818 - Luphia) 修復 2026-08-18 修法之前累積的守恆差額，並解凍錢包。
 *
 * ## 要修的是什麼
 *
 * 分配改為鑄到成員自己的鏈上錢包之後（ADR 015 修訂），`allocate()` 把池扣掉、寫一筆
 * 被勾稽排除的 `ALLOCATE` 分錄，而**不再有分配列去承接那筆餘額**——恆等式
 * `Σ(PURCHASE + ADJUST + CONSUME + REFUND) = 池餘額 + Σ 分配餘額` 的右側因此少了
 * 分配金額，左側不動。每成功分配一次差額就永久多一筆，下一輪勾稽就凍結錢包。
 *
 * 修法已經進到 `allocate()`（每筆 ALLOCATE 配一筆負的 ADJUST）。這支處理**舊帳**：
 * 帳本 append-only，所以補一筆而不是回頭改。
 *
 * ## 刻意只修「解釋得通」的差額
 *
 * 差額必須恰好等於「沒有配對負 ADJUST 的 ALLOCATE 淨額」才動手。對不上就**拒絕**並
 * 印出組成，交人工判斷——自動把不明差額抹平是這道防線最糟的失效方式：
 * 凍結的意義是「有人動了不該動的東西」，而一支會自己把帳弄平的腳本會讓那件事無聲。
 *
 * ## 順序
 *
 * 補分錄 → 重跑**該團隊**的勾稽（真的那一支，不是另寫一份判斷）→ 只有零違反才解凍。
 *
 * 用法：
 *
 *     npx tsx scripts/repair_wallet_conservation.ts                    # 預演，全部團隊
 *     npx tsx scripts/repair_wallet_conservation.ts --team <teamId>    # 預演，單一團隊
 *     npx tsx scripts/repair_wallet_conservation.ts --commit           # 實際補分錄並解凍
 */
import { prisma } from "@/lib/prisma";
import {
  ALLOCATE_OFFCHAIN_EXIT_PREFIX,
  CONSERVATION_REPAIR_FEATURE_CODE,
  CONSERVATION_REPAIR_PREFIX,
  TEAM_WALLET_ENTRY_TYPE,
  TEAM_WALLET_STATUS,
} from "@/constants/subscription_quota";
import {
  CONSERVATION_REPAIR_ACTION,
  resolveConservationRepair,
} from "@/lib/quota/conservation_repair";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import { runWalletConservationAudit } from "@/services/cron/wallet_audit.cron";

// Info: (20260818 - Luphia) 與 wallet_audit.cron 同一份清單
const CONSERVATION_ENTRY_TYPES: readonly string[] = [
  TEAM_WALLET_ENTRY_TYPE.PURCHASE,
  TEAM_WALLET_ENTRY_TYPE.ADJUST,
  TEAM_WALLET_ENTRY_TYPE.CONSUME,
  TEAM_WALLET_ENTRY_TYPE.REFUND,
];

// Info: (20260818 - Luphia) 修復分錄的操作者：非真人，標成系統以免與使用者操作混淆
const REPAIR_OPERATOR = "system";

interface IWalletDiagnosis {
  walletId: string;
  teamId: string;
  status: string;
  diff: bigint;
  unpairedAllocate: bigint;
  explained: boolean;
  alreadyRepaired: boolean;
}

async function diagnose(walletId: string): Promise<IWalletDiagnosis> {
  const wallet = await prisma.teamWallet.findUniqueOrThrow({
    where: { id: walletId },
  });
  const [byType, allocations, entries] = await Promise.all([
    prisma.teamWalletLedger.groupBy({
      by: ["entryType"],
      where: { teamWalletId: walletId },
      _sum: { amount: true },
    }),
    prisma.teamWalletAllocation.aggregate({
      where: { teamId: wallet.teamId },
      _sum: { balance: true },
    }),
    prisma.teamWalletLedger.findMany({
      where: { teamWalletId: walletId },
      select: { entryType: true, amount: true, idempotencyKey: true },
    }),
  ]);

  const sumOf = (type: string): bigint =>
    byType.find((row) => row.entryType === type)?._sum.amount ?? BigInt(0);

  const ledgerTotal = CONSERVATION_ENTRY_TYPES.reduce(
    (total, type) => total + sumOf(type),
    BigInt(0),
  );
  const actualTotal =
    wallet.unallocatedBalance + (allocations._sum.balance ?? BigInt(0));

  /**
   * Info: (20260818 - Luphia) 「沒有配對負 ADJUST 的 ALLOCATE」＝修法之前的那些。
   *
   * 配對的判準是冪等鍵：新寫的那一筆是 `allocate-offchain-exit:{原鍵}`。
   * 用鍵而不是用金額比對，才不會把兩筆金額相同的分配算成同一筆。
   */
  const paired = new Set(
    entries
      .filter((entry) =>
        entry.idempotencyKey.startsWith(ALLOCATE_OFFCHAIN_EXIT_PREFIX),
      )
      .map((entry) =>
        entry.idempotencyKey.slice(ALLOCATE_OFFCHAIN_EXIT_PREFIX.length),
      ),
  );
  const unpairedAllocate = entries
    .filter(
      (entry) =>
        entry.entryType === TEAM_WALLET_ENTRY_TYPE.ALLOCATE &&
        !paired.has(entry.idempotencyKey),
    )
    .reduce((total, entry) => total + entry.amount, BigInt(0));

  /**
   * Info: (20260818 - Luphia) REVOKE 是舊制的「分配收回池」（已停用）：
   * 它在恆等式裡同樣是淨額為零的內部搬動，因此不影響差額，不列入這裡的解釋。
   */
  const diff = ledgerTotal - actualTotal;

  return {
    walletId,
    teamId: wallet.teamId,
    status: wallet.status,
    diff,
    unpairedAllocate,
    explained: diff === unpairedAllocate,
    alreadyRepaired: entries.some((entry) =>
      entry.idempotencyKey.startsWith(CONSERVATION_REPAIR_PREFIX),
    ),
  };
}

async function main(): Promise<void> {
  const argv = process.argv;
  const commit = argv.includes("--commit");
  const teamIndex = argv.indexOf("--team");
  const teamId = teamIndex >= 0 ? argv[teamIndex + 1] : undefined;

  const wallets = await teamWalletRepo.listAllWallets(teamId);
  const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };

  out(
    commit
      ? "=== 實際寫入模式（--commit）"
      : "=== 預演（未加 --commit，不會寫入）",
  );

  let repaired = 0;
  let unfrozen = 0;
  let refused = 0;

  for (const wallet of wallets) {
    const state = await diagnose(wallet.id);
    const decision = resolveConservationRepair({
      diff: state.diff,
      unpairedAllocate: state.unpairedAllocate,
      alreadyRepaired: state.alreadyRepaired,
      frozen: state.status === TEAM_WALLET_STATUS.FROZEN,
    });

    if (decision.action === CONSERVATION_REPAIR_ACTION.NONE) continue;

    if (decision.action === CONSERVATION_REPAIR_ACTION.REFUSE) {
      refused += 1;
      out(
        `team ${state.teamId}：⛔ ${decision.reason} —— 拒絕自動補平，請人工追查`,
      );
      continue;
    }

    if (decision.action === CONSERVATION_REPAIR_ACTION.UNFREEZE_ONLY) {
      out(
        `team ${state.teamId}：${decision.reason}${commit ? " → 解凍" : "（--commit 會解凍）"}`,
      );
      if (commit) {
        await teamWalletRepo.reactivateWallet(wallet.id);
        unfrozen += 1;
      }
      continue;
    }

    out(
      `team ${state.teamId}：差額 ${state.diff}（${decision.reason}）${commit ? ` → 補一筆 ADJUST ${decision.adjustAmount}` : "（--commit 會補一筆負 ADJUST）"}`,
    );
    if (!commit) continue;

    await prisma.teamWalletLedger.create({
      data: {
        teamWalletId: wallet.id,
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        amount: decision.adjustAmount,
        poolBalanceAfter: wallet.unallocatedBalance,
        operatorUserId: REPAIR_OPERATOR,
        idempotencyKey: `${CONSERVATION_REPAIR_PREFIX}${wallet.id}`,
        featureCode: CONSERVATION_REPAIR_FEATURE_CODE,
      },
    });
    repaired += 1;

    /**
     * Info: (20260818 - Luphia) 用**真的那支勾稽**重驗，不自己再算一次。
     *
     * 另寫一份判斷等於讓「解凍的條件」與「凍結的條件」是兩支實作，
     * 而它們分岔的那天，這支會很有說服力地解凍一個其實不該解凍的錢包。
     * 範圍限定在這一團：勾稽會凍結它掃到的每一個違反者。
     */
    const verdict = await runWalletConservationAudit({ teamId: wallet.teamId });
    if (verdict.violations > 0) {
      out(`team ${state.teamId}：⛔ 補完仍判違反，維持凍結`);
      continue;
    }
    if (state.status === TEAM_WALLET_STATUS.FROZEN) {
      await teamWalletRepo.reactivateWallet(wallet.id);
      unfrozen += 1;
      out(`team ${state.teamId}：✅ 勾稽通過 → 已解凍`);
    }
  }

  out(
    `\n掃描 ${wallets.length} 個錢包：補分錄 ${repaired}、解凍 ${unfrozen}、拒絕處理 ${refused}`,
  );
  if (refused > 0) process.exitCode = 1;
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
