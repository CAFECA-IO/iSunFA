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
      // Info: (20260807 - Luphia) 併發下兩個交易同時通過 dedupe 檢查時，
      // 後者在寫分錄時命中 P2002，整筆交易（含扣款）已回滾，安全回報冪等重放
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
    const refundKey = `refund:${idempotencyKey}`;
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

        // Info: (20260807 - Luphia) CONSUME 分錄 amount 為負值，退還金額取其絕對值
        const refundAmount = -original.amount;

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
}

export const teamWalletRepo = new TeamWalletRepository();
