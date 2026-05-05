import { prisma } from "@/lib/prisma";
import { Prisma, Journal } from "@/generated";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { IJournalFilterOptions } from "@/interfaces/prisma_filter_option";
import { VerifyStatus } from "@/constants/verify_status";

// Info: (20260327 - Luphia) 定義共用的 Return Type 讓型別更嚴謹
type JournalWithRelations = Prisma.JournalGetPayload<{
  include: { file: true };
}> & {
  voucherId?: string;
  esgRecordId?: string;
};

export interface IJournalRepository {
  createJournal(data: Prisma.JournalUncheckedCreateInput): Promise<Journal>;
  countJournals(where: Prisma.JournalWhereInput): Promise<number>;
  getJournalsByFilter(
    options: IJournalFilterOptions,
  ): Promise<JournalWithRelations[]>;
  countJournalsByFilter(options: IJournalFilterOptions): Promise<number>;
  getJournals(
    args: Prisma.JournalFindManyArgs,
  ): Promise<JournalWithRelations[]>;
  getJournalById(id: string): Promise<JournalWithRelations | null>;
  updateJournal(
    id: string,
    data: Prisma.JournalUpdateInput,
  ): Promise<JournalWithRelations>;
  deleteJournal(id: string): Promise<Journal>;
  verifyAllJournals(accountBookId: string): Promise<Prisma.BatchPayload>;
  getJournalSummary(
    accountBookId: string,
  ): Promise<{
    todayJournalCount: number;
    pendingJournalCount: number;
    aiAverageConfidence: number;
  }>;
  updateManyJournalsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.JournalUpdateInput,
  ): Promise<Prisma.BatchPayload>;
}

export class JournalRepository implements IJournalRepository {
  async createJournal(data: Prisma.JournalUncheckedCreateInput) {
    return prisma.journal.create({ data });
  }

  async countJournals(where: Prisma.JournalWhereInput) {
    return prisma.journal.count({ where });
  }

  private buildJournalWhereClause(
    options: IJournalFilterOptions,
  ): Prisma.JournalWhereInput {
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

  async getJournalsByFilter(
    options: IJournalFilterOptions,
  ): Promise<JournalWithRelations[]> {
    const where = this.buildJournalWhereClause(options);
    const skip =
      options.page && options.limit
        ? (options.page - 1) * options.limit
        : undefined;
    const take = options.limit || undefined;

    return this.getJournals({
      where,
      skip,
      take,
      orderBy: { tradingDate: options.sort || "desc" },
    });
  }

  async countJournalsByFilter(options: IJournalFilterOptions): Promise<number> {
    const where = this.buildJournalWhereClause(options);
    return this.countJournals(where);
  }

  async getJournals(
    args: Prisma.JournalFindManyArgs,
  ): Promise<JournalWithRelations[]> {
    // Info: (20260327 - Luphia) 確保一定有 include file，並讓 Prisma 自動推導型別
    const mergedArgs = {
      ...args,
      include: { ...args.include, file: true },
    };

    const journals = await prisma.journal.findMany(mergedArgs);
    if (journals.length === 0) return [];

    const fileIds = Array.from(
      new Set(
        journals.map((j) => j.fileId).filter((id): id is string => id !== null),
      ),
    );

    if (fileIds.length === 0) {
      return journals.map((journal) => ({ ...journal }));
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

    return journals.map((journal) => {
      const compositeKey = `${journal.fileId}_${journal.accountBookId}`;
      return {
        ...journal,
        voucherId: journal.fileId ? voucherMap.get(compositeKey) : undefined,
        esgRecordId: journal.fileId
          ? esgRecordMap.get(compositeKey)
          : undefined,
      };
    });
  }

  async getJournalById(id: string): Promise<JournalWithRelations | null> {
    const journal = await prisma.journal.findUnique({
      where: { id },
      include: { file: true },
    });

    if (!journal) return null;

    const relations = await this.getRelationsForJournal(
      journal.fileId,
      journal.accountBookId,
    );

    return {
      ...journal,
      ...relations,
    };
  }

  async updateJournal(
    id: string,
    data: Prisma.JournalUpdateInput,
  ): Promise<JournalWithRelations> {
    const journal = await prisma.journal.update({
      where: { id },
      data,
      include: { file: true },
    });

    const relations = await this.getRelationsForJournal(
      journal.fileId,
      journal.accountBookId,
    );

    return {
      ...journal,
      ...relations,
    };
  }

  async deleteJournal(id: string) {
    return prisma.journal.delete({
      where: { id },
    });
  }

  async verifyAllJournals(accountBookId: string) {
    return prisma.journal.updateMany({
      where: {
        accountBookId,
        isVerified: false,
      },
      data: {
        isVerified: true,
      },
    });
  }

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
  async updateManyJournalsByFile(
    fileId: string,
    accountBookId: string,
    data: Prisma.JournalUpdateInput,
  ) {
    return prisma.journal.updateMany({
      where: { fileId, accountBookId },
      data,
    });
  }

  private async getRelationsForJournal(
    fileId: string | null,
    accountBookId: string,
  ) {
    if (!fileId) return { voucherId: undefined, esgRecordId: undefined };

    const [voucher, esgRecord] = await Promise.all([
      prisma.voucher.findFirst({
        where: { fileId, accountBookId },
        select: { id: true },
      }),
      prisma.esgRecord.findFirst({
        where: { fileId, accountBookId },
        select: { id: true },
      }),
    ]);

    return {
      voucherId: voucher?.id,
      esgRecordId: esgRecord?.id,
    };
  }
}

export const journalRepo = new JournalRepository();
