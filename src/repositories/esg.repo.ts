import { prisma } from "@/lib/prisma";
import {
  EsgTarget,
  Prisma,
  EsgRecord,
  Coefficient,
  EmissionSource,
} from "@/generated";
import { Decimal } from "decimal.js";
import { MoneyUtil } from "@/lib/utils/money";
import {
  IEsgDashboardSummary,
  EsgScope,
  IEsgScopeDistributionData,
  IEsgTarget,
  IEsgRecordBrief,
  IEsgRecordDetail,
} from "@/interfaces/esg";
import { ESG_INDUSTRY_BENCHMARKS } from "@/constants/esg_industry_benchmarks";
import {
  IEsgEmissionSourcesSummary,
  IEsgEmissionSourcesUI,
} from "@/interfaces/emission_sources";
import { EsgIntensity } from "@/interfaces/esg";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";
import { CoefficientCategory, ICoefficient } from "@/interfaces/coefficient";
import {
  IBaseStringFilter,
  ICoefficientFilterOptions,
  IEsgRecordFilterOptions,
} from "@/interfaces/data_filter_option";
import { VerifyStatus } from "@/constants/verify_status";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export type EsgRecordWithRelations = Prisma.EsgRecordGetPayload<{
  include: { file: true; coefficient: true; emissionSource: true };
}> & { journalId?: string; voucherId?: string };

export interface IEsgRepository {
  getEsgTargetsByAccountBookId(accountBookId: string): Promise<IEsgTarget[]>;
  upsertEsgTarget(data: {
    accountBookId: string;
    year: number;
    totalEmissionTarget: Prisma.Decimal | number | null;
    revenueEmissionTarget: Prisma.Decimal | number | null;
  }): Promise<IEsgTarget>;
  getVerifiedEsgRecordsByAccountBookId(
    accountBookId: string,
  ): Promise<IEsgRecordBrief[]>;
  getEsgRecordsForReport({
    accountBookId,
    start,
    end,
  }: {
    accountBookId: string;
    start?: Date;
    end?: Date;
  }): Promise<IEsgRecordDetail[]>;
  verifyAllEsgRecords(accountBookId: string): Promise<number>;
  getEsgTargetByYear(
    accountBookId: string,
    year: number,
  ): Promise<IEsgTarget | null>;
  getEsgRecords(accountBookId: string): Promise<IEsgRecordDetail[]>;
  getEsgRecordsByFilter(
    options: IEsgRecordFilterOptions,
  ): Promise<IEsgRecordDetail[]>;
  createEsgRecord(
    data: Prisma.EsgRecordUncheckedCreateInput,
  ): Promise<{ newId: string }>;
  countEsgRecords(accountBookId: string): Promise<number>;
  countEsgRecordsByFilter(options: IEsgRecordFilterOptions): Promise<number>;
  getEsgRecordById(id: string): Promise<IEsgRecordDetail | null>;
  updateEsgRecord(
    id: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<IEsgRecordDetail | null>;
  updateManyEsgRecordsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<number>;
  getEsgSummary(
    accountBookId: string,
    year?: string,
    month?: string,
  ): Promise<IEsgDashboardSummary>;
  createEsgCoefficient(
    data: Prisma.CoefficientCreateInput,
  ): Promise<{ newId: string }>;
  upsertEsgCoefficient(
    args: Prisma.CoefficientUpsertArgs,
  ): Promise<{ newId: string }>;
  countEsgCoefficients(where: Prisma.CoefficientWhereInput): Promise<number>;
  countEsgCoefficientsByFilter(
    options: ICoefficientFilterOptions,
  ): Promise<number>;
  getEsgCoefficients(accountBookId: string): Promise<ICoefficient[]>;
  getEsgCoefficientsByFilter(
    options: ICoefficientFilterOptions,
  ): Promise<ICoefficient[]>;
  getEsgCoefficientById(id: string): Promise<ICoefficient | null>;
  updateEsgCoefficient(
    id: string,
    data: Prisma.CoefficientUpdateInput,
  ): Promise<{ newId: string }>;
  deleteEsgCoefficient(id: string): Promise<{ id: string } | null>;
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
  getEsgEmissionSourcesById(id: string): Promise<IEsgEmissionSourcesUI | null>;
  getEsgEmissionSourcesSummary(
    accountBookId: string,
  ): Promise<IEsgEmissionSourcesSummary>;

  createEsgEmissionSources(
    accountBookId: string,
    name: string,
    address?: string,
  ): Promise<IEsgEmissionSourcesUI>;
  updateEsgEmissionSources(
    id: string,
    data: Prisma.EmissionSourceUpdateInput,
  ): Promise<IEsgEmissionSourcesUI | null>;
  deleteEsgEmissionSources(id: string): Promise<{ id: string } | null>;
}

export class EsgRepository implements IEsgRepository {
  // Info: (20260507 - Julian) 建構 ESG 紀錄查詢條件
  private buildEsgRecordWhereClause(
    options: IEsgRecordFilterOptions,
  ): Prisma.EsgRecordWhereInput {
    // Info: (20260508 - Julian) 查詢條件：帳簿、軟刪除
    const where: Prisma.EsgRecordWhereInput = {
      accountBookId: options.accountBookId,
      deletedAt: null,
    };

    // Info: (20260311 - Julian) 關鍵字篩選：id / vendor / activityType
    if (options.keyword) {
      where.OR = [
        { id: { contains: options.keyword, mode: "insensitive" } },
        { vendor: { contains: options.keyword, mode: "insensitive" } },
        { activityType: { contains: options.keyword, mode: "insensitive" } },
      ];
    }

    // Info: (20260508 - Julian) 審核狀態過濾
    if (options.verifyStatus) {
      where.isVerified = options.verifyStatus === VerifyStatus.VERIFIED;
    }

    // Info: (20260508 - Julian) 排放強度過濾
    if (options.intensity) {
      where.intensity = options.intensity as EsgIntensity;
    }

    // Info: (20260508 - Julian) 排放範圍過濾
    if (options.scope) {
      where.scope = options.scope as EsgScope;
    }

    // Info: (20260508 - Julian) 年度、月份過濾邏輯
    if (options.year) {
      let startDate: Date;
      let endDate: Date;

      if (options.month) {
        startDate = new Date(options.year, options.month - 1, 1);
        endDate = new Date(options.year, options.month, 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(options.year, 0, 1);
        endDate = new Date(options.year, 11, 31, 23, 59, 59, 999);
      }

      where.OR = [
        {
          tradingDate: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        },
        { AND: [{ tradingDate: { gte: startDate, lte: endDate } }] },
      ];
    }

    // Info: (20260508 - Julian) 日期過濾邏輯
    if (options.startDate || options.endDate) {
      const gte = options.startDate ? new Date(options.startDate) : undefined;
      const lte = options.endDate ? new Date(options.endDate) : undefined;

      const dateCondition: IBaseStringFilter = {};
      if (gte) dateCondition.gte = gte.toISOString();
      if (lte) dateCondition.lte = lte.toISOString();

      const stringCondition: IBaseStringFilter = {};
      if (gte) stringCondition.gte = gte.toISOString();
      if (lte) stringCondition.lte = lte.toISOString();

      where.OR = [
        { tradingDate: stringCondition },
        { AND: [{ tradingDate: dateCondition }] },
      ];
    }

    return where;
  }

  // Info: (20260507 - Julian) 將 ESG 目標轉換成前端格式
  private transformEsgTargetToFrontendFormat(esgTarget: EsgTarget): IEsgTarget {
    const result: IEsgTarget = {
      id: esgTarget.id,
      accountBookId: esgTarget.accountBookId,
      year: esgTarget.year,
      totalEmissionTarget: esgTarget.totalEmissionTarget?.toString() || "0",
      revenueEmissionTarget: esgTarget.revenueEmissionTarget?.toString() || "0",
    };
    return result;
  }

  // Info: (20260507 - Julian) 將 ESG 紀錄轉換成前端格式
  private transformEsgRecordToFrontendFormat(
    esgRecord: EsgRecordWithRelations,
  ): IEsgRecordDetail {
    const coefficient: ICoefficient | null = esgRecord.coefficient
      ? {
          ...esgRecord.coefficient,
          category: esgRecord.coefficient.accountBookId
            ? CoefficientCategory.CUSTOM
            : CoefficientCategory.STANDARD,
          createdAt: Math.floor(
            esgRecord.coefficient.createdAt.getTime() / 1000,
          ),
          updatedAt: Math.floor(
            esgRecord.coefficient.updatedAt.getTime() / 1000,
          ),
          emissionFactor: Number(esgRecord.coefficient.emissionFactor),
        }
      : null;

    const emissionSource = esgRecord.emissionSource
      ? {
          id: esgRecord.emissionSource.id,
          name: esgRecord.emissionSource.name,
        }
      : null;

    const file = esgRecord.file
      ? {
          id: esgRecord.file.id,
          hash: esgRecord.file.hash,
          fileName: esgRecord.file.fileName ?? "",
        }
      : undefined;

    return {
      ...esgRecord,
      coefficient,
      emissionSource,
      fileId: esgRecord.fileId ?? "",
      file,
      tradingDate: Math.floor(esgRecord.tradingDate.getTime() / 1000),
      amount: esgRecord.amount.toString(),
      emissions: esgRecord.emissions.toString(),
      emissionSourceTag: esgRecord.emissionSourceTag ?? undefined,
      dqiScore: Number(esgRecord.dqiScore),
      scope: esgRecord.scope as EsgScope,
      intensity: esgRecord.intensity as EsgIntensity,
      analysisStatus: esgRecord.analysisStatus as AIAnalysisStatus,
      activityType: esgRecord.activityType as EsgActivityTypeKey,
    };
  }

  // Info: (20260507 - Julian) 批次取得 ESG 紀錄的關聯並轉換格式
  private async attachEsgRecordRelationsAndFormat(
    esgRecords: EsgRecordWithRelations[],
  ): Promise<IEsgRecordDetail[]> {
    // Info: (20260507 - Julian) 若沒有 ESG 紀錄就直接 return
    if (esgRecords.length === 0) return [];

    // Info: (20260507 - Julian) 取出 file
    const fileIds = Array.from(
      new Set(
        esgRecords
          .map((j) => j.fileId)
          .filter((id): id is string => id !== null),
      ),
    );

    // Info: (20260507 - Julian) 若沒有 file 就不需要後續的查詢
    if (fileIds.length === 0) {
      return esgRecords.map((e) => this.transformEsgRecordToFrontendFormat(e));
    }

    // Info: (20260327 - Luphia) 並行查詢，節省等待時間
    const [journals, vouchers] = await Promise.all([
      prisma.journal.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, accountBookId: true },
      }),
      prisma.voucher.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, accountBookId: true },
      }),
    ]);

    // Info: (20260327 - Luphia) 使用 Map 將查詢複雜度從 O(N*M) 降為 O(1)
    // Info: (20260327 - Luphia) 使用 fileId + accountBookId 作為複合鍵，確保對應精準度
    const journalMap = new Map(
      journals.map((j) => [`${j.fileId}_${j.accountBookId}`, j.id]),
    );
    const voucherMap = new Map(
      vouchers.map((v) => [`${v.fileId}_${v.accountBookId}`, v.id]),
    );

    // Info: (20260506 - Julian) 轉換格式，並對齊關聯資料
    return esgRecords.map((esgRecord) => {
      const compositeKey = `${esgRecord.fileId}_${esgRecord.accountBookId}`;
      const journalId = esgRecord.fileId
        ? journalMap.get(compositeKey)
        : undefined;
      const voucherId = esgRecord.fileId
        ? voucherMap.get(compositeKey)
        : undefined;

      return this.transformEsgRecordToFrontendFormat({
        ...esgRecord,
        journalId,
        voucherId,
      });
    });
  }

  // Info: (20260507 - Julian) 抽取共用的查詢並轉換格式
  private async fetchAndFormatEsgRecords(
    args: Prisma.EsgRecordFindManyArgs,
  ): Promise<IEsgRecordDetail[]> {
    const mergedArgs = {
      ...args,
      // Info: (20260507 - Julian) 將關聯的 file, coefficient, emissionSource 一併取出
      include: {
        ...args.include,
        file: true,
        coefficient: true,
        emissionSource: true,
      },
    };

    const esgRecords = (await prisma.esgRecord.findMany(
      mergedArgs,
    )) as EsgRecordWithRelations[];
    return this.attachEsgRecordRelationsAndFormat(esgRecords);
  }

  // Info: (20260507 - Julian) 建立係數過濾條件
  private buildCoefficientWhereClause(
    options: ICoefficientFilterOptions,
  ): Prisma.CoefficientWhereInput {
    const where: Prisma.CoefficientWhereInput = {
      deletedAt: null, // Info: (20260508 - Julian) 排除已刪除的係數
      OR: [
        { accountBookId: null }, // Info: (20260508 - Julian) 標準係數
        { accountBookId: options.accountBookId }, // Info: (20260508 - Julian) 對應帳簿的自訂係數
      ],
    };

    // Info: (20260508 - Julian) 依據 tab 篩選係數
    if (options.tab === CoefficientCategory.STANDARD) {
      // Info: (20260508 - Julian) 無 accountBookId => 標準係數
      where.accountBookId = null;
    } else if (options.tab === CoefficientCategory.CUSTOM) {
      // Info: (20260508 - Julian) 有 accountBookId => 自訂係數
      where.accountBookId = options.accountBookId;
    }

    // Info: (20260508 - Julian) 搜尋字串過濾邏輯：name, description, source
    if (options.keyword) {
      where.OR = [
        { name: { contains: options.keyword, mode: "insensitive" } },
        { description: { contains: options.keyword, mode: "insensitive" } },
        { source: { contains: options.keyword, mode: "insensitive" } },
      ];
    }

    // Info: (20260508 - Julian) 單位過濾邏輯：模糊搜尋
    if (options.unit) {
      where.unit = { contains: options.unit, mode: "insensitive" };
    }

    return where;
  }

  // Info: (20260507 - Julian) 轉換係數至前端格式
  private transformCoefficientToFrontendFormat(
    coefficient: Coefficient,
  ): ICoefficient {
    return {
      ...coefficient,
      category: !!coefficient.accountBookId
        ? CoefficientCategory.CUSTOM
        : CoefficientCategory.STANDARD,
      createdAt: Math.floor(coefficient.createdAt.getTime() / 1000),
      updatedAt: Math.floor(coefficient.updatedAt.getTime() / 1000),
      emissionFactor: Number(coefficient.emissionFactor),
    };
  }

  // Info: (20260507 - Julian) 計算排放源總排放量及強度，並轉換為前端格式
  private transformEmissionSourceToFrontendFormat(
    source: EmissionSource & { esgRecords: EsgRecord[] },
  ): IEsgEmissionSourcesUI {
    const validRecords = source.esgRecords
      // Info: (20260507 - Julian) 只選出有完成分析，且沒有被刪除的紀錄
      .filter((record) => record.analysisStatus === AIAnalysisStatus.COMPLETED)
      .filter((record) => record.deletedAt === null);

    const totalEmission = validRecords.reduce(
      (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.emissions || 0)),
      MoneyUtil.toDecimal(0),
    );

    const records = validRecords.map((record) => {
      return {
        id: record.id,
        tradingDate: Math.floor(record.tradingDate.getTime() / 1000),
        activityType: record.activityType as EsgActivityTypeKey,
        vendor: record.vendor,
        amount: record.amount?.toString() || "0",
        unit: record.unit,
        emissions: record.emissions?.toString() || "0",
        emissionSourceTag: record.emissionSourceTag || undefined,
      };
    });

    return {
      id: source.id,
      name: source.name,
      address: source.address || undefined,
      intensity: this.computeIntensity(totalEmission.toNumber()),
      records,
      totalEmission: totalEmission.toFixed(2),
    };
  }

  // Info: (20260507 - Julian) 計算總排放量對應的強度區間
  /* ToDo: (20260507 - Julian) ⚠️還在開發中
   ** 需要根據搜集到的資料來制定計算強度區間的方法，目前先寫死區間，後續會再擴充 */
  private computeIntensity(totalEmission: number): EsgIntensity {
    if (totalEmission < 100) return EsgIntensity.LOW;
    if (totalEmission < 1000) return EsgIntensity.MEDIUM;
    return EsgIntensity.HIGH;
  }

  // Info: (20260507 - Julian) 取得指定帳簿的 ESG 目標，回傳 IEsgTarget[]
  async getEsgTargetsByAccountBookId(accountBookId: string) {
    const esgTarget = await prisma.esgTarget.findMany({
      where: { accountBookId },
      orderBy: { year: "asc" },
    });

    const result: IEsgTarget[] = esgTarget.map(
      this.transformEsgTargetToFrontendFormat,
    );
    return result;
  }

  // Info: (20260507 - Julian) 新增或更新指定帳簿的 ESG 目標，回傳 IEsgTarget
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
    const totalDec =
      totalEmissionTarget !== null
        ? new Prisma.Decimal(String(totalEmissionTarget))
        : null;
    const revenueDec =
      revenueEmissionTarget !== null
        ? new Prisma.Decimal(String(revenueEmissionTarget))
        : null;

    const esgTarget = await prisma.esgTarget.upsert({
      where: {
        accountBookId_year: {
          accountBookId,
          year,
        },
      },
      update: {
        totalEmissionTarget: totalDec,
        revenueEmissionTarget: revenueDec,
      },
      create: {
        accountBookId,
        year,
        totalEmissionTarget: totalDec,
        revenueEmissionTarget: revenueDec,
      },
    });

    const result = this.transformEsgTargetToFrontendFormat(esgTarget);

    return result;
  }

  // Info: (20260507 - Julian) 取得指定帳簿的已驗證的 ESG 記錄，回傳 IEsgRecordBrief[]
  async getVerifiedEsgRecordsByAccountBookId(accountBookId: string) {
    const esgRecords = await prisma.esgRecord.findMany({
      where: { accountBookId, isVerified: true },
    });

    const result: IEsgRecordBrief[] = esgRecords.map((record) => ({
      id: record.id,
      tradingDate: Math.floor(record.tradingDate.getTime() / 1000),
      activityType: record.activityType as EsgActivityTypeKey,
      vendor: record.vendor,
      amount: record.amount.toString(),
      unit: record.unit,
      emissions: record.emissions.toString(),
      emissionSourceTag: record.emissionSourceTag ?? undefined,
    }));

    return result;
  }

  // Info: (20260508 - Julian) 取得指定帳簿的 ESG 記錄，主要用於生成 report，回傳 IEsgRecordForAnalysis[]
  async getEsgRecordsForReport({
    accountBookId,
    start,
    end,
  }: {
    accountBookId: string;
    start?: Date;
    end?: Date;
  }): Promise<IEsgRecordDetail[]> {
    const esgRecords = await prisma.esgRecord.findMany({
      where: {
        accountBookId,
        tradingDate: { gte: start, lte: end },
        deletedAt: null,
      },
      include: { file: true, emissionSource: true, coefficient: true },
    });

    // Info: (20260507 - Julian) 取出 file
    const fileIds = Array.from(
      new Set(
        esgRecords
          .map((j) => j.fileId)
          .filter((id): id is string => id !== null),
      ),
    );

    // Info: (20260507 - Julian) 若沒有 file 就不需要後續的查詢
    if (fileIds.length === 0) {
      return esgRecords.map((e) => this.transformEsgRecordToFrontendFormat(e));
    }

    // Info: (20260327 - Luphia) 並行查詢，節省等待時間
    const [journals, vouchers] = await Promise.all([
      prisma.journal.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, accountBookId: true },
      }),
      prisma.voucher.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, accountBookId: true },
      }),
    ]);

    // Info: (20260327 - Luphia) 使用 Map 將查詢複雜度從 O(N*M) 降為 O(1)
    // Info: (20260327 - Luphia) 使用 fileId + accountBookId 作為複合鍵，確保對應精準度
    const journalMap = new Map(
      journals.map((j) => [`${j.fileId}_${j.accountBookId}`, j.id]),
    );
    const voucherMap = new Map(
      vouchers.map((v) => [`${v.fileId}_${v.accountBookId}`, v.id]),
    );

    const result: IEsgRecordDetail[] = esgRecords.map((record) => ({
      id: record.id,
      tradingDate: Math.floor(record.tradingDate.getTime() / 1000),
      activityType: record.activityType as EsgActivityTypeKey,
      vendor: record.vendor,
      amount: record.amount.toString(),
      unit: record.unit,
      emissions: record.emissions.toString(),
      emissionSourceTag: record.emissionSourceTag ?? undefined,
      scope: record.scope as EsgScope,
      intensity: record.intensity as EsgIntensity,
      analysisStatus: record.analysisStatus as AIAnalysisStatus,
      fileId: record.fileId ?? "",
      file: record.file
        ? {
            id: record.file.id,
            hash: record.file.hash,
            fileName: record.file.fileName ?? "",
          }
        : undefined,
      aiNote: record.aiNote,
      confidence: record.confidence,
      isVerified: record.isVerified,
      dqiScore: Number(record.dqiScore),
      coefficient: record.coefficient
        ? {
            ...record.coefficient,
            emissionFactor: Number(record.coefficient.emissionFactor),
            category: !!record.coefficient.accountBookId
              ? CoefficientCategory.CUSTOM
              : CoefficientCategory.STANDARD,
            createdAt: Math.floor(
              record.coefficient.createdAt.getTime() / 1000,
            ),
            updatedAt: Math.floor(
              record.coefficient.updatedAt.getTime() / 1000,
            ),
          }
        : null,
      emissionSource: record.emissionSource ?? null,
      isDeleted: record.deletedAt !== null,
      journalId: record.fileId
        ? journalMap.get(`${record.fileId}_${record.accountBookId}`)
        : undefined,
      voucherId: record.fileId
        ? voucherMap.get(`${record.fileId}_${record.accountBookId}`)
        : undefined,
    }));

    return result;
  }

  // Info: (20260507 - Julian) 將所有未驗證的 ESG 記錄設為已驗證，回傳數量(number)
  async verifyAllEsgRecords(accountBookId: string) {
    const result = await prisma.esgRecord.updateMany({
      where: { accountBookId, isVerified: false },
      data: { isVerified: true },
    });

    return result.count;
  }

  // Info: (20260507 - Julian) 取得指定帳簿特定年份的 ESG 目標，回傳 IEsgTarget | null
  async getEsgTargetByYear(accountBookId: string, year: number) {
    const esgTarget = await prisma.esgTarget.findFirst({
      where: { accountBookId, year },
    });

    if (!esgTarget) return null;

    const result = this.transformEsgTargetToFrontendFormat(esgTarget);
    return result;
  }

  // Info: (20260507 - Julian) 取得指定帳簿的 ESG 記錄，回傳 IEsgRecordDetail[]
  async getEsgRecords(accountBookId: string): Promise<IEsgRecordDetail[]> {
    const where = this.buildEsgRecordWhereClause({ accountBookId });
    return this.fetchAndFormatEsgRecords({ where });
  }

  // Info: (20260507 - Julian) 取得指定帳簿的 ESG 記錄(依條件過濾)，回傳 IEsgRecordDetail[]
  async getEsgRecordsByFilter(
    options: IEsgRecordFilterOptions,
  ): Promise<IEsgRecordDetail[]> {
    const where = this.buildEsgRecordWhereClause(options);

    return this.fetchAndFormatEsgRecords({
      where,
      orderBy: { tradingDate: options.sort || "desc" },
      ...(options.page && options.limit
        ? { skip: (options.page - 1) * options.limit, take: options.limit }
        : {}),
    });
  }

  // Info: (20260507 - Julian) 新增 ESG 記錄，回傳新建立記錄的 ID
  async createEsgRecord(
    data: Prisma.EsgRecordUncheckedCreateInput,
  ): Promise<{ newId: string }> {
    const result = await prisma.esgRecord.create({ data });
    return { newId: result.id };
  }

  // Info: (20260507 - Julian) 統計 ESG 記錄總數，
  async countEsgRecords(accountBookId: string) {
    return prisma.esgRecord.count({ where: { accountBookId } });
  }

  // Info: (20260507 - Julian) 統計 ESG 記錄總數(依條件過濾)，回傳數量(number)
  async countEsgRecordsByFilter(
    options: IEsgRecordFilterOptions,
  ): Promise<number> {
    const where = this.buildEsgRecordWhereClause(options);
    return prisma.esgRecord.count({ where });
  }

  // Info: (20260507 - Julian) 取得指定帳簿的 ESG 記錄，回傳 IEsgRecordDetail[]
  async getEsgRecordById(id: string): Promise<IEsgRecordDetail | null> {
    const esgRecords = await this.fetchAndFormatEsgRecords({
      where: { id },
    });
    return esgRecords[0] || null;
  }

  // Info: (20260507 - Julian) 更新單一 ESG 紀錄，回傳 IEsgRecordDetail | null
  async updateEsgRecord(
    id: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<IEsgRecordDetail | null> {
    const esgRecord = (await prisma.esgRecord.update({
      where: { id },
      data,
      include: { file: true, coefficient: true, emissionSource: true },
    })) as EsgRecordWithRelations;

    if (!esgRecord) return null;

    const formattedEsgRecords = await this.attachEsgRecordRelationsAndFormat([
      esgRecord,
    ]);
    return formattedEsgRecords[0] || null;
  }

  // Info: (20260507 - Julian) 更新與特定 file 關聯的 ESG 紀錄：回傳更新數量(number)
  async updateManyEsgRecordsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.EsgRecordUpdateInput,
  ): Promise<number> {
    const result = await prisma.esgRecord.updateMany({
      where: { fileId, accountBookId, deletedAt: null },
      data,
    });
    return result.count;
  }

  // Info: (20260507 - Julian) 計算指定帳簿和區間段的 ESG 摘要，回傳 IEsgDashboardSummary
  async getEsgSummary(
    accountBookId: string,
    year?: string,
    month?: string,
  ): Promise<IEsgDashboardSummary> {
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

    // Info: (20260507 - Julian) 平行查詢 ESG 記錄、收入傳票、帳簿、目標
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
      const e = MoneyUtil.toDecimal(aggr._sum.emissions || 0).toNumber();
      totalEmissions += e;
      if (aggr.scope === "SCOPE_1") scope1 += e;
      else if (aggr.scope === "SCOPE_2") scope2 += e;
      else if (aggr.scope === "SCOPE_3") scope3 += e;
    });

    const revenue = MoneyUtil.toDecimal(
      incomeVoucherLinesAggr._sum.amount?.toString() || 0,
    )
      .dividedBy(2)
      .toNumber();

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
      MoneyUtil.toDecimal(target.totalEmissionTarget).gt(0)
    ) {
      const msInYear =
        new Date(currentYear, 11, 31, 23, 59, 59, 999).getTime() -
        new Date(currentYear, 0, 1).getTime();
      const spanMs = Math.min(
        endDate.getTime() - startDate.getTime(),
        msInYear,
      );
      const proportion = spanMs / msInYear;
      const proportionalTarget = MoneyUtil.toDecimal(target.totalEmissionTarget)
        .times(proportion)
        .toNumber();
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
        value: scope1Tons.toFixed(2),
        percentage: Number(s1Pct.toFixed(1)),
      },
      {
        scope: EsgScope.SCOPE_2,
        value: scope2Tons.toFixed(2),
        percentage: Number(s2Pct.toFixed(1)),
      },
      {
        scope: EsgScope.SCOPE_3,
        value: scope3Tons.toFixed(2),
        percentage: Number(s3Pct.toFixed(1)),
      },
    ];

    const summary: IEsgDashboardSummary = {
      totalEmissions: {
        value: totalEmissionsTons.toFixed(2),
        unit: "tCO2e",
        estimatedEndOfMonth: estimatedEndOfMonth.toFixed(2),
        estimatedUnit: "tCO2e",
      },
      emissionIntensity: {
        value: intensity !== null ? intensity.toFixed(2) : null,
        unit: "tCO2e / 萬元營收",
        industryAverage: industryAverage.toFixed(2),
      },
      scopeDistribution,
      goalProgress: {
        percentage: Number(goalProgress.toFixed(1)),
      },
    };

    return summary;
  }

  // Info: (20260507 - Julian) 新增自訂係數，回傳 ID
  async createEsgCoefficient(data: Prisma.CoefficientCreateInput) {
    const coefficient = await prisma.coefficient.create({ data });
    return { newId: coefficient.id };
  }

  // Info: (20260507 - Julian) 更新或建立自訂係數，回傳 ID
  async upsertEsgCoefficient(args: Prisma.CoefficientUpsertArgs) {
    const coefficient = await prisma.coefficient.upsert(args);
    return { newId: coefficient.id };
  }

  // Info: (20260507 - Julian) 計算係數總數，回傳 number
  async countEsgCoefficients(where: Prisma.CoefficientWhereInput) {
    return prisma.coefficient.count({ where });
  }

  // Info: (20260507 - Julian) 依據篩選條件計算係數總數，回傳 number
  async countEsgCoefficientsByFilter(options: ICoefficientFilterOptions) {
    const where = this.buildCoefficientWhereClause(options);
    return prisma.coefficient.count({ where });
  }

  // Info: (20260507 - Julian) 取得指定帳簿的係數，回傳 ICoefficient[]
  async getEsgCoefficients(accountBookId: string): Promise<ICoefficient[]> {
    const coefficients = await prisma.coefficient.findMany({
      where: { accountBookId },
    });
    return coefficients.map((coefficient) =>
      this.transformCoefficientToFrontendFormat(coefficient),
    );
  }

  // Info: (20260507 - Julian) 依據篩選條件取得係數，回傳 ICoefficient[]
  async getEsgCoefficientsByFilter(
    options: ICoefficientFilterOptions,
  ): Promise<ICoefficient[]> {
    const where = this.buildCoefficientWhereClause(options);
    const coefficients = await prisma.coefficient.findMany({
      where,
      ...(options.page && options.limit
        ? { skip: (options.page - 1) * options.limit, take: options.limit }
        : {}),
      orderBy: [{ accountBookId: "desc" }, { updatedAt: "desc" }],
      include: { accountBook: true },
    });
    return coefficients.map((coefficient) =>
      this.transformCoefficientToFrontendFormat(coefficient),
    );
  }

  // Info: (20260507 - Julian) 取得指定係數 ID 的係數，回傳 ICoefficient
  async getEsgCoefficientById(id: string): Promise<ICoefficient | null> {
    const coefficient = await prisma.coefficient.findUnique({
      where: { id },
      include: { accountBook: true },
    });
    return coefficient
      ? this.transformCoefficientToFrontendFormat(coefficient)
      : null;
  }

  // Info: (20260507 - Julian) 透過 ID 更新係數，回傳 { newId: string }
  async updateEsgCoefficient(id: string, data: Prisma.CoefficientUpdateInput) {
    const updatedCoefficient = await prisma.coefficient.update({
      where: { id },
      data,
    });
    return { newId: updatedCoefficient.id };
  }

  // Info: (20260507 - Julian) 軟刪除係數，回傳 { id: string }
  async deleteEsgCoefficient(id: string): Promise<{ id: string } | null> {
    const deletedCoefficient = await prisma.coefficient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (!deletedCoefficient) return null;

    return { id: deletedCoefficient.id };
  }

  // Info: (20260507 - Julian) 依據帳簿 ID 和關鍵字取得排放源列表，回傳 IEsgEmissionSourcesUI[]
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

    // Info: (20260507 - Julian) 轉換為前端格式
    const data = emissionSources.map((source) =>
      this.transformEmissionSourceToFrontendFormat(source),
    );

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

  // Info: (20260507 - Julian) 依據 ID 取得排放源，回傳 IEsgEmissionSourcesUI
  async getEsgEmissionSourcesById(
    id: string,
  ): Promise<IEsgEmissionSourcesUI | null> {
    const source = await prisma.emissionSource.findUnique({
      where: { id },
      // Info: (20260430 - Julian) 取得排放源下的所有 ESG 紀錄，並排除已刪除的紀錄
      include: { esgRecords: { where: { deletedAt: null } } },
    });

    if (!source) return null;

    return this.transformEmissionSourceToFrontendFormat(source);
  }

  // Info: (20260507 - Julian) 取得排放源的摘要，回傳 IEsgEmissionSourcesSummary
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
        value: aggr._sum.emissions?.toString() ?? "0",
      };
    });

    const scopeDistribution: {
      scope: EsgScope;
      count: number;
    }[] = [];

    const summary: IEsgEmissionSourcesSummary = {
      totalEmissionSourcesCount: totalEmissionSourcesCount ?? 0,
      estimatedAnnualTotalEmission:
        estimatedAnnualTotalEmission._sum.emissions?.toString() ?? "0",
      top3EmissionSources,
      scopeDistribution,
    };

    return summary;
  }

  // Info: (20260507 - Julian) 建立排放源，回傳 IEmissionSources
  async createEsgEmissionSources(
    accountBookId: string,
    name: string,
    address?: string,
  ): Promise<IEsgEmissionSourcesUI> {
    const emissionSource = await prisma.emissionSource.create({
      data: {
        accountBookId,
        name,
        address,
      },
      include: { esgRecords: { where: { deletedAt: null } } },
    });

    const result = this.transformEmissionSourceToFrontendFormat(emissionSource);
    return result;
  }

  // Info: (20260507 - Julian) 更新排放源，回傳 IEsgEmissionSourcesUI
  async updateEsgEmissionSources(
    id: string,
    data: Prisma.EmissionSourceUpdateInput,
  ): Promise<IEsgEmissionSourcesUI | null> {
    const updatedSource = await prisma.emissionSource.update({
      where: { id },
      data,
      include: { esgRecords: { where: { deletedAt: null } } },
    });

    if (!updatedSource) return null;

    const result = this.transformEmissionSourceToFrontendFormat(updatedSource);
    return result;
  }

  // Info: (20260507 - Julian) 軟刪除排放源，回傳 { id: string }
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
