import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { Prisma } from "@/generated";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import {
  ALLOCATE_OFFCHAIN_EXIT_PREFIX,
  TEAM_WALLET_ENTRY_TYPE,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => {
  const tx = {
    teamWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    teamWalletAllocation: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    teamWalletLedger: {
      findUnique: jest.fn(),
      // Info: (20260814 - Luphia) 退款守恆需查既有 REFUND 分錄（settle: / refund: 兩把衍生鍵）
      findMany: jest.fn(async () => []),
      create: jest.fn(),
    },
  };
  return {
    prisma: {
      $transaction: jest.fn(async (fn: (arg: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
      teamWalletLedger: { findUnique: jest.fn() },
    },
    txMock: tx,
  };
});

/**
 * Info: (20260807 - Luphia) 錢包 repo 原子操作單測（設計書 §5.1、P1 驗收「併發無負餘額」）。
 * 負餘額防線 = updateMany 的 WHERE balance >= amount：count 0 即不足，
 * 分錄絕不落地；P2002 競態時整筆交易回滾並回報冪等重放。
 */

interface ITxMock {
  teamWallet: {
    findUnique: ReturnType<typeof jest.fn>;
    create: ReturnType<typeof jest.fn>;
    update: ReturnType<typeof jest.fn>;
    updateMany: ReturnType<typeof jest.fn>;
  };
  teamWalletAllocation: {
    updateMany: ReturnType<typeof jest.fn>;
    findUnique: ReturnType<typeof jest.fn>;
    upsert: ReturnType<typeof jest.fn>;
  };
  teamWalletLedger: {
    findUnique: ReturnType<typeof jest.fn>;
    findMany: ReturnType<typeof jest.fn>;
    create: ReturnType<typeof jest.fn>;
  };
}

const { txMock } = jest.requireMock("@/lib/prisma") as unknown as {
  txMock: ITxMock;
};

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const ACTIVE_WALLET = { id: "wallet-1", teamId: "team-1", status: "ACTIVE" };

const CONSUME_INPUT = {
  teamId: "team-1",
  userId: "user-1",
  amount: BigInt(3),
  featureCode: "FAITH_CHAT",
  idempotencyKey: "faith:msg-1",
};

describe("TeamWalletRepository.consumeAllocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    txMock.teamWallet.findUnique.mockResolvedValue(ACTIVE_WALLET as unknown);
    txMock.teamWalletLedger.findUnique.mockResolvedValue(null);
    txMock.teamWalletAllocation.updateMany.mockResolvedValue({
      count: 1,
    } as unknown);
    txMock.teamWalletAllocation.findUnique.mockResolvedValue({
      balance: BigInt(7),
    } as unknown);
    txMock.teamWalletLedger.create.mockResolvedValue({
      id: "ledger-1",
    } as unknown);
  });

  it("returns INSUFFICIENT and writes no ledger when the conditional decrement matches nothing", async () => {
    txMock.teamWalletAllocation.updateMany.mockResolvedValue({
      count: 0,
    } as unknown);
    const result = await teamWalletRepo.consumeAllocation(CONSUME_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.INSUFFICIENT);
    expect(txMock.teamWalletLedger.create).not.toHaveBeenCalled();
  });

  it("guards the decrement with balance >= amount and records the closing balance", async () => {
    const result = await teamWalletRepo.consumeAllocation(CONSUME_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.OK);
    expect(txMock.teamWalletAllocation.updateMany).toHaveBeenCalledWith({
      where: {
        teamId: "team-1",
        userId: "user-1",
        balance: { gte: BigInt(3) },
      },
      data: { balance: { decrement: BigInt(3) } },
    });
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryType: TEAM_WALLET_ENTRY_TYPE.CONSUME,
        amount: BigInt(-3),
        allocationBalanceAfter: BigInt(7),
        idempotencyKey: "faith:msg-1",
      }),
    });
  });

  it("returns FROZEN without touching the allocation when the wallet is frozen", async () => {
    txMock.teamWallet.findUnique.mockResolvedValue({
      ...ACTIVE_WALLET,
      unallocatedBalance: BigInt(700),
      status: "FROZEN",
    } as unknown);
    const result = await teamWalletRepo.consumeAllocation(CONSUME_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.FROZEN);
    expect(txMock.teamWalletAllocation.updateMany).not.toHaveBeenCalled();
  });

  it("treats a missing or closed wallet as NO_WALLET", async () => {
    txMock.teamWallet.findUnique.mockResolvedValue(null);
    expect(
      (await teamWalletRepo.consumeAllocation(CONSUME_INPUT)).outcome,
    ).toBe(WALLET_OP_OUTCOME.NO_WALLET);

    txMock.teamWallet.findUnique.mockResolvedValue({
      ...ACTIVE_WALLET,
      status: "CLOSED",
    } as unknown);
    expect(
      (await teamWalletRepo.consumeAllocation(CONSUME_INPUT)).outcome,
    ).toBe(WALLET_OP_OUTCOME.NO_WALLET);
  });

  it("short-circuits to DUPLICATE when the idempotency key already has a ledger entry", async () => {
    txMock.teamWalletLedger.findUnique.mockResolvedValue({
      id: "ledger-existing",
    } as unknown);
    const result = await teamWalletRepo.consumeAllocation(CONSUME_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.DUPLICATE);
    expect(txMock.teamWalletAllocation.updateMany).not.toHaveBeenCalled();
  });

  it("maps a P2002 race to DUPLICATE after the transaction rolls back", async () => {
    txMock.teamWalletLedger.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique violation", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    asMock(prisma.teamWalletLedger.findUnique).mockResolvedValue({
      id: "ledger-winner",
    } as unknown);
    const result = await teamWalletRepo.consumeAllocation(CONSUME_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.DUPLICATE);
    expect(result.ledger).toEqual({ id: "ledger-winner" });
  });
});

describe("TeamWalletRepository.refundAllocation", () => {
  const ORIGINAL_CONSUME = {
    id: "ledger-1",
    teamWalletId: "wallet-1",
    entryType: TEAM_WALLET_ENTRY_TYPE.CONSUME,
    amount: BigInt(-3),
    targetUserId: "user-1",
    featureCode: "FAITH_CHAT",
    idempotencyKey: "faith:msg-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    txMock.teamWalletLedger.findUnique.mockImplementation(
      async (args: unknown) => {
        const { where } = args as { where: { idempotencyKey: string } };
        if (where.idempotencyKey === "faith:msg-1") return ORIGINAL_CONSUME;
        return null;
      },
    );
    txMock.teamWallet.findUnique.mockResolvedValue(ACTIVE_WALLET as unknown);
    txMock.teamWalletAllocation.upsert.mockResolvedValue({
      balance: BigInt(10),
    } as unknown);
    txMock.teamWalletLedger.create.mockResolvedValue({
      id: "ledger-refund",
    } as unknown);
  });

  it("writes a positive REFUND entry keyed as refund:{original}", async () => {
    const result = await teamWalletRepo.refundAllocation(
      "faith:msg-1",
      "worker",
    );
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.OK);
    expect(txMock.teamWalletAllocation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { balance: { increment: BigInt(3) } },
      }),
    );
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryType: TEAM_WALLET_ENTRY_TYPE.REFUND,
        amount: BigInt(3),
        allocationBalanceAfter: BigInt(10),
        idempotencyKey: "refund:faith:msg-1",
      }),
    });
  });

  it("returns NOT_FOUND when the original consume entry is missing", async () => {
    txMock.teamWalletLedger.findUnique.mockResolvedValue(null);
    const result = await teamWalletRepo.refundAllocation(
      "faith:none",
      "worker",
    );
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.NOT_FOUND);
    expect(txMock.teamWalletAllocation.upsert).not.toHaveBeenCalled();
  });

  it("is idempotent: an existing refund entry short-circuits to DUPLICATE", async () => {
    txMock.teamWalletLedger.findUnique.mockImplementation(
      async (args: unknown) => {
        const { where } = args as { where: { idempotencyKey: string } };
        if (where.idempotencyKey === "faith:msg-1") return ORIGINAL_CONSUME;
        if (where.idempotencyKey === "refund:faith:msg-1") {
          return { id: "ledger-refund-existing" };
        }
        return null;
      },
    );
    const result = await teamWalletRepo.refundAllocation(
      "faith:msg-1",
      "worker",
    );
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.DUPLICATE);
    expect(txMock.teamWalletAllocation.upsert).not.toHaveBeenCalled();
  });
});

describe("TeamWalletRepository.creditPool", () => {
  const CREDIT_INPUT = {
    teamId: "team-1",
    credits: BigInt(700),
    orderId: "order-1",
    operatorUserId: "user-admin",
    idempotencyKey: "purchase:order-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    txMock.teamWalletLedger.findUnique.mockResolvedValue(null);
    txMock.teamWallet.findUnique.mockResolvedValue(ACTIVE_WALLET as unknown);
    txMock.teamWallet.update.mockResolvedValue({
      ...ACTIVE_WALLET,
      unallocatedBalance: BigInt(700),
    } as unknown);
    txMock.teamWalletLedger.create.mockResolvedValue({
      id: "ledger-purchase",
    } as unknown);
  });

  it("creates the wallet on first purchase and records the pool closing balance", async () => {
    txMock.teamWallet.findUnique.mockResolvedValue(null);
    txMock.teamWallet.create.mockResolvedValue(ACTIVE_WALLET as unknown);

    const result = await teamWalletRepo.creditPool(CREDIT_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.OK);
    expect(txMock.teamWallet.create).toHaveBeenCalledWith({
      data: { teamId: "team-1" },
    });
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryType: TEAM_WALLET_ENTRY_TYPE.PURCHASE,
        amount: BigInt(700),
        poolBalanceAfter: BigInt(700),
        orderId: "order-1",
        idempotencyKey: "purchase:order-1",
      }),
    });
  });

  it("is idempotent on webhook redelivery", async () => {
    txMock.teamWalletLedger.findUnique.mockResolvedValue({
      id: "ledger-purchase",
    } as unknown);
    const result = await teamWalletRepo.creditPool(CREDIT_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.DUPLICATE);
    expect(txMock.teamWallet.update).not.toHaveBeenCalled();
  });

  it("refuses to credit a frozen wallet", async () => {
    txMock.teamWallet.findUnique.mockResolvedValue({
      ...ACTIVE_WALLET,
      status: "FROZEN",
    } as unknown);
    const result = await teamWalletRepo.creditPool(CREDIT_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.FROZEN);
    expect(txMock.teamWallet.update).not.toHaveBeenCalled();
  });
});

describe("TeamWalletRepository.allocate / revoke", () => {
  const ALLOC_INPUT = {
    teamId: "team-1",
    targetUserId: "user-2",
    amount: BigInt(50),
    operatorUserId: "user-admin",
    idempotencyKey: "alloc-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    txMock.teamWallet.findUnique.mockResolvedValue({
      ...ACTIVE_WALLET,
      unallocatedBalance: BigInt(700),
    } as unknown);
    txMock.teamWalletLedger.findUnique.mockResolvedValue(null);
    txMock.teamWallet.updateMany.mockResolvedValue({ count: 1 } as unknown);
    txMock.teamWalletAllocation.upsert.mockResolvedValue({
      balance: BigInt(50),
    } as unknown);
    txMock.teamWalletLedger.create.mockResolvedValue({
      id: "ledger-alloc",
    } as unknown);
  });

  /**
   * Info: (20260814 - Luphia) 分配改為鑄到成員鏈上錢包（ADR 015 修訂）：
   * repo 只負責池的條件扣款與分錄，**不再寫離鏈的 TeamWalletAllocation**。
   */
  it("allocates with a conditional pool decrement and no off-chain allocation row", async () => {
    txMock.teamWallet.findUnique
      .mockResolvedValueOnce({
        ...ACTIVE_WALLET,
        unallocatedBalance: BigInt(700),
      } as unknown)
      .mockResolvedValueOnce({
        ...ACTIVE_WALLET,
        unallocatedBalance: BigInt(650),
      } as unknown);

    const result = await teamWalletRepo.allocate(ALLOC_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.OK);
    expect(txMock.teamWallet.updateMany).toHaveBeenCalledWith({
      where: { id: "wallet-1", unallocatedBalance: { gte: BigInt(50) } },
      data: { unallocatedBalance: { decrement: BigInt(50) } },
    });
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryType: TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
        amount: BigInt(50),
        poolBalanceAfter: BigInt(650),
        targetUserId: "user-2",
      }),
    });
    // Info: (20260814 - Luphia) 點數在鏈上，不再有第二套離鏈餘額
    expect(txMock.teamWalletAllocation.upsert).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260818 - Luphia) 分配必須同時記一筆負的 ADJUST：價值離開了離鏈帳本。
   *
   * 少了這一筆，守恆恆等式的右側少了分配金額而左側不動——**按一次「分配」就足以
   * 讓下一輪勾稽凍結錢包**。這條先前不存在，於是那個缺陷在全綠的狀態下上線。
   *
   * 斷言兩件事：金額為負、且冪等鍵是從原鍵推導的（配對得起來，修復腳本才分得出
   * 哪些 ALLOCATE 已經有出帳分錄）。
   */
  it("pairs every allocation with a negative ADJUST for the off-chain exit", async () => {
    txMock.teamWallet.findUnique
      .mockResolvedValueOnce({
        ...ACTIVE_WALLET,
        unallocatedBalance: BigInt(700),
      } as unknown)
      .mockResolvedValueOnce({
        ...ACTIVE_WALLET,
        unallocatedBalance: BigInt(650),
      } as unknown);

    await teamWalletRepo.allocate(ALLOC_INPUT);

    expect(txMock.teamWalletLedger.create).toHaveBeenCalledTimes(2);
    expect(txMock.teamWalletLedger.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        amount: BigInt(-50),
        idempotencyKey: `${ALLOCATE_OFFCHAIN_EXIT_PREFIX}alloc-1`,
        targetUserId: "user-2",
      }),
    });
  });

  /**
   * Info: (20260818 - Luphia) 兩筆必須在**同一個交易**裡。
   *
   * 分開寫的話，中間掛掉就留下「池扣了、ALLOCATE 記了、出帳沒記」的狀態——
   * 那正是這次要修的缺陷，只是換成偶發、更難查。這裡的證據是：只開了一次交易，
   * 而上一條已經斷言兩筆 create 都走在那個交易的 client 上。
   */
  it("writes both entries inside the same transaction", async () => {
    await teamWalletRepo.allocate(ALLOC_INPUT);

    expect(asMock(prisma.$transaction)).toHaveBeenCalledTimes(1);
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledTimes(2);
  });

  it("returns INSUFFICIENT when the pool cannot cover the allocation", async () => {
    txMock.teamWallet.updateMany.mockResolvedValue({ count: 0 } as unknown);
    const result = await teamWalletRepo.allocate(ALLOC_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.INSUFFICIENT);
    expect(txMock.teamWalletLedger.create).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260814 - Luphia) 收回＝銷毀成員鏈上點數再回補池（ADR 015 修訂）：
   * 銷毀由 service 在交易外完成，repo 只回補池、記分錄，並保存那筆銷毀交易的雜湊。
   */
  it("revokes by refilling the pool and recording the burn transaction", async () => {
    txMock.teamWallet.update.mockResolvedValue({
      ...ACTIVE_WALLET,
      unallocatedBalance: BigInt(750),
    } as unknown);

    const result = await teamWalletRepo.revoke({
      ...ALLOC_INPUT,
      txHash: "0xburn",
    });

    expect(result.outcome).toBe(WALLET_OP_OUTCOME.OK);
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryType: TEAM_WALLET_ENTRY_TYPE.REVOKE,
        amount: BigInt(-50),
        poolBalanceAfter: BigInt(750),
        txHash: "0xburn",
      }),
    });
    // Info: (20260814 - Luphia) 不再扣離鏈分配餘額——那套餘額已經不存在
    expect(txMock.teamWalletAllocation.updateMany).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260818 - Luphia) 成員移除時沖銷分配餘額（產品決定 20260818）。
 *
 * 這一組原本測的是「收回到池」，而那個行為會**造出點數**：分配當下已經鑄進
 * 成員自己的鏈上錢包，而移出那個錢包需要持有人簽章（被移除的成員不會去簽），
 * 池子卻又拿回可以再鑄一次的額度。
 */
describe("TeamWalletRepository.writeOffAllocationForUser", () => {
  const WRITE_OFF_INPUT = {
    teamId: "team-1",
    targetUserId: "user-2",
    operatorUserId: "user-admin",
    idempotencyKey: "write-off:member-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    txMock.teamWalletAllocation.findUnique.mockResolvedValue({
      balance: BigInt(30),
    } as unknown);
    // Info: (20260818 - Luphia) 池餘額給明確值，分錄才驗得出「池沒有變」
    txMock.teamWallet.findUnique.mockResolvedValue({
      ...ACTIVE_WALLET,
      unallocatedBalance: BigInt(700),
    } as unknown);
    txMock.teamWalletLedger.findUnique.mockResolvedValue(null);
    txMock.teamWalletAllocation.updateMany.mockResolvedValue({
      count: 1,
    } as unknown);
    txMock.teamWalletLedger.create.mockResolvedValue({
      id: "ledger-write-off",
    } as unknown);
  });

  it("歸零分配並寫一筆負的 ADJUST 分錄", async () => {
    const result =
      await teamWalletRepo.writeOffAllocationForUser(WRITE_OFF_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.OK);
    expect(txMock.teamWalletAllocation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { balance: { decrement: BigInt(30) } },
      }),
    );
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        /**
         * Info: (20260818 - Luphia) 型別必須是 ADJUST 而不是 REVOKE：
         * `REVOKE` 在守恆恆等式裡被排除（它只是池與分配之間的搬動，淨額為零），
         * 而這裡的價值是離開帳本。記成 REVOKE 會讓
         * `Σ(PURCHASE + ADJUST + CONSUME + REFUND) = 池 + Σ分配` 的左側不動、
         * 右側少了這一筆，下一輪勾稽就會判為違反守恆並**凍結錢包**。
         */
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        amount: BigInt(-30),
        allocationBalanceAfter: BigInt(0),
        idempotencyKey: "write-off:member-1",
      }),
    });
  });

  /**
   * Info: (20260818 - Luphia) 本組最重要的一條：**池餘額不變**。
   *
   * 加回池等於同一筆價值存在兩份——成員錢包裡的鏈上點數，
   * 加上團隊可以再分配（再鑄一次）的額度。
   */
  it("不把金額加回未分配池", async () => {
    await teamWalletRepo.writeOffAllocationForUser(WRITE_OFF_INPUT);
    expect(txMock.teamWallet.update).not.toHaveBeenCalled();
  });

  // Info: (20260818 - Luphia) 分錄仍記下當下的池餘額（未變動），對帳才有得比
  it("分錄記的是未變動的池餘額", async () => {
    await teamWalletRepo.writeOffAllocationForUser(WRITE_OFF_INPUT);
    expect(txMock.teamWalletLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        poolBalanceAfter: BigInt(700),
      }),
    });
  });

  // Info: (20260818 - Luphia) 重試安全：同一個 memberId 只會沖銷一次
  it("同一個冪等鍵只沖銷一次", async () => {
    txMock.teamWalletLedger.findUnique.mockResolvedValue({
      id: "ledger-write-off",
    } as unknown);
    const result =
      await teamWalletRepo.writeOffAllocationForUser(WRITE_OFF_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.DUPLICATE);
    expect(txMock.teamWalletAllocation.updateMany).not.toHaveBeenCalled();
  });

  it("is a no-op (NOT_FOUND) when the member has no allocation", async () => {
    txMock.teamWalletAllocation.findUnique.mockResolvedValue(null);
    const result =
      await teamWalletRepo.writeOffAllocationForUser(WRITE_OFF_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.NOT_FOUND);
    expect(txMock.teamWalletAllocation.updateMany).not.toHaveBeenCalled();
  });

  it("blocks on a frozen wallet so member removal aborts", async () => {
    txMock.teamWallet.findUnique.mockResolvedValue({
      ...ACTIVE_WALLET,
      status: "FROZEN",
    } as unknown);
    const result =
      await teamWalletRepo.writeOffAllocationForUser(WRITE_OFF_INPUT);
    expect(result.outcome).toBe(WALLET_OP_OUTCOME.FROZEN);
    expect(txMock.teamWalletAllocation.updateMany).not.toHaveBeenCalled();
  });
});
