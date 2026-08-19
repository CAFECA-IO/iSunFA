import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import {
  createTeamPointPurchaseOrder,
  fulfillTeamPointPurchase,
  getTeamWalletView,
  manageAllocation,
  writeOffAllocationOnMemberRemoval,
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
    writeOffAllocationForUser: jest.fn(),
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

  /**
   * Info: (20260818 - Luphia) 收回已停用（產品決定 20260818）。
   *
   * 原因是移出成員錢包必須有**持有人簽章**，而收回的對象不會去簽——不是缺一個平台
   * 可呼叫的 `burn(address, uint256)`（扣款那條路以持有人簽章做到了）。
   * 條款 §3.5 已改為「分配後不可收回」。
   *
   * 這裡原本有四條測試描述收回的行為（上限為淨分配量、已花掉即收不回、
   * 鏈上失敗回 TW000009…），那些路徑現在都到不了，留著只會讓人以為功能還在。
   */
  it("rejects revoking with an explicit disabled error", async () => {
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.REVOKE,
      }),
      // Info: (20260818 - Luphia) TW000020 = TW_ALLOCATION_REVOKE_DISABLED
    ).rejects.toMatchObject({ code: "TW000020" });
  });

  /**
   * Info: (20260818 - Luphia) 擋在動任何餘額之前：走到底會先讀淨分配量、
   * 再讀鏈上餘額，中間任何一步的錯誤都會蓋掉「已停用」這個真正的原因。
   */
  it("does not touch balances or the chain when revoking", async () => {
    await expect(
      manageAllocation({
        teamId: "team-1",
        operatorUserId: "user-admin",
        targetUserId: "user-2",
        amount: BigInt(50),
        direction: ALLOCATION_DIRECTION.REVOKE,
      }),
    ).rejects.toThrow();

    expect(teamWalletRepo.sumNetAllocatedToMember).not.toHaveBeenCalled();
    expect(burn).not.toHaveBeenCalled();
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

/**
 * Info: (20260818 - Luphia) 成員移除時沖銷分配（產品決定 20260818）：
 * 歸零但不回池——收回做不到（移出成員錢包需持有人簽章，而他不會去簽），
 * 加回池會讓同一筆價值存在兩份。
 */
describe("writeOffAllocationOnMemberRemoval", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("以綁 memberId 的冪等鍵沖銷全額", async () => {
    asMock(teamWalletRepo.writeOffAllocationForUser).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.OK,
      ledger: LEDGER_ROW,
    });
    const result = await writeOffAllocationOnMemberRemoval({
      teamId: "team-1",
      targetUserId: "user-2",
      operatorUserId: "user-admin",
      memberId: "member-9",
    });
    expect(result).toEqual({ writtenOff: true });
    expect(teamWalletRepo.writeOffAllocationForUser).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "write-off:member-9" }),
    );
  });

  it("is a no-op when the member holds nothing", async () => {
    asMock(teamWalletRepo.writeOffAllocationForUser).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.NOT_FOUND,
    });
    const result = await writeOffAllocationOnMemberRemoval({
      teamId: "team-1",
      targetUserId: "user-2",
      operatorUserId: "user-admin",
      memberId: "member-9",
    });
    expect(result).toEqual({ writtenOff: false });
  });

  it("aborts member removal when the wallet is frozen", async () => {
    asMock(teamWalletRepo.writeOffAllocationForUser).mockResolvedValue({
      outcome: WALLET_OP_OUTCOME.FROZEN,
    });
    await expect(
      writeOffAllocationOnMemberRemoval({
        teamId: "team-1",
        targetUserId: "user-2",
        operatorUserId: "user-admin",
        memberId: "member-9",
      }),
    ).rejects.toMatchObject({ code: "TW000005" });
  });
});
