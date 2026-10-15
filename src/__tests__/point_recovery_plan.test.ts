jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  buildRecoveryPlan,
  summarizePlan,
} from "@/services/point_recovery.service";
import type {
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

  it("credits team allocations unless compensated, plus migrations", () => {
    const p = plan([], {
      users: [USER, OTHER],
      teamLedger: [
        {
          id: "al1",
          entryType: "ALLOCATE",
          amount: BigInt(40),
          targetUserId: USER,
          txHash: "0x1",
          idempotencyKey: "k1",
        },
        {
          id: "al2",
          entryType: "ALLOCATE",
          amount: BigInt(60),
          targetUserId: USER,
          txHash: null,
          idempotencyKey: "k2",
        },
        {
          id: "cmp",
          entryType: "ADJUST",
          amount: BigInt(60),
          targetUserId: null,
          txHash: null,
          idempotencyKey: "allocate-failed:k2",
        },
        {
          id: "al3",
          entryType: "ALLOCATE",
          amount: BigInt(15),
          targetUserId: OTHER,
          txHash: null,
          idempotencyKey: "k3",
        },
        {
          id: "mig",
          entryType: "ADJUST",
          amount: BigInt(-25),
          targetUserId: USER,
          txHash: "0x2",
          idempotencyKey: "migrate-allocation:t:user-a",
        },
      ],
    });
    const team = p.entries.filter(
      (e) => e.entryType === POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION,
    );
    expect(team.map((e) => `${e.idempotencyKey}=${e.amount}`)).toEqual([
      `${POINT_LEDGER_KEY.teamAllocation("al1")}=40`,
      `${POINT_LEDGER_KEY.teamAllocation("al3")}=15`,
      `${POINT_LEDGER_KEY.teamMigration("mig")}=25`,
    ]);
    expect(p.anomalies.some((a) => a.includes("al3"))).toBe(true);
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
