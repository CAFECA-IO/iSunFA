import { prisma } from "@/lib/prisma";
import { EsgTarget, Prisma, EsgRecord } from "@/generated/client";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export type EsgRecordWithRelations = Prisma.EsgRecordGetPayload<{
  include: { file: true };
}> & { journalId?: string; voucherId?: string };

export interface IEsgRepository {
  getEsgTargetsByAccountBookId(accountBookId: string): Promise<EsgTarget[]>;
  upsertEsgTarget(data: {
    accountBookId: string;
    year: number;
    totalEmissionTarget: Prisma.Decimal | number | null;
    revenueEmissionTarget: Prisma.Decimal | number | null;
  }): Promise<EsgTarget>;
  getVerifiedEsgRecordsByAccountBookId(
    accountBookId: string,
  ): Promise<EsgRecord[]>;
  getEsgTargetByYear(
    accountBookId: string,
    year: number,
  ): Promise<EsgTarget | null>;
  getEsgRecords(
    args: Prisma.EsgRecordFindManyArgs,
  ): Promise<EsgRecordWithRelations[]>;
  createEsgRecord(
    data: Prisma.EsgRecordUncheckedCreateInput,
  ): Promise<EsgRecord>;
  countEsgRecords(where: Prisma.EsgRecordWhereInput): Promise<number>;
  getEsgRecordById(id: string): Promise<EsgRecordWithRelations | null>;
  updateEsgRecord(
    id: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<EsgRecordWithRelations | null>;
  updateManyEsgRecordsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<Prisma.BatchPayload>;
}

export class EsgRepository implements IEsgRepository {
  async getEsgTargetsByAccountBookId(accountBookId: string) {
    return prisma.esgTarget.findMany({
      where: { accountBookId },
      orderBy: { year: "asc" },
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
      data: { isVerified: true },
    });
  }

  async getVerifiedEsgRecordsByAccountBookId(accountBookId: string) {
    return prisma.esgRecord.findMany({
      where: {
        accountBookId,
        isVerified: true,
      },
    });
  }

  async getEsgTargetByYear(accountBookId: string, year: number) {
    return prisma.esgTarget.findFirst({
      where: { accountBookId, year },
    });
  }

  async getEsgRecords(
    args: Prisma.EsgRecordFindManyArgs,
  ): Promise<EsgRecordWithRelations[]> {
    const records = (await prisma.esgRecord.findMany(
      args,
    )) as unknown as Prisma.EsgRecordGetPayload<{ include: { file: true } }>[];
    if (records.length === 0) return records as EsgRecordWithRelations[];

    const fileIds = Array.from(
      new Set(records.map((r) => r.fileId).filter(Boolean)),
    ) as string[];
    let journals: { id: string; fileId: string | null }[] = [];
    let vouchers: { id: string; fileId: string | null }[] = [];

    if (fileIds.length > 0) {
      journals = await prisma.journal.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true },
      });
      vouchers = await prisma.voucher.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true },
      });
    }

    return records.map((record) => {
      const journalId = journals.find((j) => j.fileId === record.fileId)?.id;
      const voucherId = vouchers.find((v) => v.fileId === record.fileId)?.id;
      return {
        ...record,
        journalId,
        voucherId,
      };
    }) as EsgRecordWithRelations[];
  }

  async createEsgRecord(data: Prisma.EsgRecordUncheckedCreateInput) {
    return prisma.esgRecord.create({ data });
  }

  async countEsgRecords(where: Prisma.EsgRecordWhereInput) {
    return prisma.esgRecord.count({ where });
  }

  async getEsgRecordById(id: string): Promise<EsgRecordWithRelations | null> {
    const record = await prisma.esgRecord.findUnique({
      where: { id },
      include: { file: true },
    });

    if (!record) return null;

    let journalId: string | undefined;
    let voucherId: string | undefined;

    if (record.fileId) {
      const journal = await prisma.journal.findFirst({
        where: { fileId: record.fileId, accountBookId: record.accountBookId },
        select: { id: true },
      });
      if (journal) journalId = journal.id;

      const voucher = await prisma.voucher.findFirst({
        where: { fileId: record.fileId, accountBookId: record.accountBookId },
        select: { id: true },
      });
      if (voucher) voucherId = voucher.id;
    }

    return {
      ...record,
      journalId,
      voucherId,
    } as EsgRecordWithRelations;
  }

    async getEsgSummary(accountBookId: string) {
      const now = new Date();
      // Info: (20260410 - Julian) 更乾淨的今日零時寫法
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  
      // Info: (20260410 - Julian) 獨立的 Aggregate 查詢使用 Promise.all 並行處理
      const [todayEsgRecordCount, pendingEsgRecordCount, aiAverageConfidenceAggr, dqiAverageAggr] =
        await Promise.all([
          prisma.esgRecord.count({
            where: { accountBookId, tradingDate: { gte: startOfToday } },
          }),
          prisma.esgRecord.count({
            where: { accountBookId, isVerified: false },
          }),
          prisma.esgRecord.aggregate({
            where: { accountBookId, analysisStatus: AIAnalysisStatus.COMPLETED },
            _avg: { confidence: true },
          }),
          prisma.esgRecord.aggregate({
            where: { accountBookId, analysisStatus: AIAnalysisStatus.COMPLETED },
            _avg: { dqiScore: true },
          }),
        ]);
  
      const aiAverageConfidence = Math.round(
        aiAverageConfidenceAggr._avg.confidence || 0,
      );

      // Info: (20260410 - Julian) 計算平均 DQI 評分
      const dqiAverage = Number(dqiAverageAggr._avg.dqiScore || 0);
  
      return { todayEsgRecordCount, dqiAverage, pendingEsgRecordCount, aiAverageConfidence };
    }

  async updateEsgRecord(
    id: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<EsgRecordWithRelations | null> {
    const record = await prisma.esgRecord.update({
      where: { id },
      data,
      include: { file: true },
    });

    if (!record) return null;

    let journalId: string | undefined;
    let voucherId: string | undefined;

    if (record.fileId) {
      const journal = await prisma.journal.findFirst({
        where: { fileId: record.fileId, accountBookId: record.accountBookId },
        select: { id: true },
      });
      if (journal) journalId = journal.id;

      const voucher = await prisma.voucher.findFirst({
        where: { fileId: record.fileId, accountBookId: record.accountBookId },
        select: { id: true },
      });
      if (voucher) voucherId = voucher.id;
    }

    return {
      ...record,
      journalId,
      voucherId,
    } as EsgRecordWithRelations;
  }

  async updateManyEsgRecordsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<Prisma.BatchPayload> {
    return prisma.esgRecord.updateMany({
      where: { fileId, accountBookId },
      data,
    });
  }
}

export const esgRepo = new EsgRepository();
