import { prisma } from "@/lib/prisma";
import { EsgTarget, Prisma, EsgRecord } from "@/generated/client";
import { IEsgDashboardSummary } from "@/interfaces/esg";
import { ESG_INDUSTRY_BENCHMARKS } from "@/constants/esg_industry_benchmarks";

export type EsgRecordWithRelations = Prisma.EsgRecordGetPayload<{
  include: { file: true, coefficient: true };
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
      include: { file: true, coefficient: true },
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

  async getEsgSummary(accountBookId: string, year?: string, month?: string) {
    let startDate: Date;
    let endDate: Date;

    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : null;

    if (currentMonth) {
      startDate = new Date(currentYear, currentMonth - 1, 1);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    }

    const [esgAggregations, incomeVoucherLinesAggr, accountBook, targets] =
      await Promise.all([
        prisma.esgRecord.groupBy({
          by: ["scope"],
          where: {
            accountBookId,
            tradingDate: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          _sum: { emissions: true },
        }),
        prisma.voucherLine.aggregate({
          where: {
            voucher: {
              accountBookId,
              tradingType: "INCOME",
              tradingDate: { gte: startDate, lte: endDate },
              deletedAt: null,
            },
          },
          _sum: { amount: true },
        }),
        prisma.accountBook.findUnique({
          where: { id: accountBookId },
          select: { esgIndustryId: true },
        }),
        this.getEsgTargetsByAccountBookId(accountBookId),
      ]);

    let totalEmissions = 0;
    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;

    esgAggregations.forEach((aggr) => {
      const e = Number(aggr._sum.emissions || 0);
      totalEmissions += e;
      if (aggr.scope === "SCOPE_1") scope1 += e;
      else if (aggr.scope === "SCOPE_2") scope2 += e;
      else if (aggr.scope === "SCOPE_3") scope3 += e;
    });

    const revenue = Number(incomeVoucherLinesAggr._sum.amount || 0) / 2;

    const totalEmissionsTons = totalEmissions / 1000;
    const scope1Tons = scope1 / 1000;
    const scope2Tons = scope2 / 1000;
    const scope3Tons = scope3 / 1000;

    const rev10k = revenue / 10000;
    const intensity = rev10k > 0 ? totalEmissionsTons / rev10k : null;

    const s1Pct = totalEmissions > 0 ? (scope1 / totalEmissions) * 100 : 0;
    const s2Pct = totalEmissions > 0 ? (scope2 / totalEmissions) * 100 : 0;
    const s3Pct = totalEmissions > 0 ? (scope3 / totalEmissions) * 100 : 0;

    const target = targets.find((t) => t.year === currentYear);

    let goalProgress = 0;
    if (
      target &&
      target.totalEmissionTarget &&
      Number(target.totalEmissionTarget) > 0
    ) {
      const msInYear =
        new Date(currentYear, 11, 31, 23, 59, 59, 999).getTime() -
        new Date(currentYear, 0, 1).getTime();
      const spanMs = Math.min(
        endDate.getTime() - startDate.getTime(),
        msInYear,
      );
      const proportion = spanMs / msInYear;
      const proportionalTarget =
        Number(target.totalEmissionTarget) * proportion;
      goalProgress = (totalEmissionsTons / proportionalTarget) * 100; // Info: (20260326 - Julian) 碳排放目標達成率，單位為百分比
    }

    // Info: (20260410 - Julian) 估算本月/本年度的期末總排放量
    let estimatedEndOfMonth = totalEmissionsTons;
    const nowTime = new Date().getTime();
    if (nowTime >= startDate.getTime() && nowTime <= endDate.getTime()) {
      const totalPeriodMs = endDate.getTime() - startDate.getTime();
      const passedMs = nowTime - startDate.getTime();
      if (passedMs > 0) {
        estimatedEndOfMonth = totalEmissionsTons * (totalPeriodMs / passedMs);
      }
    } else if (nowTime < startDate.getTime()) {
      estimatedEndOfMonth = 0; // Info: (20260410 - Julian) 若時間未到，預估為 0
    }

    // Info: (20260410 - Julian) 取得產業基準值
    let industryAverage = 0;
    if (accountBook?.esgIndustryId) {
      const benchmark = ESG_INDUSTRY_BENCHMARKS.find(
        (b) => b.id === accountBook.esgIndustryId,
      );
      if (benchmark) {
        industryAverage =
          (benchmark.emissionPer10kMin + benchmark.emissionPer10kMax) / 2;
      }
    }

    const summary: IEsgDashboardSummary = {
      totalEmissions: {
        value: Number(totalEmissionsTons.toFixed(2)),
        unit: "tCO2e",
        estimatedEndOfMonth: Number(estimatedEndOfMonth.toFixed(2)),
        estimatedUnit: "tCO2e",
      },
      emissionIntensity: {
        value: intensity !== null ? Number(intensity.toFixed(2)) : null,
        unit: "tCO2e / 萬元營收",
        industryAverage: Number(industryAverage.toFixed(2)),
      },
      scopeDistribution: {
        scope1: {
          value: Number(scope1Tons.toFixed(2)),
          unit: "tCO2e",
          percentage: Number(s1Pct.toFixed(1)),
        },
        scope2: {
          value: Number(scope2Tons.toFixed(2)),
          unit: "tCO2e",
          percentage: Number(s2Pct.toFixed(1)),
        },
        scope3: {
          value: Number(scope3Tons.toFixed(2)),
          unit: "tCO2e",
          percentage: Number(s3Pct.toFixed(1)),
        },
      },
      goalProgress: {
        percentage: Number(goalProgress.toFixed(1)),
      },
    };

    return summary;
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

  async createEsgCoefficient(data: Prisma.CoefficientCreateInput) {
    return prisma.coefficient.create({ data });
  }

  async getEsgCoefficients(args: Prisma.CoefficientFindManyArgs) {
    const coefficients = await prisma.coefficient.findMany({
      ...args,
      include: { accountBook: true },
    });

    return coefficients;
  }

  async countEsgCoefficients(where: Prisma.CoefficientWhereInput) {
    return prisma.coefficient.count({ where });
  }

  async getEsgCoefficientById(id: string) {
    return prisma.coefficient.findUnique({
      where: { id },
      include: { accountBook: true },
    });
  }

  async updateEsgCoefficient(id: string, data: Prisma.CoefficientUpdateInput) {
    return prisma.coefficient.update({
      where: { id },
      data,
    });
  }

  async deleteEsgCoefficient(id: string) {
    return prisma.coefficient.delete({
      where: { id },
    });
  }
}

export const esgRepo = new EsgRepository();
