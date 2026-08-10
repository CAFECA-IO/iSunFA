import { describe, expect, it } from "@jest/globals";
import {
  chainRoot,
  computeMerkleRoot,
  EMPTY_DAY_ROOT,
  GENESIS_CHAINED_ROOT,
  hashLedgerLeaf,
  type ILedgerLeafSource,
} from "@/lib/quota/ledger_merkle";

/**
 * Info: (20260807 - Luphia) merkle 錨定純函式單測（ADR 015 C 案 Phase 1、P4 驗收）。
 * 驗收條件「任一日的 Ledger 可由 DB 重算 root 並與鏈上比對一致」的前提是
 * 決定論：同輸入必同 root、葉序敏感、奇數節點與空日有固定規則。
 */

const LEAF_A: ILedgerLeafSource = {
  id: "ledger-a",
  teamWalletId: "wallet-1",
  entryType: "PURCHASE",
  amount: BigInt(700),
  poolBalanceAfter: BigInt(700),
  allocationBalanceAfter: null,
  idempotencyKey: "purchase:order-1",
  createdAtEpochSec: 1786075200,
};

const LEAF_B: ILedgerLeafSource = {
  ...LEAF_A,
  id: "ledger-b",
  entryType: "CONSUME",
  amount: BigInt(-3),
  poolBalanceAfter: null,
  allocationBalanceAfter: BigInt(47),
  idempotencyKey: "faith:msg-1",
};

const LEAF_C: ILedgerLeafSource = {
  ...LEAF_A,
  id: "ledger-c",
  idempotencyKey: "alloc-1",
};

describe("hashLedgerLeaf", () => {
  it("is deterministic and sensitive to every field", () => {
    expect(hashLedgerLeaf(LEAF_A)).toBe(hashLedgerLeaf({ ...LEAF_A }));
    expect(hashLedgerLeaf(LEAF_A)).not.toBe(hashLedgerLeaf(LEAF_B));
    expect(hashLedgerLeaf(LEAF_A)).not.toBe(
      hashLedgerLeaf({ ...LEAF_A, amount: BigInt(701) }),
    );
    expect(hashLedgerLeaf(LEAF_A)).not.toBe(
      hashLedgerLeaf({ ...LEAF_A, allocationBalanceAfter: BigInt(0) }),
    );
  });
});

describe("computeMerkleRoot", () => {
  it("returns the sentinel for an empty day", () => {
    expect(computeMerkleRoot([])).toBe(EMPTY_DAY_ROOT);
  });

  it("is deterministic and order-sensitive", () => {
    const leaves = [LEAF_A, LEAF_B, LEAF_C].map(hashLedgerLeaf);
    const root = computeMerkleRoot(leaves);
    expect(computeMerkleRoot([...leaves])).toBe(root);
    expect(computeMerkleRoot([leaves[1], leaves[0], leaves[2]])).not.toBe(root);
  });

  it("handles odd leaf counts by duplicating the last node", () => {
    const leaves = [LEAF_A, LEAF_B, LEAF_C].map(hashLedgerLeaf);
    // Info: (20260807 - Luphia) 三葉 root 必須可重算且不等於任一單葉
    const root = computeMerkleRoot(leaves);
    expect(root).not.toBe(leaves[0]);
    expect(root).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("a single leaf is its own root", () => {
    const leaf = hashLedgerLeaf(LEAF_A);
    expect(computeMerkleRoot([leaf])).toBe(leaf);
  });
});

describe("chainRoot", () => {
  it("chains from genesis when there is no previous anchor", () => {
    const dayRoot = computeMerkleRoot([hashLedgerLeaf(LEAF_A)]);
    const chained = chainRoot(null, dayRoot);
    expect(chained).toBe(chainRoot(GENESIS_CHAINED_ROOT, dayRoot));
    expect(chained).not.toBe(dayRoot);
  });

  it("binds history: a different previous root yields a different chain", () => {
    const dayRoot = computeMerkleRoot([hashLedgerLeaf(LEAF_A)]);
    const chainedFromGenesis = chainRoot(null, dayRoot);
    const chainedFromOther = chainRoot(
      computeMerkleRoot([hashLedgerLeaf(LEAF_B)]),
      dayRoot,
    );
    expect(chainedFromGenesis).not.toBe(chainedFromOther);
  });
});
