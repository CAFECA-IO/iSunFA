import { prisma } from "@/lib/prisma";
import { Prisma, PointLedger } from "@/generated";
import {
  POINT_LEDGER_OUTCOME,
  PointLedgerEntryType,
  PointLedgerOutcome,
} from "@/constants/point_ledger";

/**
 * Info: (20261015 - Luphia) 個人點數帳本 Repository（區塊鏈退役）。
 *
 * 帳本鐵律：
 * 1. `PointLedger` append-only，嚴禁 UPDATE / DELETE。
 * 2. 出帳走條件更新（WHERE point_balance >= amount），併發下不會出現負餘額；
 *    只有復原指令重建歷史時可以 `allowNegative`（歷史順序與當時鏈上順序不一定相同）。
 * 3. 餘額快取與分錄在同一筆交易內寫入；冪等鍵撞到 P2002 時整筆回滾、回報 DUPLICATE。
 */

export interface IPointLedgerEntryInput {
  userId: string;
  // Info: (20261015 - Luphia) 有號數：入帳為正、出帳為負
  amount: bigint;
  entryType: PointLedgerEntryType;
  idempotencyKey: string;
  orderId?: string | null;
  sourceRef?: string | null;
  note?: string | null;
  allowNegative?: boolean;
}

export interface IPointLedgerResult {
  outcome: PointLedgerOutcome;
  entry?: PointLedger;
  balanceAfter?: bigint;
}

class InsufficientPointsSignal extends Error {}
class UserMissingSignal extends Error {}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function applyPointEntryInTx(
  tx: Prisma.TransactionClient,
  input: IPointLedgerEntryInput,
): Promise<IPointLedgerResult> {
  const duplicated = await tx.pointLedger.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (duplicated) {
    return {
      outcome: POINT_LEDGER_OUTCOME.DUPLICATE,
      entry: duplicated,
      balanceAfter: duplicated.balanceAfter,
    };
  }

  const isDebit = input.amount < BigInt(0);
  if (isDebit && !input.allowNegative) {
    const updated = await tx.user.updateMany({
      where: { id: input.userId, pointBalance: { gte: -input.amount } },
      data: { pointBalance: { increment: input.amount } },
    });
    if (updated.count === 0) {
      const exists = await tx.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!exists) throw new UserMissingSignal();
      throw new InsufficientPointsSignal();
    }
  } else {
    const updated = await tx.user.updateMany({
      where: { id: input.userId },
      data: { pointBalance: { increment: input.amount } },
    });
    if (updated.count === 0) throw new UserMissingSignal();
  }

  const user = await tx.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { pointBalance: true },
  });

  const entry = await tx.pointLedger.create({
    data: {
      userId: input.userId,
      entryType: input.entryType,
      amount: input.amount,
      balanceAfter: user.pointBalance,
      orderId: input.orderId ?? null,
      sourceRef: input.sourceRef ?? null,
      note: input.note ?? null,
      idempotencyKey: input.idempotencyKey,
    },
  });

  return {
    outcome: POINT_LEDGER_OUTCOME.OK,
    entry,
    balanceAfter: user.pointBalance,
  };
}

export class PointLedgerRepository {
  /**
   * Info: (20261015 - Luphia) 單筆入帳／出帳，自帶交易。
   * 已在交易內的呼叫端（例如付款 webhook）請直接用 `applyPointEntryInTx`。
   */
  async applyEntry(input: IPointLedgerEntryInput): Promise<IPointLedgerResult> {
    try {
      return await prisma.$transaction((tx) => applyPointEntryInTx(tx, input));
    } catch (error) {
      if (error instanceof InsufficientPointsSignal) {
        return { outcome: POINT_LEDGER_OUTCOME.INSUFFICIENT };
      }
      if (error instanceof UserMissingSignal) {
        return { outcome: POINT_LEDGER_OUTCOME.USER_NOT_FOUND };
      }
      if (isUniqueConstraintError(error)) {
        const entry = await prisma.pointLedger.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        return {
          outcome: POINT_LEDGER_OUTCOME.DUPLICATE,
          entry: entry ?? undefined,
          balanceAfter: entry?.balanceAfter,
        };
      }
      throw error;
    }
  }

  async getBalance(userId: string): Promise<bigint> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointBalance: true },
    });
    return user?.pointBalance ?? BigInt(0);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PointLedger | null> {
    return prisma.pointLedger.findUnique({ where: { idempotencyKey } });
  }

  async listByUser(userId: string): Promise<PointLedger[]> {
    return prisma.pointLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // Info: (20261015 - Luphia) 帳本加總，供勾稽 `User.pointBalance` 快取
  async sumByUser(userId: string): Promise<bigint> {
    const agg = await prisma.pointLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? BigInt(0);
  }
}

export const pointLedgerRepo = new PointLedgerRepository();
