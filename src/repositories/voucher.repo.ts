import { prisma } from "@/lib/prisma";
import { Prisma, Voucher } from "@/generated/client";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export type VoucherWithRelations = Prisma.VoucherGetPayload<{
  include: { file: true; user: true; lines: true };
}> & { journalId?: string; esgRecordId?: string };

export interface IVoucherRepository {
  verifyAllVouchers(accountBookId: string): Promise<Prisma.BatchPayload>;
  getVerifiedIncomesByAccountBookId(
    accountBookId: string,
  ): Promise<Prisma.VoucherGetPayload<{ include: { lines: true } }>[]>;
  createVoucher(data: Prisma.VoucherUncheckedCreateInput): Promise<Voucher>;
  countVouchers(where: Prisma.VoucherWhereInput): Promise<number>;
  getVouchers(
    args: Prisma.VoucherFindManyArgs,
  ): Promise<VoucherWithRelations[]>;
  getVoucherById(id: string): Promise<VoucherWithRelations | null>;
  updateVoucher(
    id: string,
    data: Prisma.VoucherUpdateInput,
  ): Promise<VoucherWithRelations | null>;
  getVoucherSummary(
    accountBookId: string,
  ): Promise<{
    todayVoucherCount: number;
    monthTotalAmount: number;
    pendingVoucherCount: number;
    aiAverageConfidence: number;
  }>;
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
}

export class VoucherRepository implements IVoucherRepository {
  async verifyAllVouchers(accountBookId: string) {
    return prisma.voucher.updateMany({
      where: {
        accountBookId,
        isVerified: false,
      },
      data: {
        isVerified: true,
      },
    });
  }

  async getVerifiedIncomesByAccountBookId(accountBookId: string) {
    return prisma.voucher.findMany({
      where: {
        accountBookId,
        tradingType: "INCOME",
        isVerified: true,
      },
      include: { lines: true },
    });
  }

  async createVoucher(data: Prisma.VoucherUncheckedCreateInput) {
    return prisma.voucher.create({ data });
  }

  async countVouchers(where: Prisma.VoucherWhereInput) {
    return prisma.voucher.count({ where });
  }

  async getVouchers(
    args: Prisma.VoucherFindManyArgs,
  ): Promise<VoucherWithRelations[]> {
    const vouchers = (await prisma.voucher.findMany(
      args,
    )) as unknown as Prisma.VoucherGetPayload<{
      include: { file: true; user: true; lines: true };
    }>[];
    if (vouchers.length === 0) return vouchers as VoucherWithRelations[];

    const fileIds = Array.from(
      new Set(vouchers.map((v) => v.fileId).filter(Boolean)),
    ) as string[];
    let journals: { id: string; fileId: string | null }[] = [];
    let esgRecords: { id: string; fileId: string | null }[] = [];

    if (fileIds.length > 0) {
      journals = await prisma.journal.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true },
      });
      esgRecords = await prisma.esgRecord.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true },
      });
    }

    return vouchers.map((voucher) => {
      const journalId = journals.find((j) => j.fileId === voucher.fileId)?.id;
      const esgRecordId = esgRecords.find(
        (e) => e.fileId === voucher.fileId,
      )?.id;
      return {
        ...voucher,
        journalId,
        esgRecordId,
      };
    }) as VoucherWithRelations[];
  }

  async getVoucherById(id: string): Promise<VoucherWithRelations | null> {
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { file: true, user: true, lines: true },
    });

    if (!voucher) return null;

    let journalId: string | undefined;
    let esgRecordId: string | undefined;

    if (voucher.fileId) {
      const journal = await prisma.journal.findFirst({
        where: { fileId: voucher.fileId, accountBookId: voucher.accountBookId },
        select: { id: true },
      });
      if (journal) journalId = journal.id;

      const esgRecord = await prisma.esgRecord.findFirst({
        where: { fileId: voucher.fileId, accountBookId: voucher.accountBookId },
        select: { id: true },
      });
      if (esgRecord) esgRecordId = esgRecord.id;
    }

    return {
      ...voucher,
      journalId,
      esgRecordId,
    } as VoucherWithRelations;
  }

  async updateVoucher(
    id: string,
    data: Prisma.VoucherUpdateInput,
  ): Promise<VoucherWithRelations | null> {
    const voucher = await prisma.voucher.update({
      where: { id },
      data,
      include: { file: true, user: true, lines: true },
    });

    if (!voucher) return null;

    let journalId: string | undefined;
    let esgRecordId: string | undefined;

    if (voucher.fileId) {
      const journal = await prisma.journal.findFirst({
        where: { fileId: voucher.fileId, accountBookId: voucher.accountBookId },
        select: { id: true },
      });
      if (journal) journalId = journal.id;

      const esgRecord = await prisma.esgRecord.findFirst({
        where: { fileId: voucher.fileId, accountBookId: voucher.accountBookId },
        select: { id: true },
      });
      if (esgRecord) esgRecordId = esgRecord.id;
    }

    return {
      ...voucher,
      journalId,
      esgRecordId,
    } as VoucherWithRelations;
  }

  async getVoucherSummary(accountBookId: string) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayVoucherCount = await prisma.voucher.count({
      where: { accountBookId, tradingDate: { gte: startOfToday } },
    });

    const monthTotalAmountAggr = await prisma.voucherLine.aggregate({
      where: {
        isDebit: true,
        voucher: {
          accountBookId,
          tradingDate: { gte: startOfMonth },
        },
      },
      _sum: { amount: true },
    });
    const monthTotalAmount = monthTotalAmountAggr._sum.amount || 0;

    const pendingVoucherCount = await prisma.voucher.count({
      where: { accountBookId, isVerified: false },
    });

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
}

export const voucherRepo = new VoucherRepository();
