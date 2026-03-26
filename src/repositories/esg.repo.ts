import { prisma } from '@/lib/prisma';
import { EsgTarget, Prisma, EsgRecord } from '@/generated/client';

export interface IEsgRepository {
  getEsgTargetsByAccountBookId(accountBookId: string): Promise<EsgTarget[]>;
  upsertEsgTarget(data: {
    accountBookId: string;
    year: number;
    totalEmissionTarget: Prisma.Decimal | number | null;
    revenueEmissionTarget: Prisma.Decimal | number | null;
  }): Promise<EsgTarget>;
  getVerifiedEsgRecordsByAccountBookId(accountBookId: string): Promise<EsgRecord[]>;
  getEsgTargetByYear(accountBookId: string, year: number): Promise<EsgTarget | null>;
  getEsgRecords(args: Prisma.EsgRecordFindManyArgs): Promise<Prisma.EsgRecordGetPayload<{ include: { file: true } }>[]>;
  createEsgRecord(data: Prisma.EsgRecordUncheckedCreateInput): Promise<EsgRecord>;
  countEsgRecords(where: Prisma.EsgRecordWhereInput): Promise<number>;
  getEsgRecordById(id: string): Promise<Prisma.EsgRecordGetPayload<{ include: { file: true } }> | null>;
  updateEsgRecord(id: string, data: Prisma.EsgRecordUpdateInput): Promise<EsgRecord | null>;
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

  async getVerifiedEsgRecordsByAccountBookId(accountBookId: string) {
    return prisma.esgRecord.findMany({
      where: {
        accountBookId,
        isVerified: true
      }
    });
  }

  async getEsgTargetByYear(accountBookId: string, year: number) {
    return prisma.esgTarget.findFirst({
      where: { accountBookId, year }
    });
  }

  async getEsgRecords(args: Prisma.EsgRecordFindManyArgs) {
    return prisma.esgRecord.findMany(args) as unknown as Promise<Prisma.EsgRecordGetPayload<{ include: { file: true } }>[]>;
  }

  async createEsgRecord(data: Prisma.EsgRecordUncheckedCreateInput) {
    return prisma.esgRecord.create({ data });
  }

  async countEsgRecords(where: Prisma.EsgRecordWhereInput) {
    return prisma.esgRecord.count({ where });
  }

  async getEsgRecordById(id: string) {
    return prisma.esgRecord.findUnique({
      where: { id },
      include: { file: true },
    });
  }

  async updateEsgRecord(id: string, data: Prisma.EsgRecordUpdateInput) {
    return prisma.esgRecord.update({
      where: { id },
      data,
    });
  }
}

export const esgRepo = new EsgRepository();
