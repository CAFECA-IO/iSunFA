import {
  ALLOCATE_FAILED_PREFIX,
  ALLOCATE_OFFCHAIN_EXIT_PREFIX,
  MEMBER_ALLOCATION_KIND,
  TEAM_WALLET_ENTRY_TYPE,
} from "@/constants/subscription_quota";
import {
  TEAM_ALLOCATION_RECORD_STATUS,
  TeamAllocationRecordStatus,
} from "@/constants/admin_user_points";
import {
  IAllocationLedgerRow,
  resolveMemberAllocationCredits,
} from "@/lib/quota/member_allocation";

/**
 * Info: (20261015 - Luphia) 後台「點數明細」的純函式（無 I/O，供單測逐條釘住）。
 *
 * 「團隊給到成員多少」一律走 `resolveMemberAllocationCredits`，與點數復原指令、
 * 團隊頁成員卡同一條規則，三處不會各說各話。
 */

// Info: (20261015 - Luphia) 團隊分錄 + 它所屬的團隊（資料來自 repo）
export interface ITeamScopedAllocationRow extends IAllocationLedgerRow {
  teamId: string;
}

/**
 * Info: (20261015 - Luphia) 判定一筆 ALLOCATE 需要查的兄弟分錄冪等鍵。
 *
 * 補償（`allocate-failed:`）與出帳（`allocate-offchain-exit:`）分錄的 targetUserId 可能為 null，
 * 所以不能只靠「指向該用戶」的查詢帶出來；改以精確的鍵去撈，不掃整本帳。
 */
export function allocationSiblingKeys(
  rows: readonly Pick<IAllocationLedgerRow, "entryType" | "idempotencyKey">[],
): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    if (row.entryType !== TEAM_WALLET_ENTRY_TYPE.ALLOCATE) continue;
    keys.push(`${ALLOCATE_FAILED_PREFIX}${row.idempotencyKey}`);
    keys.push(`${ALLOCATE_OFFCHAIN_EXIT_PREFIX}${row.idempotencyKey}`);
  }
  return keys;
}

/**
 * Info: (20261015 - Luphia) 每筆指向該用戶的團隊分錄的狀態（以分錄 id 為鍵）。
 *
 * `siblingKeys` 是 `allocationSiblingKeys` 查回來、實際存在的兄弟分錄冪等鍵。
 * 兄弟分錄只用來判定，不會出現在結果裡。
 */
export function deriveTeamAllocationStatuses(
  rows: readonly IAllocationLedgerRow[],
  siblingKeys: ReadonlySet<string>,
): Map<string, TeamAllocationRecordStatus> {
  /**
   * Info: (20261015 - Luphia) 兄弟分錄以 ADJUST 佔位餵進規則：規則只檢查它們的鍵是否存在，
   * 且這兩種前綴都不是 `migrate-allocation:`，不會被當成給到成員。
   */
  const placeholders: IAllocationLedgerRow[] = [...siblingKeys].map((key) => ({
    id: `sibling:${key}`,
    entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
    amount: BigInt(0),
    targetUserId: null,
    txHash: null,
    idempotencyKey: key,
  }));
  const { credits } = resolveMemberAllocationCredits([
    ...rows,
    ...placeholders,
  ]);
  const creditKind = new Map(credits.map((c) => [c.ledgerId, c.kind]));

  const statuses = new Map<string, TeamAllocationRecordStatus>();
  for (const row of rows) {
    const kind = creditKind.get(row.id);
    if (kind === MEMBER_ALLOCATION_KIND.MIGRATION) {
      statuses.set(row.id, TEAM_ALLOCATION_RECORD_STATUS.MIGRATION);
      continue;
    }
    if (kind === MEMBER_ALLOCATION_KIND.ALLOCATE) {
      statuses.set(row.id, TEAM_ALLOCATION_RECORD_STATUS.CREDITED);
      continue;
    }
    if (row.entryType === TEAM_WALLET_ENTRY_TYPE.ALLOCATE) {
      if (siblingKeys.has(`${ALLOCATE_FAILED_PREFIX}${row.idempotencyKey}`)) {
        statuses.set(row.id, TEAM_ALLOCATION_RECORD_STATUS.COMPENSATED);
        continue;
      }
      const exited =
        Boolean(row.txHash) ||
        siblingKeys.has(
          `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}${row.idempotencyKey}`,
        );
      if (!exited) {
        statuses.set(row.id, TEAM_ALLOCATION_RECORD_STATUS.PRE_MIGRATION);
        continue;
      }
    }
    statuses.set(row.id, TEAM_ALLOCATION_RECORD_STATUS.OTHER);
  }
  return statuses;
}

/**
 * Info: (20261015 - Luphia) 每個團隊實際給到 `userId` 的點數（BigInt），只列有給到的團隊。
 */
export function sumTeamAllocatedForUser(
  userId: string,
  rows: readonly ITeamScopedAllocationRow[],
  siblingKeys: ReadonlySet<string>,
): Map<string, bigint> {
  const rowsByTeam = new Map<string, ITeamScopedAllocationRow[]>();
  for (const row of rows) {
    const list = rowsByTeam.get(row.teamId) ?? [];
    list.push(row);
    rowsByTeam.set(row.teamId, list);
  }

  const totals = new Map<string, bigint>();
  for (const [teamId, teamRows] of rowsByTeam) {
    const statuses = deriveTeamAllocationStatuses(teamRows, siblingKeys);
    let total = BigInt(0);
    for (const row of teamRows) {
      if (row.targetUserId !== userId) continue;
      const status = statuses.get(row.id);
      if (status === TEAM_ALLOCATION_RECORD_STATUS.CREDITED) {
        total += row.amount;
      } else if (status === TEAM_ALLOCATION_RECORD_STATUS.MIGRATION) {
        // Info: (20261015 - Luphia) 遷移分錄金額為負（池視角），給到成員的是絕對值
        total += row.amount < BigInt(0) ? -row.amount : row.amount;
      }
    }
    if (total !== BigInt(0)) totals.set(teamId, total);
  }
  return totals;
}

export interface IPointLedgerTypeSum {
  entryType: string;
  count: number;
  total: bigint;
}

/**
 * Info: (20261015 - Luphia) 依分錄型別的加總與帳本總和。
 * 輸入是 repo 的 groupBy 結果（`_sum` 可能為 null）；以型別名排序，畫面穩定。
 */
export function summarisePointLedger(
  groups: readonly { entryType: string; count: number; total: bigint | null }[],
): { breakdown: IPointLedgerTypeSum[]; ledgerTotal: bigint } {
  let ledgerTotal = BigInt(0);
  const breakdown = groups
    .map((group) => {
      const total = group.total ?? BigInt(0);
      ledgerTotal += total;
      return { entryType: group.entryType, count: group.count, total };
    })
    .sort((a, b) => a.entryType.localeCompare(b.entryType));
  return { breakdown, ledgerTotal };
}
