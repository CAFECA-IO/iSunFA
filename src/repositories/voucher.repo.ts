import { prisma } from "@/lib/prisma";
import { Prisma, Voucher } from "@/generated";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { IAccount } from "@/constants/accounts";
import { IVoucherFilterOptions } from "@/interfaces/data_filter_option";
import { VerifyStatus } from "@/constants/verify_status";
import {
  IVoucher,
  IVoucherLineUI,
  TradingType,
  IVoucherDashboardSummary,
} from "@/interfaces/voucher";
import { getAccountByCode } from "@/lib/utils/account";
import { VoucherSorting } from "@/constants/sort";

export type VoucherWithRelations = Prisma.VoucherGetPayload<{
  include: { file: true; user: true; lines: true };
}> & { journalId?: string; esgRecordId?: string };

export interface IVoucherRepository {
  createVoucher(
    data: Prisma.VoucherUncheckedCreateInput,
  ): Promise<{ newId: string }>;
  countVouchers(accountBookId: string): Promise<number>;
  countVouchersByFilter(options: IVoucherFilterOptions): Promise<number>;
  verifyAllVouchers(accountBookId: string): Promise<number>;
  getVouchers(accountBookId: string): Promise<IVoucher[]>;
  getVouchersByFilter(options: IVoucherFilterOptions): Promise<IVoucher[]>;
  getVoucherById(id: string): Promise<IVoucher | null>;
  getVerifiedIncomesByAccountBookId(accountBookId: string): Promise<IVoucher[]>;
  updateVoucher(
    id: string,
    data: Prisma.VoucherUpdateInput,
  ): Promise<IVoucher | null>;
  updateManyVouchersByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.VoucherUpdateInput,
  ): Promise<number>;
  getVoucherSummary(accountBookId: string): Promise<IVoucherDashboardSummary>;

  checkDocumentDuplication(
    accountBookId: string,
    preCheckData: {
      invoiceNumber?: string | null;
      vendorTaxId?: string | null;
      tradingDate?: string | null;
      totalAmount?: number | null;
    },
  ): Promise<{
    isDuplicate: boolean;
    duplicateId?: string;
    duplicateType?: "VOUCHER" | "JOURNAL";
  }>;
  findManyVouchers(args: Prisma.VoucherFindManyArgs): Promise<Voucher[]>;
}

export class VoucherRepository implements IVoucherRepository {
  // Info: (20260506 - Julian) 建構查詢條件
  private buildVoucherWhereClause(
    options: IVoucherFilterOptions,
  ): Prisma.VoucherWhereInput {
    const where: Prisma.VoucherWhereInput = {
      accountBookId: options.accountBookId,
    };

    // Info: (20260311 - Julian) 關鍵字篩選：id / note / particular / accountingCode
    if (options.keyword) {
      where.OR = [
        { id: { contains: options.keyword } },
        { note: { contains: options.keyword } },
        { lines: { some: { particular: { contains: options.keyword } } } },
        { lines: { some: { accountingCode: { contains: options.keyword } } } },
      ];
    }

    // Info: (20260324 - Julian) 建立審核狀態篩選
    if (options.verifyStatus) {
      where.isVerified = options.verifyStatus === VerifyStatus.VERIFIED;
    }

    // Info: (20260310 - Julian) 建立時間區間篩選
    if (options.startDate || options.endDate) {
      where.tradingDate = {};
      if (options.startDate) {
        where.tradingDate.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        where.tradingDate.lte = new Date(options.endDate);
      }
    }

    if (options.type && options.type !== "all") {
      where.tradingType = options.type.toUpperCase() as
        | "INCOME"
        | "OUTCOME"
        | "TRANSFER";
    }

    if (options.hideDeleted) {
      where.deletedAt = null;
    } else {
      // Info: (20260404 - Luphia) 預設列表顯示：未刪除、或是被軟刪除但距今小於 7 天內的傳票
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const whereInput = where as Prisma.VoucherWhereInput;
      const andConditions = Array.isArray(whereInput.AND)
        ? whereInput.AND
        : whereInput.AND
          ? [whereInput.AND]
          : [];

      andConditions.push({
        OR: [{ deletedAt: null }, { deletedAt: { gte: sevenDaysAgo } }],
      });
      whereInput.AND = andConditions;
    }

    return where;
  }

  // Info: (20260506 - Julian) 轉換格式
  private transformToFrontendFormat(voucher: VoucherWithRelations): IVoucher {
    const formattedLineItems: IVoucherLineUI[] = voucher.lines.map((line) => {
      return {
        ...line,
        particular: line.particular ?? "",
        accounting: getAccountByCode(line.accountingCode) as IAccount,
      };
    });
    const totalAmount = voucher.lines.reduce(
      (acc, line) => acc + line.amount,
      0,
    );

    return {
      ...voucher,
      isDeleted: voucher.deletedAt !== null,
      issuerName: voucher.user?.name || "",
      tradingDate: Math.floor(voucher.tradingDate.getTime() / 1000),
      tradingType: (voucher.tradingType?.toUpperCase() as TradingType) ?? null,
      note: voucher.note || "",
      fileId: voucher.fileId || "",
      file: voucher.file
        ? {
            id: voucher.file.id,
            hash: voucher.file.hash,
            fileName: voucher.file.fileName ?? "",
          }
        : undefined,
      lineItems: {
        totalAmount,
        lines: formattedLineItems,
      },
      analysisStatus: voucher.analysisStatus as AIAnalysisStatus,
    };
  }

  // Info: (20260506 - Julian) 批次取得關聯並轉換格式
  private async attachRelationsAndFormat(
    vouchers: VoucherWithRelations[],
  ): Promise<IVoucher[]> {
    // Info: (20260506 - Julian) 若沒有傳票就直接 return
    if (vouchers.length === 0) return [];

    // Info: (20260506 - Julian) 取出 file
    const fileIds = Array.from(
      new Set(
        vouchers.map((j) => j.fileId).filter((id): id is string => id !== null),
      ),
    );

    // Info: (20260506 - Julian) 若沒有 file 就不需要後續的查詢
    if (fileIds.length === 0) {
      return vouchers.map((j) => this.transformToFrontendFormat(j));
    }

    // Info: (20260327 - Luphia) 並行查詢，節省等待時間
    const [journals, esgRecords] = await Promise.all([
      prisma.journal.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, accountBookId: true },
      }),
      prisma.esgRecord.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, accountBookId: true },
      }),
    ]);

    // Info: (20260327 - Luphia) 使用 Map 將查詢複雜度從 O(N*M) 降為 O(1)
    // Info: (20260327 - Luphia) 使用 fileId + accountBookId 作為複合鍵，確保對應精準度
    const journalMap = new Map(
      journals.map((j) => [`${j.fileId}_${j.accountBookId}`, j.id]),
    );
    const esgRecordMap = new Map(
      esgRecords.map((e) => [`${e.fileId}_${e.accountBookId}`, e.id]),
    );

    // Info: (20260506 - Julian) 轉換格式，並對齊關聯資料
    return vouchers.map((voucher) => {
      const compositeKey = `${voucher.fileId}_${voucher.accountBookId}`;
      const journalId = voucher.fileId
        ? journalMap.get(compositeKey)
        : undefined;
      const esgRecordId = voucher.fileId
        ? esgRecordMap.get(compositeKey)
        : undefined;

      return this.transformToFrontendFormat({
        ...voucher,
        journalId,
        esgRecordId,
      });
    });
  }

  // Info: (20260506 - Julian) 抽取共用的查詢並轉換格式
  private async fetchAndFormatVouchers(
    args: Prisma.VoucherFindManyArgs,
    sorting?: VoucherSorting,
  ): Promise<IVoucher[]> {
    // Info: (20260506 - Julian) Prisma 只能用 tradingDate 排序，借貸金額排序交給下方 JS 處理
    const prismaOrderBy: Prisma.VoucherOrderByWithRelationInput =
      sorting === VoucherSorting.DATE_ASC
        ? { tradingDate: Prisma.SortOrder.asc }
        : { tradingDate: Prisma.SortOrder.desc };

    const mergedArgs: Prisma.VoucherFindManyArgs = {
      ...args,
      orderBy: args.orderBy || prismaOrderBy,
      // Info: (20260506 - Julian) 將關聯的 file, user, lines 一併取出
      include: { ...args.include, file: true, user: true, lines: true },
    };

    const vouchers = (await prisma.voucher.findMany(
      mergedArgs,
    )) as unknown as VoucherWithRelations[];
    const formattedVouchers = await this.attachRelationsAndFormat(vouchers);

    // Info: (20260311 - Julian) JS 排序邏輯 (處理 Prisma 不支援的關聯加總)
    if (
      sorting &&
      sorting !== VoucherSorting.DATE_DESC &&
      sorting !== VoucherSorting.DATE_ASC
    ) {
      formattedVouchers.sort((a, b) => {
        if (
          sorting === VoucherSorting.DEBIT_DESC ||
          sorting === VoucherSorting.DEBIT_ASC
        ) {
          const aDebit = a.lineItems.lines
            .filter((l) => l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          const bDebit = b.lineItems.lines
            .filter((l) => l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          return sorting === VoucherSorting.DEBIT_DESC
            ? bDebit - aDebit
            : aDebit - bDebit;
        }

        if (
          sorting === VoucherSorting.CREDIT_DESC ||
          sorting === VoucherSorting.CREDIT_ASC
        ) {
          const aCredit = a.lineItems.lines
            .filter((l) => !l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          const bCredit = b.lineItems.lines
            .filter((l) => !l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          return sorting === VoucherSorting.CREDIT_DESC
            ? bCredit - aCredit
            : aCredit - bCredit;
        }

        return 0;
      });
    }

    return formattedVouchers;
  }

  // Info: (20260506 - Julian) 新增傳票：回傳 new voucher id (string)
  async createVoucher(data: Prisma.VoucherUncheckedCreateInput) {
    const newVoucher = await prisma.voucher.create({ data });
    return { newId: newVoucher.id };
  }

  // Info: (20260506 - Julian) 取得傳票總數：回傳總數(number)
  async countVouchers(accountBookId: string) {
    const where = this.buildVoucherWhereClause({ accountBookId });
    return prisma.voucher.count({ where });
  }

  // Info: (20260506 - Julian) 依據篩選條件取得傳票總數：回傳總數(number)
  async countVouchersByFilter(options: IVoucherFilterOptions): Promise<number> {
    const where = this.buildVoucherWhereClause(options);
    return prisma.voucher.count({ where });
  }

  // Info: (20260506 - Julian) 驗證所有傳票：回傳總數(number)
  async verifyAllVouchers(accountBookId: string) {
    const result = await prisma.voucher.updateMany({
      where: {
        accountBookId,
        isVerified: false,
        deletedAt: null, // Info: (20260506 - Julian) 避免改動到被軟刪除的傳票
      },
      data: { isVerified: true },
    });
    return result.count;
  }

  // Info: (20260506 - Julian) 取得傳票列表：回傳 IVoucher[]
  async getVouchers(accountBookId: string): Promise<IVoucher[]> {
    // Info: (20260506 - Julian) 取得帳簿底下的所有日記帳
    const where = this.buildVoucherWhereClause({ accountBookId });
    return this.fetchAndFormatVouchers({ where });
  }

  // Info: (20260506 - Julian) 依據篩選條件取得傳票列表：回傳 IVoucher[]
  async getVouchersByFilter(
    options: IVoucherFilterOptions,
  ): Promise<IVoucher[]> {
    const where = this.buildVoucherWhereClause(options);
    const skip =
      options.page && options.limit
        ? (options.page - 1) * options.limit
        : undefined;
    const take = options.limit || undefined;

    return this.fetchAndFormatVouchers(
      {
        where,
        skip,
        take,
      },
      options.sorting,
    );
  }

  // Info: (20260506 - Julian) 依據 id 取得傳票：回傳 IVoucher | null
  async getVoucherById(id: string): Promise<IVoucher | null> {
    const vouchers = await this.fetchAndFormatVouchers({
      where: { id },
    });
    return vouchers[0] || null;
  }

  // Info: (20260506 - Julian) 取得核對過的收入傳票：回傳 IVoucher[]
  async getVerifiedIncomesByAccountBookId(accountBookId: string) {
    const where = this.buildVoucherWhereClause({ accountBookId });
    return this.fetchAndFormatVouchers({
      // Info: (20260506 - Julian) 篩選條件：已核對且為 INCOME 的傳票
      where: {
        ...where,
        tradingType: TradingType.INCOME,
        isVerified: true,
      },
    });
  }

  // Info: (20260506 - Julian) 更新傳票：回傳更新後的 IVoucher | null
  async updateVoucher(
    id: string,
    data: Prisma.VoucherUpdateInput,
  ): Promise<IVoucher | null> {
    const voucher = (await prisma.voucher.update({
      where: { id },
      data,
      include: { file: true, user: true, lines: true },
    })) as unknown as VoucherWithRelations;

    if (!voucher) return null;

    const formattedVouchers = await this.attachRelationsAndFormat([voucher]);
    return formattedVouchers[0] || null;
  }

  // Info: (20260506 - Julian) 更新與特定 file 關聯的傳票：回傳更新數量(number)
  async updateManyVouchersByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.VoucherUpdateInput,
  ): Promise<number> {
    const result = await prisma.voucher.updateMany({
      where: { fileId, accountBookId, deletedAt: null },
      data,
    });
    return result.count;
  }

  // Info: (20260506 - Julian) 取得傳票儀表板摘要：回傳 IVoucherDashboardSummary
  async getVoucherSummary(accountBookId: string) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Info: (20260506 - Julian) 今日傳票數量
    const todayVoucherCount = await prisma.voucher.count({
      where: {
        accountBookId,
        createdAt: { gte: startOfToday },
        deletedAt: null,
      },
    });

    // Info: (20260506 - Julian) 本月支出總金額
    const monthTotalAmountAggr = await prisma.voucherLine.aggregate({
      where: {
        isDebit: true,
        voucher: {
          accountBookId,
          tradingDate: { gte: startOfMonth },
          deletedAt: null,
        },
      },
      _sum: { amount: true },
    });
    const monthTotalAmount = monthTotalAmountAggr._sum.amount || 0;

    // Info: (20260506 - Julian) 未核對傳票數量
    const pendingVoucherCount = await prisma.voucher.count({
      where: { accountBookId, isVerified: false, deletedAt: null },
    });

    // Info: (20260506 - Julian) AI 平均信賴度 (只算已完成分析的傳票)
    const aiAverageConfidenceAggr = await prisma.voucher.aggregate({
      where: { accountBookId, analysisStatus: AIAnalysisStatus.COMPLETED },
      _avg: { confidence: true },
    });

    const aiAverageConfidence = Math.round(
      aiAverageConfidenceAggr._avg.confidence || 0,
    );

    return {
      todayVoucherCount,
      monthTotalAmount,
      pendingVoucherCount,
      aiAverageConfidence,
    };
  }

  // Info: (20260507 - Julian) 檢查文件是否重複：回傳 { isDuplicate, duplicateId, duplicateType }
  // 但目前未使用
  async checkDocumentDuplication(
    accountBookId: string,
    preCheckData: {
      invoiceNumber?: string | null;
      vendorTaxId?: string | null;
      tradingDate?: string | null;
      totalAmount?: number | null;
    },
  ): Promise<{
    isDuplicate: boolean;
    duplicateId?: string;
    duplicateType?: "VOUCHER" | "JOURNAL";
  }> {
    if (preCheckData.invoiceNumber) {
      const v = await prisma.voucher.findFirst({
        where: {
          accountBookId,
          note: { contains: preCheckData.invoiceNumber },
        },
      });
      if (v)
        return {
          isDuplicate: true,
          duplicateId: v.id,
          duplicateType: "VOUCHER",
        };
      const j = await prisma.journal.findFirst({
        where: {
          accountBookId,
          text: { contains: preCheckData.invoiceNumber },
        },
      });
      if (j)
        return {
          isDuplicate: true,
          duplicateId: j.id,
          duplicateType: "JOURNAL",
        };
    } else if (preCheckData.tradingDate && preCheckData.totalAmount) {
      const d = new Date(preCheckData.tradingDate);
      if (!isNaN(d.getTime())) {
        const startOfDay = new Date(d);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const v = await prisma.voucher.findFirst({
          where: {
            accountBookId,
            tradingDate: { gte: startOfDay, lte: endOfDay },
            note: preCheckData.vendorTaxId
              ? { contains: preCheckData.vendorTaxId }
              : undefined,
          },
          include: { lines: true },
        });
        if (v) {
          const sum = v.lines.reduce(
            (acc, obj) => acc + (obj.isDebit ? obj.amount : 0),
            0,
          );
          if (sum === Number(preCheckData.totalAmount))
            return {
              isDuplicate: true,
              duplicateId: v.id,
              duplicateType: "VOUCHER",
            };
        }
      }
    }
    return { isDuplicate: false };
  }

  // ToDo: (20260507 - Julian) 在 src/services/analysis.service.ts 使用，預計移除
  async findManyVouchers(args: Prisma.VoucherFindManyArgs) {
    return prisma.voucher.findMany(args);
  }
}

export const voucherRepo = new VoucherRepository();
