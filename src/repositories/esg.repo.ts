import { prisma } from '@/lib/prisma';
import { EsgTarget, Prisma } from '@/generated/client';

export interface IEsgRepository {
  getEsgTargetsByAccountBookId(accountBookId: string): Promise<EsgTarget[]>;
  upsertEsgTarget(data: {
    accountBookId: string;
    year: number;
    totalEmissionTarget: Prisma.Decimal | number | null;
    revenueEmissionTarget: Prisma.Decimal | number | null;
  }): Promise<EsgTarget>;
  verifyAllEsgRecords(accountBookId: string): Promise<Prisma.BatchPayload>;
}

export class EsgRepository implements IEsgRepository {
  async getEsgTargetsByAccountBookId(accountBookId: string) {
    return prisma.esgTarget.findMany({
      where: { accountBookId },
      orderBy: { year: 'asc' },
    });
  }

  async upsertEsgTarget({
    accountBookId,
    year,
    totalEmissionTarget,
    revenueEmissionTarget,
  }: {
    accountBookId: string;
    year: number;
    totalEmissionTarget: Prisma.Decimal | number | null;
    revenueEmissionTarget: Prisma.Decimal | number | null;
  }) {
    return prisma.esgTarget.upsert({
      where: {
        accountBookId_year: {
          accountBookId,
          year,
        },
      },
      update: {
        totalEmissionTarget,
        revenueEmissionTarget,
      },
      create: {
        accountBookId,
        year,
        totalEmissionTarget,
        revenueEmissionTarget,
      },
    });
  }

  async verifyAllEsgRecords(accountBookId: string) {
    return prisma.esgRecord.updateMany({
      where: { accountBookId, isVerified: false },
      data: { isVerified: true }
    });
  }
}

export const esgRepo = new EsgRepository();
