import { prisma } from "@/lib/prisma";
import { Prisma, TeamQuotaUsage } from "@/generated";

/**
 * Info: (20260807 - Luphia) 訂閱額度用量 Repository（設計書 §4 / §5）。
 * 用量以固定視窗 key 聚合（DB SUM 為準，多實例一致）；
 * 冪等由 idempotencyKey @unique 保證，重試命中 P2002 時回傳既有列。
 */

export interface IWindowUsageSum {
  used5h: bigint;
  usedWeek: bigint;
}

export interface ICreateUsageResult {
  created: boolean;
  usage: TeamQuotaUsage;
}

export interface ICreateUsageInput {
  teamId: string;
  userId: string;
  featureCode: string;
  amount: bigint;
  windowKey5h: number;
  windowKeyWeek: number;
  idempotencyKey: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export class TeamQuotaUsageRepository {
  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<TeamQuotaUsage | null> {
    return prisma.teamQuotaUsage.findUnique({ where: { idempotencyKey } });
  }

  async sumWindowUsage(
    teamId: string,
    windowKey5h: number,
    windowKeyWeek: number,
  ): Promise<IWindowUsageSum> {
    const [sum5h, sumWeek] = await Promise.all([
      prisma.teamQuotaUsage.aggregate({
        where: { teamId, windowKey5h },
        _sum: { amount: true },
      }),
      prisma.teamQuotaUsage.aggregate({
        where: { teamId, windowKeyWeek },
        _sum: { amount: true },
      }),
    ]);
    return {
      used5h: sum5h._sum.amount ?? BigInt(0),
      usedWeek: sumWeek._sum.amount ?? BigInt(0),
    };
  }

  /**
   * Info: (20260807 - Luphia) 寫入一筆用量（消耗為正、退款為負）。
   * 冪等：同 idempotencyKey 重試回傳既有列並標記 created = false，不重複扣額度。
   */
  async createUsage(input: ICreateUsageInput): Promise<ICreateUsageResult> {
    try {
      const usage = await prisma.teamQuotaUsage.create({ data: input });
      return { created: true, usage };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await prisma.teamQuotaUsage.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return { created: false, usage: existing };
      }
      throw error;
    }
  }
}

export const teamQuotaUsageRepo = new TeamQuotaUsageRepository();
