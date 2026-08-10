import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  createTeamPointPurchaseOrder,
  fulfillTeamPointPurchase,
  getTeamWalletView,
  manageAllocation,
  revokeAllocationOnMemberRemoval,
} from "@/services/team_wallet.service";
import {
  ALLOCATION_DIRECTION,
  TEAM_WALLET_ENTRY_TYPE,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";
import { ORDER_TYPE } from "@/constants/status";
import { teamRepo } from "@/repositories/team.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { generatePaymentOrder } from "@/services/order.service";
import type { Order } from "@/generated";

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getTeamMember: jest.fn() },
}));
jest.mock("@/repositories/team_wallet.repo", () => ({
  teamWalletRepo: {
    getWalletByTeamId: jest.fn(),
    getAllocation: jest.fn(),
    listAllocations: jest.fn(),
    listLedger: jest.fn(),
    allocate: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    creditPool: jest.fn(),
  },
}));
jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: { updateOrderCompleted: jest.fn() },
}));
jest.mock("@/services/order.service", () => ({
  generatePaymentOrder: jest.fn(),
}));

/**
 * Info: (20260807 - Luphia) 團隊錢包 Service 單測（設計書 §6、P2 驗收）。
 * 覆蓋權限矩陣、點數包解析、分配方向與錯誤映射、購點履行冪等、成員移除收回。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const LEDGER_ROW = {
  id: "ledger-1",
  entryType: TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
  amount: BigInt(50),
  poolBalanceAfter: BigInt(650),
  allocationBalanceAfter: BigInt(50),
  targetUserId: "user-2",
  operatorUserId: "user-admin",
  orderId: null,
  featureCode: null,
  createdAt: new Date(1786075200 * 1000),
};

function mockMembers(roles: Record<string, string | null>) {
  asMock(teamRepo.getTeamMember).mockImplementation(async (userId: unknown) => {
    const role = roles[userId as string];
    if (!role) return null;
    return { id: `member-${userId}`, role };
  });
}

describe("createTeamPointPurchaseOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembers({ "user-admin": "ADMIN", "user-viewer": "VIEWER" });
    asMock(generatePaymentOrder).mockResolvedValue({
      orderId: "order-1",
      challenge: "c",
      cost: 600,
    });
  });

  it("rejects non-managers", async () => {
    await expect(
      createTeamPointPurchaseOrder({
        userId: "user-viewer",
        teamId: "team-1",
        creditPlanId: "tier2",
        paymentMethodId: "pm-1",
      }),
    ).rejects.toMatchObject({ code: "TW000004" });
    expect(generatePaymentOrder).not.toHaveBeenCalled();
  });

  it("rejects unknown credit plans", async () => {
    await expect(
      createTeamPointPurchaseOrder({
        userId: "user-admin",
        teamId: "team-1",
        creditPlanId: "tier99",
        paymentMethodId: "pm-1",
      }),
    ).rejects.toMatchObject({ code: "TW000010" });
  });

  it("creates a BILLING_TEAM_POINT order with teamId in data", async () => {
    await createTeamPointPurchaseOrder({
      userId: "user-admin",
      teamId: "team-1",
      creditPlanId: "tier2",
      paymentMethodId: "pm-1",
    });
    expect(generatePaymentOrder).toHaveBeenCalledWith(
      "user-admin",
      expect.objectContaining({
        type: ORDER_TYPE.BILLING_TEAM_POINT,
        amount: 600,
        credits: 700,
        data: { teamId: "team-1", creditPlanId: "tier2" },
      }),
    );
  });
});

describe("fulfillTeamPointPurchase", () => {
  const ORDER = {
    id: "order-1",
    userId: "user-admin",
    type: ORDER_TYPE.BILLING_TEAM_POINT,
    data: { teamId: "team-1", credits: 700 },
  } as unknown as Order;

  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamWalletRepo.creditPool).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: LEDGER_ROW,
    });
  });

  it("credits the pool idempotently and completes the order", async () => {
    await fulfillTeamPointPurchase(ORDER);
    expect(teamWalletRepo.creditPool).toHaveBeenCalledWith({
      teamId: "team-1",
      credits: BigInt(700),
      orderId: "order-1",
      operatorUserId: "user-admin",
      idempotencyKey: "purchase:order-1",
    });
    expect(paymentRepo.updateOrderCompleted).toHaveBeenCalledWith("order-1");
  });

  it("keeps the order un-completed when the wallet is frozen", async () => {
    asMock(teamWalletRepo.creditPool).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    await expect(fulfillTeamPointPurchase(ORDER)).rejects.toMatchObject({
      code: "TW000005",
    });
    expect(paymentRepo.updateOrderCompleted).not.toHaveBeenCalled();
  });

  it("rejects orders of the wrong type", async () => {
    await expect(
      fulfillTeamPointPurchase({
        ...ORDER,
        type: ORDER_TYPE.OEN_PAYMENT,
      } as unknown as Order),
    ).rejects.toMatchObject({ code: "TW000009" });
    expect(teamWalletRepo.creditPool).not.toHaveBeenCalled();
  });
});

describe("manageAllocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembers({
      "user-admin": "ADMIN",
      "user-viewer": "VIEWER",
      "user-2": "EDITOR",
    });
    asMock(teamWalletRepo.allocate).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: LEDGER_ROW,
    });
    asMock(teamWalletRepo.revoke).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: { ...LEDGER_ROW, amount: BigInt(-50) },
    });
  });

  it("fails fast on non-positive amounts", async () => {
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(0),
        direction: ALLOCATION_DIRECTION.ALLOCATE,
      }),
    ).rejects.toMatchObject({ code: "TW000007" });
  });

  it("rejects operators without manager roles", async () => {
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-viewer",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.ALLOCATE,
      }),
    ).rejects.toMatchObject({ code: "TW000004" });
  });

  it("requires the allocation target to be a current member", async () => {
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-gone",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.ALLOCATE,
      }),
    ).rejects.toMatchObject({ code: "TW000008" });
    expect(teamWalletRepo.allocate).not.toHaveBeenCalled();
  });

  it("returns a serialized ledger view on success", async () => {
    const view = await manageAllocation({
      teamId: "team-1",
      operatorUserId: "user-admin",
      targetUserId: "user-2",
      amount: BigInt(50),
      direction: ALLOCATION_DIRECTION.ALLOCATE,
      idempotencyKey: "alloc-1",
    });
    expect(view).toMatchObject({
      entryType: TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
      amount: "50",
      poolBalanceAfter: "650",
      allocationBalanceAfter: "50",
      createdAt: 1786075200,
    });
    expect(teamWalletRepo.allocate).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "alloc-1" }),
    );
  });

  it("maps pool shortage to TW_WALLET_INSUFFICIENT on ALLOCATE", async () => {
    asMock(teamWalletRepo.allocate).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.INSUFFICIENT,
    });
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.ALLOCATE,
      }),
    ).rejects.toMatchObject({ code: "TW000003" });
  });

  it("maps member shortage to TW_ALLOCATION_INSUFFICIENT on REVOKE", async () => {
    asMock(teamWalletRepo.revoke).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.INSUFFICIENT,
    });
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.REVOKE,
      }),
    ).rejects.toMatchObject({ code: "TW000002" });
  });

  it("surfaces a frozen wallet", async () => {
    asMock(teamWalletRepo.allocate).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.ALLOCATE,
      }),
    ).rejects.toMatchObject({ code: "TW000005" });
  });
});

describe("getTeamWalletView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembers({ "user-admin": "ADMIN", "user-viewer": "VIEWER" });
    asMock(teamWalletRepo.getWalletByTeamId).mockResolvedValue({
      id: "wallet-1",
      status: "ACTIVE",
      unallocatedBalance: BigInt(650),
    });
    asMock(teamWalletRepo.getAllocation).mockResolvedValue({
      balance: BigInt(50),
    });
    asMock(teamWalletRepo.listAllocations).mockResolvedValue([
      { userId: "user-2", balance: BigInt(50), updatedAt: new Date(0) },
    ]);
  });

  it("shows managers the full allocation table", async () => {
    const view = await getTeamWalletView({
      userId: "user-admin",
      teamId: "team-1",
    });
    expect(view.unallocatedBalance).toBe("650");
    expect(view.myAllocationBalance).toBe("50");
    expect(view.allocations).toHaveLength(1);
  });

  it("hides the pool balance and allocation table from plain members", async () => {
    const view = await getTeamWalletView({
      userId: "user-viewer",
      teamId: "team-1",
    });
    // Info: (20260809 - Luphia) 未分配池為管理職資訊：一般成員的回應不含此欄（零信任）
    expect(view.unallocatedBalance).toBeUndefined();
    expect(view.allocations).toBeUndefined();
    expect(view.myAllocationBalance).toBe("50");
    expect(teamWalletRepo.listAllocations).not.toHaveBeenCalled();
  });

  it("defaults to zero balances when the wallet does not exist yet", async () => {
    asMock(teamWalletRepo.getWalletByTeamId).mockResolvedValue(null);
    asMock(teamWalletRepo.getAllocation).mockResolvedValue(null);
    const view = await getTeamWalletView({
      userId: "user-admin",
      teamId: "team-1",
    });
    expect(view.unallocatedBalance).toBe("0");
    expect(view.myAllocationBalance).toBe("0");
  });
});

describe("revokeAllocationOnMemberRemoval", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("revokes everything with a memberId-bound idempotency key", async () => {
    asMock(teamWalletRepo.revokeAllForUser).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: LEDGER_ROW,
    });
    const result = await revokeAllocationOnMemberRemoval({
      teamId: "team-1",
      targetUserId: "user-2",
      operatorUserId: "user-admin",
      memberId: "member-9",
    });
    expect(result).toEqual({ revoked: true });
    expect(teamWalletRepo.revokeAllForUser).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "revoke-all:member-9" }),
    );
  });

  it("is a no-op when the member holds nothing", async () => {
    asMock(teamWalletRepo.revokeAllForUser).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.NOT_FOUND,
    });
    const result = await revokeAllocationOnMemberRemoval({
      teamId: "team-1",
      targetUserId: "user-2",
      operatorUserId: "user-admin",
      memberId: "member-9",
    });
    expect(result).toEqual({ revoked: false });
  });

  it("aborts member removal when the wallet is frozen", async () => {
    asMock(teamWalletRepo.revokeAllForUser).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    await expect(
      revokeAllocationOnMemberRemoval({
        teamId: "team-1",
        targetUserId: "user-2",
        operatorUserId: "user-admin",
        memberId: "member-9",
      }),
    ).rejects.toMatchObject({ code: "TW000005" });
  });
});
