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
import { issuePurchasedPointsToMember } from "@/services/member.service";
import { burn } from "@/services/token.service";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { publicClient } from "@/lib/viem_public";
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
    // Info: (20260814 - Luphia) 分配上鏈後新增：回填交易雜湊、鑄造失敗補償、淨分配上限
    setLedgerTxHash: jest.fn(),
    compensateFailedAllocation: jest.fn(),
    sumNetAllocatedToMember: jest.fn(),
  },
}));
// Info: (20260814 - Luphia) 分配要鑄到成員的鏈上位址，收回要銷毀
jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserById: jest.fn(async () => ({ address: "0xmember" })),
  },
}));
jest.mock("@/services/member.service", () => ({
  issuePurchasedPointsToMember: jest.fn(async () => ({
    success: true,
    message: "ok",
    data: { tx: "0xmint" },
  })),
}));
/**
 * Info: (20260814 - Luphia) 合約位址與鏈上讀取都要替身：CI 沒有
 * NEXT_PUBLIC_CREDIT_POINT_ADDRESS，真實值是 undefined——這正是 CI 抓到的問題
 * （斷言收到 undefined 位址）。同時也讓「成員餘額不足」這條分支可被測。
 */
jest.mock("@/config/contracts", () => ({
  CONTRACT_ADDRESSES: { CREDIT_POINT: "0xcreditpoint" },
  ABIS: { CREDIT_POINT: [] },
}));
jest.mock("@/lib/viem_public", () => ({
  publicClient: { readContract: jest.fn() },
}));
jest.mock("@/services/token.service", () => ({
  burn: jest.fn(async () => ({
    success: true,
    message: "ok",
    data: { tx: "0xburn" },
  })),
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
        teamId: "team-1",
        data: { creditPlanId: "tier2" },
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
    // Info: (20260814 - Luphia) 預設淨分配量足夠，個別測試再覆寫
    asMock(teamWalletRepo.sumNetAllocatedToMember).mockResolvedValue(
      BigInt(100),
    );
    /**
     * Info: (20260814 - Luphia) 鏈上替身的預設值也要逐案重設：
     * clearAllMocks 不會清掉 mockResolvedValue 設下的實作，
     * 少了這幾行，某一個測試設的「鑄造失敗」會漏到後面每一個測試。
     */
    asMock(webAuthnRepo.findUserById).mockResolvedValue({
      address: "0xmember",
    });
    asMock(issuePurchasedPointsToMember).mockResolvedValue({
      success: true,
      message: "ok",
      data: { tx: "0xmint" },
    });
    asMock(burn).mockResolvedValue({
      success: true,
      message: "ok",
      data: { tx: "0xburn" },
    });
    // Info: (20260814 - Luphia) 鏈上餘額以 18 位小數計；預設 100 點，足夠收回
    asMock(publicClient.readContract).mockResolvedValue(
      BigInt(100) * BigInt(10) ** BigInt(18),
    );
  });

  /**
   * Info: (20260814 - Luphia) 分配＝鑄到成員自己的區塊鏈錢包（ADR 015 修訂，
   * 產品拍板 20260814）。點數從此是他的個人點數，不再有只能在團隊內花的第二套餘額。
   */
  it("mints the points into the member's own wallet", async () => {
    await manageAllocation({
      teamId: "team-1",
      operatorUserId: "user-admin",
      targetUserId: "user-2",
      amount: BigInt(50),
      direction: ALLOCATION_DIRECTION.ALLOCATE,
    });

    expect(issuePurchasedPointsToMember).toHaveBeenCalledWith("0xmember", 50);
    expect(teamWalletRepo.setLedgerTxHash).toHaveBeenCalledWith(
      "ledger-1",
      "0xmint",
    );
  });

  /**
   * Info: (20260814 - Luphia) 鑄造失敗必須把點數退回池：
   * 池已經扣過了，不補回去就是團隊平白少一筆點數，而且沒有任何流程會發現。
   */
  it("refunds the pool when the mint fails", async () => {
    asMock(issuePurchasedPointsToMember).mockResolvedValue({
      success: false,
      message: "rpc down",
    });

    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.ALLOCATE,
      }),
    ).rejects.toMatchObject({ code: "TW000009" });

    expect(teamWalletRepo.compensateFailedAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-1", amount: BigInt(50) }),
    );
  });

  // Info: (20260814 - Luphia) 沒有錢包位址就無處可鑄，當場擋下而不是扣了池才發現
  it("refuses to allocate to a member without a wallet address", async () => {
    asMock(webAuthnRepo.findUserById).mockResolvedValue({ address: null });

    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.ALLOCATE,
      }),
    ).rejects.toMatchObject({ code: "TW000014" });

    expect(teamWalletRepo.allocate).not.toHaveBeenCalled();
  });

  // Info: (20260814 - Luphia) 收回＝銷毀成員鏈上點數，再回補池
  it("burns the member's points when revoking", async () => {
    await manageAllocation({
      teamId: "team-1",
      operatorUserId: "user-admin",
      targetUserId: "user-2",
      amount: BigInt(50),
      direction: ALLOCATION_DIRECTION.REVOKE,
    });

    expect(burn).toHaveBeenCalledWith("0xcreditpoint", "0xmember", 50);
    expect(teamWalletRepo.revoke).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: "0xburn" }),
    );
  });

  /**
   * Info: (20260814 - Luphia) 收回上限＝團隊淨分配量。
   *
   * 點數進了成員錢包後，與他自費購買的混在同一個餘額裡、鏈上分不出來；
   * 沒有這道上限，團隊就能銷毀成員自己買的點數——那是別人的資產。
   */
  it("never burns more than the team actually allocated", async () => {
    asMock(teamWalletRepo.sumNetAllocatedToMember).mockResolvedValue(
      BigInt(20),
    );

    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.REVOKE,
      }),
      // Info: (20260814 - Luphia) TW000002 = TW_ALLOCATION_INSUFFICIENT
    ).rejects.toMatchObject({ code: "TW000002" });

    expect(burn).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 成員已經把點數用掉時，收回必須明說收不回來，
   * 而不是回一個看起來像系統故障的錯誤。餘額檢查在銷毀之前，因此不會白打一次鏈上交易。
   */
  it("reports insufficiency when the member has already spent the points", async () => {
    asMock(publicClient.readContract).mockResolvedValue(BigInt(0));

    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.REVOKE,
      }),
    ).rejects.toMatchObject({ code: "TW000002" });

    expect(burn).not.toHaveBeenCalled();
  });

  // Info: (20260814 - Luphia) 鏈上操作失敗＝系統異常（TW000009），不是用戶的餘額問題
  it("reports an operation failure when the burn itself fails", async () => {
    asMock(burn).mockResolvedValue({ success: false, message: "rpc down" });

    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.REVOKE,
      }),
    ).rejects.toMatchObject({ code: "TW000009" });

    expect(teamWalletRepo.revoke).not.toHaveBeenCalled();
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
