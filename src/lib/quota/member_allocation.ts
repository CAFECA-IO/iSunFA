import {
  ALLOCATE_FAILED_PREFIX,
  ALLOCATE_OFFCHAIN_EXIT_PREFIX,
  MEMBER_ALLOCATION_KIND,
  MIGRATE_ALLOCATION_PREFIX,
  MemberAllocationKind,
  TEAM_WALLET_ENTRY_TYPE,
} from "@/constants/subscription_quota";

/**
 * Info: (20261015 - Luphia) 團隊分配「實際給到成員個人點數」的判定（純函式）。
 *
 * 團隊錢包的 ALLOCATE 分錄橫跨三個時代，意義不同：
 *
 * 1. **2026-08-14 之前（離鏈分配）**：點數進的是 `TeamWalletAllocation.balance`，
 *    之後被消費、或在遷移時以 `migrate-allocation:` 的 ADJUST 撥給成員。
 *    這種 ALLOCATE **不能**再算一次給成員——剩下的部分已由遷移分錄計入，
 *    用掉的部分本來就不是成員的。它的特徵是：沒有 txHash、也沒有配對的 offchain-exit。
 * 2. **08-14 起（鑄到成員錢包）**：成功時回填 txHash；08-18 起每筆另配一筆
 *    `allocate-offchain-exit:` 的負 ADJUST。
 * 3. **區塊鏈退役後（DB 帳本）**：沒有 txHash，但仍配 offchain-exit。
 *
 * 因此「給到成員」＝（有 txHash 或有 offchain-exit 配對）且沒有 `allocate-failed:` 補償；
 * 再加上遷移分錄的絕對值。點數復原指令與團隊頁的成員分配數都走這一支，兩邊不會各說各話。
 */

export interface IAllocationLedgerRow {
  id: string;
  entryType: string;
  amount: bigint;
  targetUserId: string | null;
  txHash: string | null;
  idempotencyKey: string;
}

export interface IMemberAllocationCredit {
  ledgerId: string;
  userId: string;
  amount: bigint;
  kind: MemberAllocationKind;
}

export interface IMemberAllocationResolution {
  credits: IMemberAllocationCredit[];
  // Info: (20261015 - Luphia) 規則判定不給、或資料不完整的分錄，供人工檢視
  skipped: { ledgerId: string; reason: string }[];
}

export function resolveMemberAllocationCredits(
  rows: readonly IAllocationLedgerRow[],
): IMemberAllocationResolution {
  const keys = new Set(rows.map((row) => row.idempotencyKey));
  const credits: IMemberAllocationCredit[] = [];
  const skipped: { ledgerId: string; reason: string }[] = [];

  for (const row of rows) {
    if (row.entryType === TEAM_WALLET_ENTRY_TYPE.ALLOCATE) {
      if (keys.has(`${ALLOCATE_FAILED_PREFIX}${row.idempotencyKey}`)) continue;
      const exited =
        Boolean(row.txHash) ||
        keys.has(`${ALLOCATE_OFFCHAIN_EXIT_PREFIX}${row.idempotencyKey}`);
      // Info: (20261015 - Luphia) 遷移前的離鏈分配：剩餘部分已由 migrate-allocation 計入
      if (!exited) continue;
      if (!row.targetUserId || row.amount <= BigInt(0)) {
        skipped.push({
          ledgerId: row.id,
          reason: "ALLOCATE has no target user or non-positive amount",
        });
        continue;
      }
      credits.push({
        ledgerId: row.id,
        userId: row.targetUserId,
        amount: row.amount,
        kind: MEMBER_ALLOCATION_KIND.ALLOCATE,
      });
      continue;
    }

    if (
      row.entryType === TEAM_WALLET_ENTRY_TYPE.ADJUST &&
      row.idempotencyKey.startsWith(MIGRATE_ALLOCATION_PREFIX)
    ) {
      const amount = row.amount < BigInt(0) ? -row.amount : row.amount;
      if (!row.targetUserId || amount === BigInt(0)) {
        skipped.push({
          ledgerId: row.id,
          reason: "migrate-allocation has no target user or zero amount",
        });
        continue;
      }
      credits.push({
        ledgerId: row.id,
        userId: row.targetUserId,
        amount,
        kind: MEMBER_ALLOCATION_KIND.MIGRATION,
      });
    }
  }

  return { credits, skipped };
}

// Info: (20261015 - Luphia) 依成員加總「這個團隊給過他的點數」
export function sumMemberAllocations(
  credits: readonly IMemberAllocationCredit[],
): Map<string, bigint> {
  const totals = new Map<string, bigint>();
  for (const credit of credits) {
    totals.set(
      credit.userId,
      (totals.get(credit.userId) ?? BigInt(0)) + credit.amount,
    );
  }
  return totals;
}
