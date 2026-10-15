jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  buildRecoveryPlan,
  summarizePlan,
} from "@/services/point_recovery.service";
import type {
  IRecoveryExistingEntryRow,
  IRecoveryOrderRow,
  IRecoveryTeamLedgerRow,
} from "@/repositories/point_recovery.repo";
import {
  POINT_LEDGER_ENTRY_TYPE,
  POINT_LEDGER_KEY,
} from "@/constants/point_ledger";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { CURRENCY_UNIT, REWARD_AMOUNTS } from "@/constants/price";

/**
 * Info: (20261015 - Luphia) 點數復原規則（區塊鏈退役）。
 * 每一條規則都釘一個案例：這支的錯誤是「少發或多發真實的點數」，而且不會有人立刻發現。
 */

const USER = "user-a";
const OTHER = "user-b";

function order(partial: Partial<IRecoveryOrderRow>): IRecoveryOrderRow {
  return {
    id: "o1",
    userId: USER,
    type: ORDER_TYPE.ANALYSIS,
    amount: BigInt(0),
    unit: CURRENCY_UNIT.ICP,
    status: ORDER_STATUS.COMPLETED,
    data: {},
    signature: null,
    transactionHash: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...partial,
  };
}

function plan(
  orders: IRecoveryOrderRow[],
  extra: {
    teamLedger?: IRecoveryTeamLedgerRow[];
    existing?: IRecoveryExistingEntryRow[];
    users?: string[];
    campaign?: { id: string; userId: string; bonusPoints: number }[];
  } = {},
) {
  return buildRecoveryPlan({
    users: (extra.users ?? [USER]).map((id) => ({
      id,
      pointBalance: BigInt(0),
    })),
    orders,
    campaignRegistrations: (extra.campaign ?? []).map((c) => ({
      ...c,
      campaignName: "c",
    })),
    teamLedger: extra.teamLedger ?? [],
    existingTeamAllocations: extra.existing ?? [],
  });
}

function keysOf(p: ReturnType<typeof plan>) {
  return p.entries.map((e) => `${e.idempotencyKey}=${e.amount}`);
}

describe("buildRecoveryPlan", () => {
  it("credits a registration reward to every user without a registration order", () => {
    const p = plan([], { users: [USER, OTHER] });
    expect(keysOf(p)).toEqual([
      `${POINT_LEDGER_KEY.registration(USER)}=${REWARD_AMOUNTS.REGISTRATION_REWARD}`,
      `${POINT_LEDGER_KEY.registration(OTHER)}=${REWARD_AMOUNTS.REGISTRATION_REWARD}`,
    ]);
  });

  it("uses the registration order amount instead of the default, once", () => {
    const p = plan([
      order({
        id: "r1",
        type: ORDER_TYPE.REGISTRATION_REWARD,
        amount: BigInt(100),
      }),
      order({
        id: "r2",
        type: ORDER_TYPE.REGISTRATION_REWARD,
        amount: BigInt(100),
      }),
    ]);
    expect(keysOf(p)).toEqual([`${POINT_LEDGER_KEY.registration(USER)}=100`]);
  });

  it.each([
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.PAID,
    ORDER_STATUS.MINT_FAILED,
  ])(
    "credits a personal purchase in %s and settles non-completed ones",
    (status) => {
      const p = plan([
        order({
          id: "buy",
          type: ORDER_TYPE.OEN_PAYMENT,
          unit: CURRENCY_UNIT.TWD,
          amount: BigInt(300),
          status,
          data: { credits: 500 },
        }),
      ]);
      expect(keysOf(p)).toContain(`${POINT_LEDGER_KEY.orderCredit("buy")}=500`);
      expect(p.purchasesToSettle).toEqual(
        status === ORDER_STATUS.COMPLETED
          ? []
          : [{ orderId: "buy", fromStatus: status }],
      );
    },
  );

  it("does not credit unpaid or team purchases", () => {
    const p = plan([
      order({
        id: "pending",
        type: ORDER_TYPE.OEN_PAYMENT,
        unit: CURRENCY_UNIT.TWD,
        status: ORDER_STATUS.PENDING,
        data: { credits: 500 },
      }),
      order({
        id: "team",
        type: ORDER_TYPE.BILLING_TEAM_POINT,
        unit: CURRENCY_UNIT.TWD,
        status: ORDER_STATUS.MINT_FAILED,
        data: { credits: 500, teamId: "t" },
      }),
    ]);
    expect(p.entries.filter((e) => e.orderId)).toEqual([]);
  });

  it("credits personal admin issues but not team admin issues", () => {
    const p = plan([
      order({ id: "a1", type: ORDER_TYPE.ADMIN_ISSUED, amount: BigInt(50) }),
      order({
        id: "a2",
        type: ORDER_TYPE.ADMIN_ISSUED,
        amount: BigInt(70),
        data: { teamId: "t" },
      }),
    ]);
    expect(keysOf(p)).toContain(`${POINT_LEDGER_KEY.orderCredit("a1")}=50`);
    expect(keysOf(p).some((k) => k.includes("a2"))).toBe(false);
  });

  it("credits historical check-in rewards under both spellings", () => {
    const p = plan([
      order({ id: "c1", type: ORDER_TYPE.CHECK_IN_REWARD, amount: BigInt(5) }),
      order({ id: "c2", type: "CHECKIN_REWARD", amount: BigInt(5) }),
    ]);
    expect(keysOf(p)).toEqual(
      expect.arrayContaining([
        `${POINT_LEDGER_KEY.orderCredit("c1")}=5`,
        `${POINT_LEDGER_KEY.orderCredit("c2")}=5`,
      ]),
    );
  });

  it("debits paid consumption, skips unpaid and team-quota orders", () => {
    const p = plan([
      order({ id: "d1", amount: BigInt(-30), status: ORDER_STATUS.COMPLETED }),
      order({ id: "d2", amount: BigInt(-20), status: ORDER_STATUS.FAILED }),
      order({
        id: "d3",
        amount: BigInt(-10),
        status: ORDER_STATUS.PAYMENT_FAILED,
      }),
      order({ id: "d4", amount: BigInt(-10), status: ORDER_STATUS.CANCEL }),
      order({
        id: "d5",
        amount: BigInt(-10),
        status: ORDER_STATUS.COMPLETED,
        signature: JSON.stringify({ verifiedVia: "team_quota" }),
      }),
    ]);
    const debits = p.entries.filter(
      (e) => e.entryType === POINT_LEDGER_ENTRY_TYPE.CONSUME,
    );
    expect(debits.map((e) => `${e.orderId}=${e.amount}`)).toEqual([
      "d1=-30",
      "d2=-20",
    ]);
  });

  it("does not debit legacy PAYING orders and schedules them to fail", () => {
    const p = plan([
      order({ id: "pay", amount: BigInt(-30), status: ORDER_STATUS.PAYING }),
    ]);
    expect(p.entries.some((e) => e.orderId === "pay")).toBe(false);
    expect(p.legacyPayingOrderIds).toEqual(["pay"]);
  });

  it("refunds refunded and refund-owed consumption", () => {
    const p = plan([
      order({ id: "f1", amount: BigInt(-30), data: { refundedAt: "x" } }),
      order({ id: "f2", amount: BigInt(-20), data: { refundOwed: true } }),
    ]);
    expect(keysOf(p)).toEqual(
      expect.arrayContaining([
        `${POINT_LEDGER_KEY.orderRefund("f1")}=30`,
        `${POINT_LEDGER_KEY.orderRefund("f2")}=20`,
      ]),
    );
  });

  it("credits campaign bonuses", () => {
    const p = plan([], {
      campaign: [
        { id: "reg1", userId: USER, bonusPoints: 200 },
        { id: "reg2", userId: USER, bonusPoints: 0 },
      ],
    });
    expect(keysOf(p)).toContain(`${POINT_LEDGER_KEY.campaign("reg1")}=200`);
    expect(keysOf(p).some((k) => k.includes("reg2"))).toBe(false);
  });

  /**
   * Info: (20261015 - Luphia) 三個時代的 ALLOCATE：
   * 有 txHash（鑄到錢包）、有 offchain-exit 配對（08-18 起與 DB 帳本時代）要算；
   * 兩者皆無的是遷移前的離鏈分配，剩餘部分已由 migrate-allocation 計入，**不可再算**。
   */
  it("credits only allocations that left the team ledger, plus migrations", () => {
    const row = (
      id: string,
      entryType: string,
      amount: number,
      targetUserId: string | null,
      txHash: string | null,
      idempotencyKey: string,
    ) => ({
      id,
      entryType,
      amount: BigInt(amount),
      targetUserId,
      txHash,
      idempotencyKey,
    });
    const p = plan([], {
      users: [USER, OTHER],
      teamLedger: [
        row("minted", "ALLOCATE", 40, USER, "0x1", "k1"),
        row("failed", "ALLOCATE", 60, USER, "0x9", "k2"),
        row("cmp", "ADJUST", 60, null, null, "allocate-failed:k2"),
        row("exited", "ALLOCATE", 15, OTHER, null, "k3"),
        row("exit", "ADJUST", -15, OTHER, null, "allocate-offchain-exit:k3"),
        row("premig", "ALLOCATE", 500, USER, null, "k4"),
        row("mig", "ADJUST", -25, USER, "0x2", "migrate-allocation:t:user-a"),
      ],
    });
    const team = p.entries.filter(
      (e) => e.entryType === POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION,
    );
    expect(team.map((e) => `${e.idempotencyKey}=${e.amount}`)).toEqual([
      `${POINT_LEDGER_KEY.teamAllocation("minted")}=40`,
      `${POINT_LEDGER_KEY.teamAllocation("exited")}=15`,
      `${POINT_LEDGER_KEY.teamMigration("mig")}=25`,
    ]);
  });

  it("reverses team allocations credited under the first (double-counting) rule", () => {
    const p = plan([], {
      teamLedger: [
        {
          id: "premig",
          entryType: "ALLOCATE",
          amount: BigInt(500),
          targetUserId: USER,
          txHash: null,
          idempotencyKey: "k4",
        },
        {
          id: "minted",
          entryType: "ALLOCATE",
          amount: BigInt(40),
          targetUserId: USER,
          txHash: "0x1",
          idempotencyKey: "k1",
        },
      ],
      existing: [
        {
          id: "pl-1",
          userId: USER,
          amount: BigInt(500),
          sourceRef: "premig",
          idempotencyKey: POINT_LEDGER_KEY.teamAllocation("premig"),
        },
        {
          id: "pl-2",
          userId: USER,
          amount: BigInt(40),
          sourceRef: "minted",
          idempotencyKey: POINT_LEDGER_KEY.teamAllocation("minted"),
        },
      ],
    });
    const reversals = p.entries.filter(
      (e) => e.entryType === POINT_LEDGER_ENTRY_TYPE.ADJUST,
    );
    expect(reversals.map((e) => `${e.idempotencyKey}=${e.amount}`)).toEqual([
      `${POINT_LEDGER_KEY.teamAllocationReversal("pl-1")}=-500`,
    ]);
  });

  it("drops global-source entries for users outside the filter", () => {
    const p = plan([], {
      users: [USER],
      teamLedger: [
        {
          id: "al",
          entryType: "ALLOCATE",
          amount: BigInt(40),
          targetUserId: OTHER,
          txHash: "0x",
          idempotencyKey: "k",
        },
      ],
    });
    expect(p.entries.every((e) => e.userId === USER)).toBe(true);
  });

  it("summarizes net per user", () => {
    const p = plan([order({ id: "d1", amount: BigInt(-30) })]);
    expect(summarizePlan(p)).toEqual([
      {
        userId: USER,
        credited: BigInt(REWARD_AMOUNTS.REGISTRATION_REWARD),
        debited: BigInt(30),
        net: BigInt(REWARD_AMOUNTS.REGISTRATION_REWARD - 30),
      },
    ]);
  });
});
