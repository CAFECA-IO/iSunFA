import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  runLedgerAnchoring,
  runWalletConservationAudit,
  runWalletGuardian,
} from "@/services/cron/wallet_audit.cron";
import {
  chainRoot,
  computeMerkleRoot,
  EMPTY_DAY_ROOT,
  hashLedgerLeaf,
} from "@/lib/quota/ledger_merkle";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import { teamLedgerAnchorRepo } from "@/repositories/team_ledger_anchor.repo";

jest.mock("@/lib/utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/viem", () => ({
  // Info: (20260807 - Luphia) 測試環境無 relayer key：驗證「未配置不阻斷營運」的行為
  walletClient: null,
  account: null,
}));
jest.mock("@/repositories/team_wallet.repo", () => ({
  teamWalletRepo: {
    listAllWallets: jest.fn(),
    sumAllocationsByTeam: jest.fn(),
    sumLedgerByWalletAndType: jest.fn(),
    freezeWallet: jest.fn(),
  },
}));
jest.mock("@/repositories/team_ledger_anchor.repo", () => ({
  teamLedgerAnchorRepo: {
    getLatestAnchored: jest.fn(),
    getByDate: jest.fn(),
    upsertPending: jest.fn(),
    markAnchored: jest.fn(),
    markFailed: jest.fn(),
    listLedgerForWindow: jest.fn(),
  },
}));

/**
 * Info: (20260807 - Luphia) 錢包守護行程單測（設計書 §3 / §9 P4 驗收）。
 * 驗收：壞帳注入 → 凍結錢包並告警；勾稽通過 → 錨定；違規 → 跳過錨定（壞帳不上鏈）。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

// Info: (20260807 - Luphia) 2026-08-07 12:00 台北 → 錨定「昨日」= 2026-08-06（台北日界）
const NOW_MS = 1786075200 * 1000;

const BALANCED_WALLET = {
  id: "wallet-1",
  teamId: "team-1",
  status: "ACTIVE",
  unallocatedBalance: BigInt(650),
};

function mockBalancedState() {
  asMock(teamWalletRepo.listAllWallets).mockResolvedValue([BALANCED_WALLET]);
  asMock(teamWalletRepo.sumAllocationsByTeam).mockResolvedValue([
    { teamId: "team-1", total: BigInt(47) },
  ]);
  // Info: (20260807 - Luphia) 700(購) - 3(耗) = 697 = 650(池) + 47(分配)；ALLOCATE 不列入左側
  asMock(teamWalletRepo.sumLedgerByWalletAndType).mockResolvedValue([
    { teamWalletId: "wallet-1", entryType: "PURCHASE", total: BigInt(700) },
    { teamWalletId: "wallet-1", entryType: "CONSUME", total: BigInt(-3) },
    { teamWalletId: "wallet-1", entryType: "ALLOCATE", total: BigInt(50) },
  ]);
}

describe("runWalletConservationAudit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBalancedState();
  });

  it("passes a balanced wallet and excludes internal transfers from the equation", async () => {
    const result = await runWalletConservationAudit();
    expect(result).toEqual({ checked: 1, violations: 0, frozen: [] });
    expect(teamWalletRepo.freezeWallet).not.toHaveBeenCalled();
  });

  it("freezes the wallet when the conservation equation is violated", async () => {
    // Info: (20260807 - Luphia) 壞帳注入：池被竄改為 651，帳本總和 697 ≠ 651 + 47
    asMock(teamWalletRepo.listAllWallets).mockResolvedValue([
      { ...BALANCED_WALLET, unallocatedBalance: BigInt(651) },
    ]);
    const result = await runWalletConservationAudit();
    expect(result.violations).toBe(1);
    expect(result.frozen).toEqual(["wallet-1"]);
    expect(teamWalletRepo.freezeWallet).toHaveBeenCalledWith("wallet-1");
  });

  it("does not re-freeze an already frozen wallet", async () => {
    asMock(teamWalletRepo.listAllWallets).mockResolvedValue([
      {
        ...BALANCED_WALLET,
        status: "FROZEN",
        unallocatedBalance: BigInt(651),
      },
    ]);
    const result = await runWalletConservationAudit();
    expect(result.violations).toBe(1);
    expect(teamWalletRepo.freezeWallet).not.toHaveBeenCalled();
  });
});

describe("runLedgerAnchoring", () => {
  const LEDGER_ROW = {
    id: "ledger-a",
    teamWalletId: "wallet-1",
    entryType: "PURCHASE",
    amount: BigInt(700),
    poolBalanceAfter: BigInt(700),
    allocationBalanceAfter: null,
    idempotencyKey: "purchase:order-1",
    createdAt: new Date(NOW_MS - 12 * 3600 * 1000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamLedgerAnchorRepo.getByDate).mockResolvedValue(null);
    asMock(teamLedgerAnchorRepo.getLatestAnchored).mockResolvedValue(null);
    asMock(teamLedgerAnchorRepo.listLedgerForWindow).mockResolvedValue([
      LEDGER_ROW,
    ]);
    asMock(teamLedgerAnchorRepo.upsertPending).mockResolvedValue({
      id: "anchor-1",
    } as unknown);
  });

  it("skips when the day is already anchored", async () => {
    asMock(teamLedgerAnchorRepo.getByDate).mockResolvedValue({
      status: "ANCHORED",
    } as unknown);
    const result = await runLedgerAnchoring(NOW_MS);
    expect(result).toEqual({ skipped: true, anchored: true });
    expect(teamLedgerAnchorRepo.upsertPending).not.toHaveBeenCalled();
  });

  it("anchors yesterday's Taipei-day window with a genesis-chained root", async () => {
    await runLedgerAnchoring(NOW_MS);

    // Info: (20260807 - Luphia) 2026-08-06 00:00 台北 = 2026-08-05T16:00:00Z = 1785945600
    const [[windowStart, windowEnd]] = asMock(
      teamLedgerAnchorRepo.listLedgerForWindow,
    ).mock.calls as [[Date, Date]];
    expect(Math.floor(windowStart.getTime() / 1000)).toBe(1785945600);
    expect(Math.floor(windowEnd.getTime() / 1000)).toBe(1785945600 + 86400);

    const upsert = asMock(teamLedgerAnchorRepo.upsertPending).mock
      .calls[0][0] as {
      entryCount: number;
      dayMerkleRoot: string;
      chainedRoot: string;
    };
    expect(upsert.entryCount).toBe(1);
    // Info: (20260807 - Luphia) 可重算性：以同一 leaf 編碼重算必得同一 root
    const expectedDayRoot = computeMerkleRoot([
      hashLedgerLeaf({
        id: LEDGER_ROW.id,
        teamWalletId: LEDGER_ROW.teamWalletId,
        entryType: LEDGER_ROW.entryType,
        amount: LEDGER_ROW.amount,
        poolBalanceAfter: LEDGER_ROW.poolBalanceAfter,
        allocationBalanceAfter: LEDGER_ROW.allocationBalanceAfter,
        idempotencyKey: LEDGER_ROW.idempotencyKey,
        createdAtEpochSec: Math.floor(LEDGER_ROW.createdAt.getTime() / 1000),
      }),
    ]);
    expect(upsert.dayMerkleRoot).toBe(expectedDayRoot);
    expect(upsert.chainedRoot).toBe(chainRoot(null, expectedDayRoot));
  });

  it("uses the empty-day sentinel when there were no entries", async () => {
    asMock(teamLedgerAnchorRepo.listLedgerForWindow).mockResolvedValue([]);
    await runLedgerAnchoring(NOW_MS);
    const upsert = asMock(teamLedgerAnchorRepo.upsertPending).mock
      .calls[0][0] as { dayMerkleRoot: string };
    expect(upsert.dayMerkleRoot).toBe(EMPTY_DAY_ROOT);
  });

  it("marks FAILED without throwing when the anchor tx is not configured", async () => {
    const result = await runLedgerAnchoring(NOW_MS);
    expect(result.anchored).toBe(false);
    expect(teamLedgerAnchorRepo.markFailed).toHaveBeenCalledWith("anchor-1");
    expect(teamLedgerAnchorRepo.markAnchored).not.toHaveBeenCalled();
  });
});

describe("runWalletGuardian", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBalancedState();
    asMock(teamLedgerAnchorRepo.getByDate).mockResolvedValue({
      status: "ANCHORED",
    } as unknown);
  });

  it("anchors only after the conservation audit passes", async () => {
    await runWalletGuardian();
    expect(teamLedgerAnchorRepo.getByDate).toHaveBeenCalled();
  });

  it("skips anchoring entirely when a violation is found (bad books never go on-chain)", async () => {
    asMock(teamWalletRepo.listAllWallets).mockResolvedValue([
      { ...BALANCED_WALLET, unallocatedBalance: BigInt(999) },
    ]);
    await runWalletGuardian();
    expect(teamLedgerAnchorRepo.getByDate).not.toHaveBeenCalled();
  });
});
