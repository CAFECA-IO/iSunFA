import type { Hex } from "viem";
import { logger } from "@/lib/utils/logger";
import {
  TEAM_LEDGER_ANCHOR_CHAINABLE_STATUSES,
  TEAM_WALLET_ENTRY_TYPE,
  TEAM_WALLET_STATUS,
} from "@/constants/subscription_quota";
import {
  chainRoot,
  computeMerkleRoot,
  hashLedgerLeaf,
} from "@/lib/quota/ledger_merkle";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import { teamLedgerAnchorRepo } from "@/repositories/team_ledger_anchor.repo";

/**
 * Info: (20260807 - Luphia) 團隊錢包守護行程（設計書 §3 / §9 P4、ADR 015）。
 * 1. 守恆勾稽：Σ(PURCHASE + ADJUST + CONSUME + REFUND) = 池餘額 + Σ 分配餘額，
 *    違反即凍結錢包並告警——絕不讓髒帳繼續流動（財務恆等式防護，同 A = L + E）。
 *
 *    `ALLOCATE` / `REVOKE` 不列入左側，因為它們只在池與分配之間搬動（淨額為零）。
 *    Info: (20260818 - Luphia) 分配改為鑄到成員自己的鏈上錢包之後（ADR 015 修訂），
 *    價值是**離開**帳本，因此 `allocate()` 會另寫一筆負的 `ADJUST` 讓左側同步減少。
 *    這個排除清單本身沒有變——變的是 `allocate()` 要自己把出帳記在左側。
 *    2026-08-18 之前的分配沒有那一筆，差額以 `scripts/repair_wallet_conservation.ts`
 *    一次性補平。
 * 2. merkle 封存（C 案 Phase 1）：勾稽通過後對「昨日」（UTC+8 日界）的全域 Ledger
 *    增量計算 merkle root 並鏈式累積，寫進 TeamLedgerAnchor。
 *
 * Info: (20261015 - Luphia) 區塊鏈退役：不再呼叫 LedgerAnchor.commitAnchor。
 * root 照算照存（狀態 SEALED、txHash 為 null）——它仍能讓「事後改寫歷史分錄」
 * 在重算時現形，只是證據不再有鏈上的第二份。舊的 ANCHORED 列保留，鏈式累積接得上。
 */

// Info: (20260807 - Luphia) 台北固定 UTC+8（無日光節約），日界以此換算
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

const CONSERVATION_ENTRY_TYPES: readonly string[] = [
  TEAM_WALLET_ENTRY_TYPE.PURCHASE,
  TEAM_WALLET_ENTRY_TYPE.ADJUST,
  TEAM_WALLET_ENTRY_TYPE.CONSUME,
  TEAM_WALLET_ENTRY_TYPE.REFUND,
];

export interface IConservationAuditResult {
  checked: number;
  violations: number;
  frozen: string[];
}

export interface IConservationAuditOptions {
  /**
   * Info: (20260818 - Luphia) 只勾稽這個團隊（預設全域）。
   *
   * 這支會**凍結**它掃到的每一個違反者，所以「範圍」不是效能考量而是安全考量：
   * 修復腳本的重驗與對真資料庫的 e2e 都必須限定在自己那一團，
   * 否則一次執行就會凍掉同一個資料庫裡的真實團隊。
   */
  teamId?: string;
}

export async function runWalletConservationAudit(
  options: IConservationAuditOptions = {},
): Promise<IConservationAuditResult> {
  const [wallets, allocationSums, ledgerSums] = await Promise.all([
    teamWalletRepo.listAllWallets(options.teamId),
    teamWalletRepo.sumAllocationsByTeam(),
    teamWalletRepo.sumLedgerByWalletAndType(),
  ]);

  const allocationByTeam = new Map(
    allocationSums.map((a) => [a.teamId, a.total]),
  );
  const ledgerByWallet = new Map<string, bigint>();
  ledgerSums.forEach((row) => {
    if (!CONSERVATION_ENTRY_TYPES.includes(row.entryType)) return;
    const current = ledgerByWallet.get(row.teamWalletId) ?? BigInt(0);
    ledgerByWallet.set(row.teamWalletId, current + row.total);
  });

  const frozen: string[] = [];
  let violations = 0;

  await wallets.reduce(async (previous, wallet) => {
    await previous;
    const ledgerTotal = ledgerByWallet.get(wallet.id) ?? BigInt(0);
    const actualTotal =
      wallet.unallocatedBalance +
      (allocationByTeam.get(wallet.teamId) ?? BigInt(0));

    if (ledgerTotal !== actualTotal) {
      violations += 1;
      logger.error("team wallet conservation violated", {
        teamWalletId: wallet.id,
        teamId: wallet.teamId,
        ledgerTotal: ledgerTotal.toString(),
        actualTotal: actualTotal.toString(),
        status: wallet.status,
      });
      if (wallet.status === TEAM_WALLET_STATUS.ACTIVE) {
        await teamWalletRepo.freezeWallet(wallet.id);
        frozen.push(wallet.id);
      }
    }
  }, Promise.resolve());

  if (violations === 0) {
    logger.info("team wallet conservation audit passed", {
      checked: wallets.length,
    });
  }

  return { checked: wallets.length, violations, frozen };
}

export interface IAnchorRunResult {
  skipped: boolean;
  anchored: boolean;
  anchorDate?: string;
  entryCount?: number;
}

export async function runLedgerAnchoring(
  nowMs: number = Date.now(),
): Promise<IAnchorRunResult> {
  // Info: (20260807 - Luphia) 錨定「昨日」：今日仍在寫入，只有已封閉的日視窗可得到穩定 root
  const todayKeyTaipei = Math.floor((nowMs + TAIPEI_OFFSET_MS) / DAY_MS);
  const dayKey = todayKeyTaipei - 1;
  const dayStartUtc = new Date(dayKey * DAY_MS - TAIPEI_OFFSET_MS);
  const dayEndUtc = new Date((dayKey + 1) * DAY_MS - TAIPEI_OFFSET_MS);

  const existing = await teamLedgerAnchorRepo.getByDate(dayStartUtc);
  if (
    existing &&
    TEAM_LEDGER_ANCHOR_CHAINABLE_STATUSES.includes(existing.status)
  ) {
    return { skipped: true, anchored: true };
  }

  const entries = await teamLedgerAnchorRepo.listLedgerForWindow(
    dayStartUtc,
    dayEndUtc,
  );
  const leaves = entries.map((entry) =>
    hashLedgerLeaf({
      id: entry.id,
      teamWalletId: entry.teamWalletId,
      entryType: entry.entryType,
      amount: entry.amount,
      poolBalanceAfter: entry.poolBalanceAfter,
      allocationBalanceAfter: entry.allocationBalanceAfter,
      idempotencyKey: entry.idempotencyKey,
      createdAtEpochSec: Math.floor(entry.createdAt.getTime() / 1000),
    }),
  );
  const dayRoot = computeMerkleRoot(leaves);

  const previous = await teamLedgerAnchorRepo.getLatestAnchored();
  const chainedRoot = chainRoot(
    (previous?.chainedRoot as Hex | undefined) ?? null,
    dayRoot,
  );

  const row = await teamLedgerAnchorRepo.upsertPending({
    anchorDate: dayStartUtc,
    entryCount: entries.length,
    dayMerkleRoot: dayRoot,
    chainedRoot,
  });

  // Info: (20261015 - Luphia) 區塊鏈退役：不送鏈上交易，roots 寫進 DB 即為封存完成
  await teamLedgerAnchorRepo.markSealed(row.id);
  logger.info("ledger anchor sealed in DB", {
    anchorDate: dayStartUtc.toISOString(),
    entryCount: entries.length,
    dayRoot,
    chainedRoot,
  });

  return {
    skipped: false,
    anchored: true,
    anchorDate: dayStartUtc.toISOString(),
    entryCount: entries.length,
  };
}

/**
 * Info: (20260807 - Luphia) Worker 進入點：勾稽通過才封存（壞帳不封存），
 * 有違規時凍結錢包並跳過本輪封存，由人工介入後的下一輪補上。
 */
export async function runWalletGuardian(): Promise<void> {
  const audit = await runWalletConservationAudit();
  if (audit.violations > 0) {
    logger.error("ledger anchoring skipped due to conservation violations", {
      violations: audit.violations,
      frozen: audit.frozen,
    });
    return;
  }
  await runLedgerAnchoring();
}
