import { keccak256, toBytes, concat, type Hex } from "viem";

/**
 * Info: (20260807 - Luphia) 每日 Ledger merkle 錨定的純函式數學層（ADR 015 C 案 Phase 1）。
 * 決定論要求：leaf 編碼為固定順序、固定分隔符的字串，任何人可自 DB 重算同一 root
 * 並與鏈上 AnchorCommitted 事件比對。不碰 DB、不碰鏈，時間一律由呼叫端注入。
 */

export interface ILedgerLeafSource {
  id: string;
  teamWalletId: string;
  entryType: string;
  amount: bigint;
  poolBalanceAfter: bigint | null;
  allocationBalanceAfter: bigint | null;
  idempotencyKey: string;
  createdAtEpochSec: number;
}

// Info: (20260807 - Luphia) 空日與創世鏈根的哨兵值：固定字面，重算方可獨立導出
export const EMPTY_DAY_ROOT: Hex = keccak256(toBytes("iSunFA:empty-day"));
export const GENESIS_CHAINED_ROOT: Hex = keccak256(toBytes("iSunFA:genesis"));

export function hashLedgerLeaf(entry: ILedgerLeafSource): Hex {
  const encoded = [
    entry.id,
    entry.teamWalletId,
    entry.entryType,
    entry.amount.toString(),
    entry.poolBalanceAfter?.toString() ?? "",
    entry.allocationBalanceAfter?.toString() ?? "",
    entry.idempotencyKey,
    String(entry.createdAtEpochSec),
  ].join("|");
  return keccak256(toBytes(encoded));
}

/**
 * Info: (20260807 - Luphia) 標準 pairwise merkle：奇數節點複製尾節點；
 * 葉序即輸入序（呼叫端須以 createdAt, id 穩定排序），空集合回 EMPTY_DAY_ROOT。
 */
export function computeMerkleRoot(leaves: Hex[]): Hex {
  if (leaves.length === 0) return EMPTY_DAY_ROOT;
  let level = leaves;
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(keccak256(concat([left, right])));
    }
    level = next;
  }
  return level[0];
}

export function chainRoot(previousChainedRoot: Hex | null, dayRoot: Hex): Hex {
  return keccak256(
    concat([previousChainedRoot ?? GENESIS_CHAINED_ROOT, dayRoot]),
  );
}
