import { prisma } from "@/lib/prisma";
import {
  EsgTarget,
  Prisma,
  EsgRecord,
  AIAnalysisStatus,
  Coefficient,
} from "@/generated";
import {
  IEsgDashboardSummary,
  EsgScope,
  IEsgScopeDistributionData,
} from "@/interfaces/esg";
import { ESG_INDUSTRY_BENCHMARKS } from "@/constants/esg_industry_benchmarks";
import {
  IEmissionSources,
  IEsgEmissionSourcesSummary,
  IEsgEmissionSourcesUI,
} from "@/interfaces/emission_sources";
import { EsgIntensity } from "@/interfaces/esg";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";

export type EsgRecordWithRelations = Prisma.EsgRecordGetPayload<{
  include: { file: true; coefficient: true; emissionSource: true };
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
  createEsgCoefficient(data: Prisma.CoefficientCreateInput): Promise<Coefficient>;
  countEsgCoefficients(where: Prisma.CoefficientWhereInput): Promise<number>;
  getEsgCoefficientById(id: string): Promise<Coefficient | null>;
  updateEsgCoefficient(
    id: string,
    data: Prisma.CoefficientUpdateInput,
  ): Promise<Coefficient | null>;
  deleteEsgCoefficient(id: string): Promise<{ id: string } | null>;
  getEsgCoefficients(args: Prisma.CoefficientFindManyArgs): Promise<Coefficient[]>;
  getEsgEmissionSources(
    accountBookId: string,
    keyword: string,
    page?: number,
    pageSize?: number,
  ): Promise<{
    data: IEsgEmissionSourcesUI[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>;
  createEsgEmissionSources(
    accountBookId: string,
    name: string,
    address?: string,
  ): Promise<IEmissionSources>;
  getEsgEmissionSourcesById(id: string): Promise<IEsgEmissionSourcesUI | null>;
  updateEsgEmissionSources(
    id: string,
    data: Prisma.EmissionSourceUpdateInput,
  ): Promise<IEmissionSources | null>;
  deleteEsgEmissionSources(id: string): Promise<{ id: string } | null>;
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

  async findManyEsgRecords(args: Prisma.EsgRecordFindManyArgs) {
    return prisma.esgRecord.findMany(args);
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
      include: { file: true, coefficient: true, emissionSource: true },
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

    // Info: (20260421 - Julian) 繪製範疇分佈圖
    const scopeDistribution: IEsgScopeDistributionData[] = [
      {
        scope: EsgScope.SCOPE_1,
        value: Number(scope1Tons.toFixed(2)),
        percentage: Number(s1Pct.toFixed(1)),
      },
      {
        scope: EsgScope.SCOPE_2,
        value: Number(scope2Tons.toFixed(2)),
        percentage: Number(s2Pct.toFixed(1)),
      },
      {
        scope: EsgScope.SCOPE_3,
        value: Number(scope3Tons.toFixed(2)),
        percentage: Number(s3Pct.toFixed(1)),
      },
    ];

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
      scopeDistribution,
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

  async deleteEsgCoefficient(id: string): Promise<{ id: string } | null> {
    const deletedCoefficient = await prisma.coefficient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (!deletedCoefficient) return null;

    return { id: deletedCoefficient.id };
  }

  async getEsgEmissionSources(
    accountBookId: string,
    keyword: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{
    data: IEsgEmissionSourcesUI[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const where: Prisma.EmissionSourceWhereInput = {
      accountBookId,
      deletedAt: null,
      // Info: (20260430 - Julian) 搜尋關鍵字：ID、名稱、地址
      ...(keyword
        ? {
          OR: [
            { id: { contains: keyword, mode: "insensitive" } },
            { name: { contains: keyword, mode: "insensitive" } },
            { address: { contains: keyword, mode: "insensitive" } },
          ],
        }
        : {}),
    };

    const total = await prisma.emissionSource.count({ where });
    const emissionSources = await prisma.emissionSource.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      include: { esgRecords: { where: { deletedAt: null } } },
    });

    const data: IEsgEmissionSourcesUI[] = emissionSources.map((source) => {
      let totalEmission = 0;
      let intensity = EsgIntensity.LOW;

      const records = source.esgRecords
        // Info: (20260430 - Julian) 只選出有完成分析的紀錄
        .filter(
          (record) => record.analysisStatus === AIAnalysisStatus.COMPLETED,
        )
        .map((record) => {
          totalEmission += Number(record.emissions || 0);
          if (record.intensity === EsgIntensity.HIGH) {
            intensity = EsgIntensity.HIGH;
          } else if (
            record.intensity === EsgIntensity.MEDIUM &&
            intensity === EsgIntensity.LOW
          ) {
            intensity = EsgIntensity.MEDIUM;
          }

          return {
            id: record.id,
            tradingDate: Math.floor(record.tradingDate.getTime() / 1000),
            activityType: record.activityType as EsgActivityTypeKey,
            vendor: record.vendor,
            amount: Number(record.amount || 0),
            unit: record.unit,
            emissions: Number(record.emissions || 0),
            emissionSourceTag: record.emissionSourceTag || undefined,
          };
        });

      return {
        id: source.id,
        name: source.name,
        address: source.address || undefined,
        intensity: intensity,
        records,
        totalEmission: Number(totalEmission.toFixed(2)),
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getEsgEmissionSourcesSummary(
    accountBookId: string,
  ): Promise<IEsgEmissionSourcesSummary> {
    const thisYear = new Date().getFullYear();
    const periodOfThisYear = {
      gte: new Date(thisYear, 0, 1),
      lte: new Date(thisYear, 11, 31),
    };

    // Info: (20260421 - Julian) 所有排放源數量
    const totalEmissionSourcesCount = await prisma.emissionSource.count({
      where: { accountBookId },
    });

    // Info: (20260421 - Julian) 估計年總排放量：計算今年度所有 ESG record 排放量總和
    const estimatedAnnualTotalEmission = await prisma.esgRecord.aggregate({
      where: { accountBookId, tradingDate: periodOfThisYear },
      _sum: { emissions: true },
    });

    // Info: (20260421 - Julian) 前三大排放源：計算每個排放源底下的 esgRecords 排放量總和，並排序找出前三名
    const top3Aggregations = await prisma.esgRecord.groupBy({
      by: ["emissionSourceId"],
      where: {
        accountBookId,
        tradingDate: periodOfThisYear,
        emissionSourceId: { not: null },
      },
      _sum: { emissions: true },
      orderBy: {
        _sum: { emissions: "desc" },
      },
      take: 3,
    });

    // Info: (20260421 - Julian) 取得前三大排放源的 id
    const emissionSourceIds = top3Aggregations
      .map((aggr) => aggr.emissionSourceId)
      .filter((id): id is string => id !== null);

    // Info: (20260421 - Julian) 取得前三大排放源的詳細資料
    const top3Sources = await prisma.emissionSource.findMany({
      where: { id: { in: emissionSourceIds } },
    });

    const top3EmissionSources = top3Aggregations.map((aggr) => {
      const source = top3Sources.find((s) => s.id === aggr.emissionSourceId);
      return {
        name: source ? source.name : "未知排放源",
        value: Number(aggr._sum.emissions) ?? 0,
      };
    });

    const scopeDistribution: {
      scope: EsgScope;
      count: number;
    }[] = [];

    const summary: IEsgEmissionSourcesSummary = {
      totalEmissionSourcesCount: totalEmissionSourcesCount ?? 0,
      estimatedAnnualTotalEmission:
        Number(estimatedAnnualTotalEmission._sum.emissions) ?? 0,
      top3EmissionSources,
      scopeDistribution,
    };

    return summary;
  }

  async createEsgEmissionSources(
    accountBookId: string,
    name: string,
    address?: string,
  ) {
    const emissionSource = await prisma.emissionSource.create({
      data: {
        accountBookId,
        name,
        address,
      },
    });

    // ToDo: (20260424 - Julian) 評估排放強度
    const intensity = EsgIntensity.LOW;

    const result: IEmissionSources = {
      id: emissionSource.id,
      name: emissionSource.name,
      address: emissionSource.address ?? "",
      intensity,
    };

    return result;
  }

  async getEsgEmissionSourcesById(id: string): Promise<IEsgEmissionSourcesUI | null> {
    const source = await prisma.emissionSource.findUnique({
      where: { id },
      // Info: (20260430 - Julian) 取得排放源下的所有 ESG 紀錄，並排除已刪除的紀錄
      include: { esgRecords: { where: { deletedAt: null } } },
    });

    if (!source) return null;

    let totalEmission = 0;
    let intensity = EsgIntensity.LOW;

    const records = source.esgRecords
      // Info: (20260430 - Julian) 只選出有完成分析的紀錄
      .filter((record) => record.analysisStatus === AIAnalysisStatus.COMPLETED)
      .map((record) => {
        totalEmission += Number(record.emissions || 0);
        if (record.intensity === EsgIntensity.HIGH) {
          intensity = EsgIntensity.HIGH;
        } else if (
          record.intensity === EsgIntensity.MEDIUM &&
          intensity === EsgIntensity.LOW
        ) {
          intensity = EsgIntensity.MEDIUM;
        }

        return {
          id: record.id,
          tradingDate: Math.floor(record.tradingDate.getTime() / 1000),
          activityType: record.activityType as EsgActivityTypeKey,
          vendor: record.vendor,
          amount: Number(record.amount || 0),
          unit: record.unit,
          emissions: Number(record.emissions || 0),
          emissionSourceTag: record.emissionSourceTag || undefined,
        };
      });

    return {
      id: source.id,
      name: source.name,
      address: source.address || undefined,
      intensity: intensity,
      records,
      totalEmission: Number(totalEmission.toFixed(2)),
    };
  }

  async updateEsgEmissionSources(id: string, data: Prisma.EmissionSourceUpdateInput): Promise<IEmissionSources | null> {
    const updatedSource = await prisma.emissionSource.update({
      where: { id },
      data,
    });

    if (!updatedSource) return null;

    // ToDo: (20260424 - Julian) 評估排放強度
    const intensity = EsgIntensity.LOW;

    return {
      id: updatedSource.id,
      name: updatedSource.name,
      address: updatedSource.address ?? undefined,
      intensity,
    };
  }

  async deleteEsgEmissionSources(id: string): Promise<{ id: string } | null> {
    const deletedSource = await prisma.emissionSource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (!deletedSource) return null;

    return { id: deletedSource.id };
  }
}

export const esgRepo = new EsgRepository();
