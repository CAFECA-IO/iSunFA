import { describe, it, expect } from "@jest/globals";
import {
  allocationSiblingKeys,
  deriveTeamAllocationStatuses,
  sumTeamAllocatedForUser,
  summarisePointLedger,
  ITeamScopedAllocationRow,
} from "@/lib/quota/admin_user_points";
import { TEAM_ALLOCATION_RECORD_STATUS } from "@/constants/admin_user_points";
import {
  ALLOCATE_FAILED_PREFIX,
  ALLOCATE_OFFCHAIN_EXIT_PREFIX,
  MIGRATE_ALLOCATION_PREFIX,
  TEAM_WALLET_ENTRY_TYPE,
} from "@/constants/subscription_quota";
import { POINT_LEDGER_ENTRY_TYPE } from "@/constants/point_ledger";

/**
 * Info: (20261015 - Luphia) 後台「點數明細」的判定規則。
 *
 * 狀態與加總都必須和 `resolveMemberAllocationCredits` 同一條規則：
 * 遷移前的離鏈 ALLOCATE 不算、有 `allocate-failed:` 補償的不算、`migrate-allocation:` 算。
 * 兄弟分錄（補償／出帳）的 targetUserId 可能為 null，所以只靠冪等鍵判定。
 */

const USER = "user-1";

function row(
  overrides: Partial<ITeamScopedAllocationRow> & { id: string },
): ITeamScopedAllocationRow {
  return {
    teamId: "team-a",
    entryType: TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
    amount: BigInt(100),
    targetUserId: USER,
    txHash: null,
    idempotencyKey: `key-${overrides.id}`,
    ...overrides,
  };
}

describe("allocationSiblingKeys", () => {
  it("只替 ALLOCATE 產生補償與出帳兩把鍵", () => {
    const keys = allocationSiblingKeys([
      row({ id: "a" }),
      row({ id: "r", entryType: TEAM_WALLET_ENTRY_TYPE.REVOKE }),
    ]);
    expect(keys).toEqual([
      `${ALLOCATE_FAILED_PREFIX}key-a`,
      `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}key-a`,
    ]);
  });
});

describe("deriveTeamAllocationStatuses", () => {
  const rows = [
    row({ id: "chain", txHash: "0xabc" }),
    row({ id: "exit" }),
    row({ id: "failed", txHash: "0xdef" }),
    row({ id: "pre" }),
    row({
      id: "migrate",
      entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
      amount: BigInt(-40),
      idempotencyKey: `${MIGRATE_ALLOCATION_PREFIX}x`,
    }),
    row({
      id: "revoke",
      entryType: TEAM_WALLET_ENTRY_TYPE.REVOKE,
      amount: BigInt(-10),
    }),
    row({
      id: "adjust",
      entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
      amount: BigInt(5),
    }),
  ];
  const siblings = new Set([
    `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}key-exit`,
    `${ALLOCATE_FAILED_PREFIX}key-failed`,
  ]);
  const statuses = deriveTeamAllocationStatuses(rows, siblings);

  it.each([
    ["chain", TEAM_ALLOCATION_RECORD_STATUS.CREDITED],
    ["exit", TEAM_ALLOCATION_RECORD_STATUS.CREDITED],
    ["failed", TEAM_ALLOCATION_RECORD_STATUS.COMPENSATED],
    ["pre", TEAM_ALLOCATION_RECORD_STATUS.PRE_MIGRATION],
    ["migrate", TEAM_ALLOCATION_RECORD_STATUS.MIGRATION],
    ["revoke", TEAM_ALLOCATION_RECORD_STATUS.OTHER],
    ["adjust", TEAM_ALLOCATION_RECORD_STATUS.OTHER],
  ])("%s → %s", (id, expected) => {
    expect(statuses.get(id)).toBe(expected);
  });

  it("兄弟分錄只用來判定，不出現在結果裡", () => {
    expect([...statuses.keys()].sort()).toEqual(rows.map((r) => r.id).sort());
  });

  it("補償優先於出帳：同時有兩個兄弟時仍是 COMPENSATED", () => {
    const both = deriveTeamAllocationStatuses(
      [row({ id: "both" })],
      new Set([
        `${ALLOCATE_FAILED_PREFIX}key-both`,
        `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}key-both`,
      ]),
    );
    expect(both.get("both")).toBe(TEAM_ALLOCATION_RECORD_STATUS.COMPENSATED);
  });

  it("有出帳但金額非正的 ALLOCATE 被規則略過，標為 OTHER", () => {
    const zero = deriveTeamAllocationStatuses(
      [row({ id: "zero", amount: BigInt(0), txHash: "0x1" })],
      new Set(),
    );
    expect(zero.get("zero")).toBe(TEAM_ALLOCATION_RECORD_STATUS.OTHER);
  });
});

describe("sumTeamAllocatedForUser", () => {
  it("依團隊加總實際給到的點數；遷移分錄取絕對值；不算的與沒給到的團隊不列出", () => {
    const rows = [
      row({ id: "a1", txHash: "0x1", amount: BigInt(100) }),
      row({ id: "a2", amount: BigInt(50) }),
      row({ id: "a3", amount: BigInt(999) }),
      row({
        id: "m1",
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        amount: BigInt(-30),
        idempotencyKey: `${MIGRATE_ALLOCATION_PREFIX}m1`,
      }),
      row({ id: "b1", teamId: "team-b", txHash: "0x2", amount: BigInt(7) }),
      row({ id: "c1", teamId: "team-c", amount: BigInt(500) }),
      row({ id: "other-user", txHash: "0x3", targetUserId: "user-2" }),
    ];
    const siblings = new Set([
      `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}key-a2`,
      `${ALLOCATE_FAILED_PREFIX}key-a3`,
    ]);

    const totals = sumTeamAllocatedForUser(USER, rows, siblings);

    expect(totals.get("team-a")).toBe(BigInt(180));
    expect(totals.get("team-b")).toBe(BigInt(7));
    // Info: (20261015 - Luphia) team-c 只有遷移前的離鏈分配：不算，也不列
    expect(totals.has("team-c")).toBe(false);
  });
});

describe("summarisePointLedger", () => {
  it("依型別加總、null 視為 0、以型別名排序，帳本總和為各型別之和", () => {
    const { breakdown, ledgerTotal } = summarisePointLedger([
      {
        entryType: POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION,
        count: 2,
        total: BigInt(300),
      },
      {
        entryType: POINT_LEDGER_ENTRY_TYPE.CONSUME,
        count: 3,
        total: BigInt(-120),
      },
      { entryType: POINT_LEDGER_ENTRY_TYPE.ADJUST, count: 1, total: null },
    ]);

    expect(breakdown.map((b) => b.entryType)).toEqual([
      POINT_LEDGER_ENTRY_TYPE.ADJUST,
      POINT_LEDGER_ENTRY_TYPE.CONSUME,
      POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION,
    ]);
    expect(breakdown[0].total).toBe(BigInt(0));
    expect(ledgerTotal).toBe(BigInt(180));
  });

  it("大於 2^53 的金額不失精度", () => {
    const big = BigInt("9007199254740993");
    const { ledgerTotal } = summarisePointLedger([
      { entryType: POINT_LEDGER_ENTRY_TYPE.PURCHASE, count: 1, total: big },
      { entryType: POINT_LEDGER_ENTRY_TYPE.REFUND, count: 1, total: BigInt(2) },
    ]);
    expect(ledgerTotal).toBe(BigInt("9007199254740995"));
  });
});
