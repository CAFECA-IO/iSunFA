import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { IJournal, IJournalDashboardSummary } from "@/interfaces/journal";
import { IJournalFilterOptions } from "@/interfaces/data_filter_option";
import { VerifyStatus } from "@/constants/verify_status";

// Info: (20260327 - Luphia) 定義共用的 Return Type 讓型別更嚴謹
type JournalWithRelations = Prisma.JournalGetPayload<{
  include: { file: true };
}> & {
  voucherId?: string;
  esgRecordId?: string;
};

export interface IJournalRepository {
  createJournal(
    data: Prisma.JournalUncheckedCreateInput,
  ): Promise<{ newId: string }>;
  countJournals(): Promise<number>;
  countJournalsByFilter(options: IJournalFilterOptions): Promise<number>;
  getJournals(): Promise<IJournal[]>;
  getJournalsByFilter(options: IJournalFilterOptions): Promise<IJournal[]>;
  getJournalById(id: string): Promise<IJournal | null>;
  updateJournal(id: string, data: Prisma.JournalUpdateInput): Promise<IJournal>;
  deleteJournal(id: string): Promise<{ deletedJournalId: string }>;
  verifyAllJournals(accountBookId: string): Promise<number>;
  getJournalSummary(accountBookId: string): Promise<IJournalDashboardSummary>;
  updateManyJournalsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.JournalUpdateInput,
  ): Promise<number>;
}

export class JournalRepository implements IJournalRepository {
  // Info: (20260506 - Julian) ==== 核心邏輯 ====
  // Info: (20260506 - Julian) 建構查詢條件
  private buildJournalWhereClause(
    options: IJournalFilterOptions,
  ): Prisma.JournalWhereInput {
    // Info: (20260506 - Julian) 軟刪除過濾邏輯
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: Prisma.JournalWhereInput = {
      accountBookId: options.accountBookId,
      OR: [{ deletedAt: null }, { deletedAt: { gte: sevenDaysAgo } }],
    };

    if (options.keyword) {
      where.AND = [
        {
          OR: [
            { text: { contains: options.keyword } },
            { id: { contains: options.keyword } },
          ],
        },
      ];
    }

    if (options.verifyStatus) {
      where.isVerified = options.verifyStatus === VerifyStatus.VERIFIED;
    }

    if (options.startDate || options.endDate) {
      where.tradingDate = {};
      if (options.startDate)
        where.tradingDate.gte = new Date(options.startDate);
      if (options.endDate) where.tradingDate.lte = new Date(options.endDate);
    }

    return where;
  }

  // Info: (20260506 - Julian) 轉換格式
  private transformToFrontendFormat(journal: JournalWithRelations): IJournal {
    return {
      ...journal,
      tradingTimestamp: Math.floor(journal.tradingDate.getTime() / 1000),
      text: journal.text ?? "",
      fileId: journal.fileId ?? "",
      file: journal.file
        ? {
            id: journal.file.id,
            hash: journal.file.hash,
            fileName: journal.file.fileName ?? "",
          }
        : undefined,
      voucherId: journal.voucherId,
      esgRecordId: journal.esgRecordId,
      analysisStatus: journal.analysisStatus as AIAnalysisStatus,
      confidence: journal.confidence,
      isVerified: journal.isVerified,
      aiNote: journal.aiNote ?? undefined,
      isDeleted: !!journal.deletedAt,
    };
  }

  // Info: (20260506 - Julian) 批次取得關聯並轉換格式
  private async attachRelationsAndFormat(
    journals: JournalWithRelations[],
  ): Promise<IJournal[]> {
    // Info: (20260506 - Julian) 若沒有日記帳就直接 return
    if (journals.length === 0) return [];

    // Info: (20260506 - Julian) 取出 file
    const fileIds = Array.from(
      new Set(
        journals.map((j) => j.fileId).filter((id): id is string => id !== null),
      ),
    );

    // Info: (20260506 - Julian) 若沒有 file 就不需要後續的查詢
    if (fileIds.length === 0) {
      return journals.map((j) => this.transformToFrontendFormat(j));
    }

    // Info: (20260327 - Luphia) 並行查詢，節省等待時間
    const [vouchers, esgRecords] = await Promise.all([
      prisma.voucher.findMany({
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
    const voucherMap = new Map(
      vouchers.map((v) => [`${v.fileId}_${v.accountBookId}`, v.id]),
    );
    const esgRecordMap = new Map(
      esgRecords.map((e) => [`${e.fileId}_${e.accountBookId}`, e.id]),
    );

    // Info: (20260506 - Julian) 轉換格式，並對齊關聯資料
    return journals.map((journal) => {
      const compositeKey = `${journal.fileId}_${journal.accountBookId}`;
      const voucherId = journal.fileId
        ? voucherMap.get(compositeKey)
        : undefined;
      const esgRecordId = journal.fileId
        ? esgRecordMap.get(compositeKey)
        : undefined;

      return this.transformToFrontendFormat({
        ...journal,
        voucherId,
        esgRecordId,
      });
    });
  }

  // Info: (20260506 - Julian) 抽取共用的查詢並轉換格式
  private async fetchAndFormatJournals(
    args: Prisma.JournalFindManyArgs,
  ): Promise<IJournal[]> {
    // Info: (20260327 - Luphia) 確保一定有 include file，並讓 Prisma 自動推導型別
    const mergedArgs = {
      ...args,
      include: { ...args.include, file: true },
    };

    const journals = await prisma.journal.findMany(mergedArgs);
    return this.attachRelationsAndFormat(journals);
  }

  // Info: (20260506 - Julian) 新增日記帳：回傳 new journal id (string)
  async createJournal(data: Prisma.JournalUncheckedCreateInput) {
    const newJournal = await prisma.journal.create({ data });
    return { newId: newJournal.id };
  }

  // Info: (20260506 - Julian) 取得日記帳總數：回傳 number
  async countJournals() {
    return prisma.journal.count();
  }

  // Info: (20260506 - Julian) 取得符合條件的日記帳總數：回傳 number
  async countJournalsByFilter(options: IJournalFilterOptions): Promise<number> {
    const where = this.buildJournalWhereClause(options);
    return prisma.journal.count({ where });
  }

  // Info: (20260506 - Julian) 取得所有日記帳：回傳 IJournal[]
  async getJournals(): Promise<IJournal[]> {
    return this.fetchAndFormatJournals({});
  }

  // Info: (20260506 - Julian) 取得符合條件的日記帳列表：回傳 IJournal[]
  async getJournalsByFilter(
    options: IJournalFilterOptions,
  ): Promise<IJournal[]> {
    const where = this.buildJournalWhereClause(options);
    const skip =
      options.page && options.limit
        ? (options.page - 1) * options.limit
        : undefined;
    const take = options.limit || undefined;

    return this.fetchAndFormatJournals({
      where,
      skip,
      take,
      orderBy: { tradingDate: options.sort || "desc" },
    });
  }

  // Info: (20260506 - Julian) 以 ID 取得日記帳：回傳 IJournal | null
  async getJournalById(id: string): Promise<IJournal | null> {
    const journals = await this.fetchAndFormatJournals({
      where: { id },
    });
    return journals[0] || null;
  }

  // Info: (20260506 - Julian) 更新日記帳：回傳 IJournal
  async updateJournal(
    id: string,
    data: Prisma.JournalUpdateInput,
  ): Promise<IJournal> {
    const journal = await prisma.journal.update({
      where: { id },
      data,
      include: { file: true },
    });

    // Info: (20260506 - Julian) 取得關聯資料
    const [result] = await this.attachRelationsAndFormat([journal]);

    return result;
  }

  // Info: (20260506 - Julian) 軟刪除日記帳：回傳 { deletedJournalId: string }
  async deleteJournal(id: string) {
    const result = await prisma.journal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deletedJournalId: result.id };
  }

  // Info: (20260506 - Julian) 更新所有日記帳：回傳 number
  async verifyAllJournals(accountBookId: string) {
    const result = await prisma.journal.updateMany({
      where: {
        accountBookId,
        isVerified: false,
      },
      data: {
        isVerified: true,
      },
    });

    return result.count;
  }

  // Info: (20260506 - Julian) 取得日記帳總覽：回傳 IJournalDashboardSummary
  async getJournalSummary(accountBookId: string) {
    const now = new Date();
    // Info: (20260327 - Luphia) 更乾淨的今日零時寫法
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    // Info: (20260327 - Luphia) 三個獨立的 Aggregate 查詢使用 Promise.all 並行處理
    const [todayJournalCount, pendingJournalCount, aiAverageConfidenceAggr] =
      await Promise.all([
        prisma.journal.count({
          where: { accountBookId, createdAt: { gte: startOfToday } },
        }),
        prisma.journal.count({
          where: { accountBookId, isVerified: false },
        }),
        prisma.journal.aggregate({
          where: { accountBookId, analysisStatus: AIAnalysisStatus.COMPLETED },
          _avg: { confidence: true },
        }),
      ]);

    const aiAverageConfidence = Math.round(
      aiAverageConfidenceAggr._avg.confidence || 0,
    );

    return { todayJournalCount, pendingJournalCount, aiAverageConfidence };
  }

  // Info: (20260327 - Luphia) 抽離共用的關聯查詢邏輯，並使用 Promise.all 加速
  // Info: (20260506 - Julian) 更新日記帳：回傳 number
  async updateManyJournalsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.JournalUpdateInput,
  ) {
    const result = await prisma.journal.updateMany({
      where: { fileId, accountBookId },
      data,
    });
    return result.count;
  }
}

export const journalRepo = new JournalRepository();
