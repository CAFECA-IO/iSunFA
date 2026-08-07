import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { Prisma } from "@/generated";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import {
  TEAM_WALLET_ENTRY_TYPE,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => {
  const tx = {
    teamWallet: { findUnique: jest.fn() },
    teamWalletAllocation: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    teamWalletLedger: { findUnique: jest.fn(), create: jest.fn() },
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
  teamWallet: { findUnique: ReturnType<typeof jest.fn> };
  teamWalletAllocation: {
    updateMany: ReturnType<typeof jest.fn>;
    findUnique: ReturnType<typeof jest.fn>;
    upsert: ReturnType<typeof jest.fn>;
  };
  teamWalletLedger: {
    findUnique: ReturnType<typeof jest.fn>;
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
