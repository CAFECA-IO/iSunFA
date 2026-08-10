import { prisma } from "@/lib/prisma";
import {
  Prisma,
  TeamWallet,
  TeamWalletAllocation,
  TeamWalletLedger,
} from "@/generated";
import {
  TEAM_WALLET_ENTRY_TYPE,
  TEAM_WALLET_STATUS,
  WALLET_OP_OUTCOME,
  WalletOpOutcome,
} from "@/constants/subscription_quota";

/**
 * Info: (20260807 - Luphia) 團隊錢包 Repository（設計書 §3.1 / §5.1）。
 * 帳本鐵律：
 * 1. TeamWalletLedger 為 append-only，嚴禁 UPDATE / DELETE，更正只寫反向分錄。
 * 2. 所有出帳走「條件更新」（WHERE balance >= amount），併發下絕不出現負餘額。
 * 3. 每筆分錄記期末餘額（balanceAfter），供每日守恆勾稽與 merkle 錨定。
 * 4. 冪等由 idempotencyKey @unique 保證；競態命中 P2002 時整筆交易回滾並回報 DUPLICATE。
 */

export interface IConsumeAllocationInput {
  teamId: string;
  userId: string;
  amount: bigint;
  featureCode: string;
  idempotencyKey: string;
}

export interface IWalletOpResult {
  outcome: WalletOpOutcome;
  ledger?: TeamWalletLedger;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export interface ICreditPoolInput {
  teamId: string;
  credits: bigint;
  orderId: string;
  operatorUserId: string;
  idempotencyKey: string;
}

export interface IAllocationOpInput {
  teamId: string;
  targetUserId: string;
  amount: bigint;
  operatorUserId: string;
  idempotencyKey: string;
}

/**
 * Info: (20260807 - Luphia) 購點入池（設計書 §6.1）。以 TransactionClient 形式導出，
 * 讓 OEN webhook 的 processOenPayment 能在「同一筆」付款交易內原子入帳；
 * 錢包不存在時建立（首購），FROZEN 時拒絕入帳（訂單停在 PAID 供人工介入）。
 */
export async function creditPoolInTx(
  tx: Prisma.TransactionClient,
  input: ICreditPoolInput,
): Promise<IWalletOpResult> {
  const { teamId, credits, orderId, operatorUserId, idempotencyKey } = input;

  const duplicated = await tx.teamWalletLedger.findUnique({
    where: { idempotencyKey },
  });
  if (duplicated) {
    return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger: duplicated };
  }

  let wallet = await tx.teamWallet.findUnique({ where: { teamId } });
  if (wallet && wallet.status !== TEAM_WALLET_STATUS.ACTIVE) {
    return { outcome: WALLET_OP_OUTCOME.FROZEN };
  }
  if (!wallet) {
    wallet = await tx.teamWallet.create({ data: { teamId } });
  }

  const updatedWallet = await tx.teamWallet.update({
    where: { id: wallet.id },
    data: { unallocatedBalance: { increment: credits } },
  });

  const ledger = await tx.teamWalletLedger.create({
    data: {
      teamWalletId: wallet.id,
      entryType: TEAM_WALLET_ENTRY_TYPE.PURCHASE,
      amount: credits,
      poolBalanceAfter: updatedWallet.unallocatedBalance,
      operatorUserId,
      orderId,
      idempotencyKey,
    },
  });

  return { outcome: WALLET_OP_OUTCOME.OK, ledger };
}

export class TeamWalletRepository {
  async getWalletByTeamId(teamId: string): Promise<TeamWallet | null> {
    return prisma.teamWallet.findUnique({ where: { teamId } });
  }

  async getAllocation(
    teamId: string,
    userId: string,
  ): Promise<TeamWalletAllocation | null> {
    return prisma.teamWalletAllocation.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
  }

  async findLedgerByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<TeamWalletLedger | null> {
    return prisma.teamWalletLedger.findUnique({ where: { idempotencyKey } });
  }

  /**
   * Info: (20260807 - Luphia) 消耗成員分配點數（扣費管線第二層，設計書 §5）。
   * 單一 $transaction：狀態檢查 → 條件扣款 → 讀期末餘額 → 寫 CONSUME 分錄。
   * updateMany 的 WHERE balance >= amount 是負餘額防線；count === 0 即餘額不足，Fail Fast。
   */
  async consumeAllocation(
    input: IConsumeAllocationInput,
  ): Promise<IWalletOpResult> {
    const { teamId, userId, amount, featureCode, idempotencyKey } = input;
    try {
      return await prisma.$transaction(async (tx) => {
        const wallet = await tx.teamWallet.findUnique({ where: { teamId } });
        if (!wallet || wallet.status === TEAM_WALLET_STATUS.CLOSED) {
          return { outcome: WALLET_OP_OUTCOME.NO_WALLET };
        }
        if (wallet.status !== TEAM_WALLET_STATUS.ACTIVE) {
          return { outcome: WALLET_OP_OUTCOME.FROZEN };
        }

        const duplicated = await tx.teamWalletLedger.findUnique({
          where: { idempotencyKey },
        });
        if (duplicated) {
          return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger: duplicated };
        }

        const updated = await tx.teamWalletAllocation.updateMany({
          where: { teamId, userId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (updated.count === 0) {
          return { outcome: WALLET_OP_OUTCOME.INSUFFICIENT };
        }

        const allocation = await tx.teamWalletAllocation.findUnique({
          where: { teamId_userId: { teamId, userId } },
        });

        const ledger = await tx.teamWalletLedger.create({
          data: {
            teamWalletId: wallet.id,
            entryType: TEAM_WALLET_ENTRY_TYPE.CONSUME,
            amount: -amount,
            allocationBalanceAfter: allocation?.balance ?? BigInt(0),
            targetUserId: userId,
            operatorUserId: userId,
            featureCode,
            idempotencyKey,
          },
        });

        return { outcome: WALLET_OP_OUTCOME.OK, ledger };
      });
    } catch (error) {
      /**
       * Info: (20260807 - Luphia) 併發下兩個交易同時通過 dedupe 檢查時，
       * 後者在寫分錄時命中 P2002，整筆交易（含扣款）已回滾，安全回報冪等重放
       */
      if (isUniqueConstraintError(error)) {
        const ledger = await this.findLedgerByIdempotencyKey(idempotencyKey);
        if (ledger) return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger };
      }
      throw error;
    }
  }

  /**
   * Info: (20260807 - Luphia) 退還已消耗的分配點數（失敗補償，設計書 §5.2）。
   * 以原始 CONSUME 分錄為源，退款分錄鍵為 refund:{原鍵}，天然冪等。
   */
  async refundAllocation(
    idempotencyKey: string,
    operatorUserId: string,
  ): Promise<IWalletOpResult> {
    return this.refundAllocationCore(
      idempotencyKey,
      `refund:${idempotencyKey}`,
      operatorUserId,
    );
  }

  /**
   * Info: (20260807 - Luphia) 部分退款（預扣—結算的退差額路徑，設計書 §5.3）：
   * 退款分錄鍵為 settle:{原鍵}，金額不得超過原始消耗，超過即 Fail Fast。
   */
  async refundAllocationPartial(
    idempotencyKey: string,
    amount: bigint,
    operatorUserId: string,
  ): Promise<IWalletOpResult> {
    return this.refundAllocationCore(
      idempotencyKey,
      `settle:${idempotencyKey}`,
      operatorUserId,
      amount,
    );
  }

  private async refundAllocationCore(
    idempotencyKey: string,
    refundKey: string,
    operatorUserId: string,
    amountOverride?: bigint,
  ): Promise<IWalletOpResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const original = await tx.teamWalletLedger.findUnique({
          where: { idempotencyKey },
        });
        if (
          !original ||
          original.entryType !== TEAM_WALLET_ENTRY_TYPE.CONSUME ||
          !original.targetUserId
        ) {
          return { outcome: WALLET_OP_OUTCOME.NOT_FOUND };
        }

        const wallet = await tx.teamWallet.findUnique({
          where: { id: original.teamWalletId },
        });
        if (!wallet) return { outcome: WALLET_OP_OUTCOME.NO_WALLET };
        if (wallet.status !== TEAM_WALLET_STATUS.ACTIVE) {
          return { outcome: WALLET_OP_OUTCOME.FROZEN };
        }

        const duplicated = await tx.teamWalletLedger.findUnique({
          where: { idempotencyKey: refundKey },
        });
        if (duplicated) {
          return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger: duplicated };
        }

        // Info: (20260807 - Luphia) CONSUME 分錄 amount 為負值，全額退還取其絕對值
        const maxRefundable = -original.amount;
        const refundAmount = amountOverride ?? maxRefundable;
        if (refundAmount <= BigInt(0) || refundAmount > maxRefundable) {
          return { outcome: WALLET_OP_OUTCOME.INSUFFICIENT };
        }

        const allocation = await tx.teamWalletAllocation.upsert({
          where: {
            teamId_userId: {
              teamId: wallet.teamId,
              userId: original.targetUserId,
            },
          },
          update: { balance: { increment: refundAmount } },
          create: {
            teamId: wallet.teamId,
            userId: original.targetUserId,
            balance: refundAmount,
          },
        });

        const ledger = await tx.teamWalletLedger.create({
          data: {
            teamWalletId: wallet.id,
            entryType: TEAM_WALLET_ENTRY_TYPE.REFUND,
            amount: refundAmount,
            allocationBalanceAfter: allocation.balance,
            targetUserId: original.targetUserId,
            operatorUserId,
            featureCode: original.featureCode,
            idempotencyKey: refundKey,
          },
        });

        return { outcome: WALLET_OP_OUTCOME.OK, ledger };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const ledger = await this.findLedgerByIdempotencyKey(refundKey);
        if (ledger) return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger };
      }
      throw error;
    }
  }

  /**
   * Info: (20260807 - Luphia) 購點入池的獨立交易版本（綁卡直扣的 checkout 履行路徑用）
   */
  async creditPool(input: ICreditPoolInput): Promise<IWalletOpResult> {
    try {
      return await prisma.$transaction(async (tx) => creditPoolInTx(tx, input));
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const ledger = await this.findLedgerByIdempotencyKey(
          input.idempotencyKey,
        );
        if (ledger) return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger };
      }
      throw error;
    }
  }

  /**
   * Info: (20260807 - Luphia) 池 → 成員分配（設計書 §6.2）。
   * 池的條件扣款（unallocatedBalance >= amount）為負餘額防線；
   * ALLOCATE / REVOKE 為池與分配間的內部移轉，不影響守恆恆等式左側，
   * 分錄同時記 poolBalanceAfter 與 allocationBalanceAfter 供勾稽。
   */
  async allocate(input: IAllocationOpInput): Promise<IWalletOpResult> {
    const { teamId, targetUserId, amount, operatorUserId, idempotencyKey } =
      input;
    try {
      return await prisma.$transaction(async (tx) => {
        const wallet = await tx.teamWallet.findUnique({ where: { teamId } });
        if (!wallet || wallet.status === TEAM_WALLET_STATUS.CLOSED) {
          return { outcome: WALLET_OP_OUTCOME.NO_WALLET };
        }
        if (wallet.status !== TEAM_WALLET_STATUS.ACTIVE) {
          return { outcome: WALLET_OP_OUTCOME.FROZEN };
        }

        const duplicated = await tx.teamWalletLedger.findUnique({
          where: { idempotencyKey },
        });
        if (duplicated) {
          return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger: duplicated };
        }

        const updated = await tx.teamWallet.updateMany({
          where: { id: wallet.id, unallocatedBalance: { gte: amount } },
          data: { unallocatedBalance: { decrement: amount } },
        });
        if (updated.count === 0) {
          return { outcome: WALLET_OP_OUTCOME.INSUFFICIENT };
        }

        const allocation = await tx.teamWalletAllocation.upsert({
          where: { teamId_userId: { teamId, userId: targetUserId } },
          update: { balance: { increment: amount } },
          create: { teamId, userId: targetUserId, balance: amount },
        });
        const walletAfter = await tx.teamWallet.findUnique({
          where: { id: wallet.id },
        });

        const ledger = await tx.teamWalletLedger.create({
          data: {
            teamWalletId: wallet.id,
            entryType: TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
            amount,
            poolBalanceAfter:
              walletAfter?.unallocatedBalance ?? wallet.unallocatedBalance,
            allocationBalanceAfter: allocation.balance,
            targetUserId,
            operatorUserId,
            idempotencyKey,
          },
        });

        return { outcome: WALLET_OP_OUTCOME.OK, ledger };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const ledger = await this.findLedgerByIdempotencyKey(idempotencyKey);
        if (ledger) return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger };
      }
      throw error;
    }
  }

  /**
   * Info: (20260807 - Luphia) 成員分配 → 池收回（設計書 §6.2）。
   * 分配餘額的條件扣款為負餘額防線；REVOKE 分錄 amount 記為負值（分配視角出帳）。
   */
  async revoke(input: IAllocationOpInput): Promise<IWalletOpResult> {
    const { teamId, targetUserId, amount, operatorUserId, idempotencyKey } =
      input;
    try {
      return await prisma.$transaction(async (tx) => {
        const wallet = await tx.teamWallet.findUnique({ where: { teamId } });
        if (!wallet || wallet.status === TEAM_WALLET_STATUS.CLOSED) {
          return { outcome: WALLET_OP_OUTCOME.NO_WALLET };
        }
        if (wallet.status !== TEAM_WALLET_STATUS.ACTIVE) {
          return { outcome: WALLET_OP_OUTCOME.FROZEN };
        }

        const duplicated = await tx.teamWalletLedger.findUnique({
          where: { idempotencyKey },
        });
        if (duplicated) {
          return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger: duplicated };
        }

        const updated = await tx.teamWalletAllocation.updateMany({
          where: { teamId, userId: targetUserId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (updated.count === 0) {
          return { outcome: WALLET_OP_OUTCOME.INSUFFICIENT };
        }

        const walletAfter = await tx.teamWallet.update({
          where: { id: wallet.id },
          data: { unallocatedBalance: { increment: amount } },
        });
        const allocation = await tx.teamWalletAllocation.findUnique({
          where: { teamId_userId: { teamId, userId: targetUserId } },
        });

        const ledger = await tx.teamWalletLedger.create({
          data: {
            teamWalletId: wallet.id,
            entryType: TEAM_WALLET_ENTRY_TYPE.REVOKE,
            amount: -amount,
            poolBalanceAfter: walletAfter.unallocatedBalance,
            allocationBalanceAfter: allocation?.balance ?? BigInt(0),
            targetUserId,
            operatorUserId,
            idempotencyKey,
          },
        });

        return { outcome: WALLET_OP_OUTCOME.OK, ledger };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const ledger = await this.findLedgerByIdempotencyKey(idempotencyKey);
        if (ledger) return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger };
      }
      throw error;
    }
  }

  /**
   * Info: (20260807 - Luphia) 成員移除時全額收回其分配（設計書 §6.2）。
   * 查無分配或餘額為零回 NOT_FOUND（呼叫端視為 no-op）；FROZEN 擋下（守恆優先，移除流程須中止）。
   */
  async revokeAllForUser(
    input: Omit<IAllocationOpInput, "amount">,
  ): Promise<IWalletOpResult> {
    const { teamId, targetUserId, operatorUserId, idempotencyKey } = input;
    try {
      return await prisma.$transaction(async (tx) => {
        const allocation = await tx.teamWalletAllocation.findUnique({
          where: { teamId_userId: { teamId, userId: targetUserId } },
        });
        if (!allocation || allocation.balance <= BigInt(0)) {
          return { outcome: WALLET_OP_OUTCOME.NOT_FOUND };
        }

        const wallet = await tx.teamWallet.findUnique({ where: { teamId } });
        if (!wallet) return { outcome: WALLET_OP_OUTCOME.NO_WALLET };
        if (wallet.status !== TEAM_WALLET_STATUS.ACTIVE) {
          return { outcome: WALLET_OP_OUTCOME.FROZEN };
        }

        const duplicated = await tx.teamWalletLedger.findUnique({
          where: { idempotencyKey },
        });
        if (duplicated) {
          return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger: duplicated };
        }

        const amount = allocation.balance;
        const updated = await tx.teamWalletAllocation.updateMany({
          where: { teamId, userId: targetUserId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (updated.count === 0) {
          return { outcome: WALLET_OP_OUTCOME.INSUFFICIENT };
        }

        const walletAfter = await tx.teamWallet.update({
          where: { id: wallet.id },
          data: { unallocatedBalance: { increment: amount } },
        });

        const ledger = await tx.teamWalletLedger.create({
          data: {
            teamWalletId: wallet.id,
            entryType: TEAM_WALLET_ENTRY_TYPE.REVOKE,
            amount: -amount,
            poolBalanceAfter: walletAfter.unallocatedBalance,
            allocationBalanceAfter: BigInt(0),
            targetUserId,
            operatorUserId,
            idempotencyKey,
          },
        });

        return { outcome: WALLET_OP_OUTCOME.OK, ledger };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const ledger = await this.findLedgerByIdempotencyKey(idempotencyKey);
        if (ledger) return { outcome: WALLET_OP_OUTCOME.DUPLICATE, ledger };
      }
      throw error;
    }
  }

  /**
   * Info: (20260807 - Luphia) 每日守恆勾稽用（設計書 §3、ADR 015）：
   * 恆等式 Σ(PURCHASE + ADJUST + CONSUME + REFUND) = 池餘額 + Σ 分配餘額
   * （ALLOCATE / REVOKE 為內部移轉，不列入左側）。
   */
  async listAllWallets(): Promise<TeamWallet[]> {
    return prisma.teamWallet.findMany();
  }

  async sumAllocationsByTeam(): Promise<{ teamId: string; total: bigint }[]> {
    const grouped = await prisma.teamWalletAllocation.groupBy({
      by: ["teamId"],
      _sum: { balance: true },
    });
    return grouped.map((g) => ({
      teamId: g.teamId,
      total: g._sum.balance ?? BigInt(0),
    }));
  }

  async sumLedgerByWalletAndType(): Promise<
    { teamWalletId: string; entryType: string; total: bigint }[]
  > {
    const grouped = await prisma.teamWalletLedger.groupBy({
      by: ["teamWalletId", "entryType"],
      _sum: { amount: true },
    });
    return grouped.map((g) => ({
      teamWalletId: g.teamWalletId,
      entryType: g.entryType,
      total: g._sum.amount ?? BigInt(0),
    }));
  }

  // Info: (20260807 - Luphia) 守恆違反時凍結：人工介入前禁止任何異動（Fail Fast）
  async freezeWallet(id: string): Promise<TeamWallet> {
    return prisma.teamWallet.update({
      where: { id },
      data: { status: TEAM_WALLET_STATUS.FROZEN },
    });
  }

  async listAllocations(teamId: string): Promise<TeamWalletAllocation[]> {
    return prisma.teamWalletAllocation.findMany({
      where: { teamId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async listLedger(
    teamId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: TeamWalletLedger[]; total: number }> {
    const wallet = await this.getWalletByTeamId(teamId);
    if (!wallet) return { items: [], total: 0 };
    const [items, total] = await Promise.all([
      prisma.teamWalletLedger.findMany({
        where: { teamWalletId: wallet.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.teamWalletLedger.count({ where: { teamWalletId: wallet.id } }),
    ]);
    return { items, total };
  }
}

export const teamWalletRepo = new TeamWalletRepository();
