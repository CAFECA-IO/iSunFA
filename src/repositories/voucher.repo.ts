import { prisma } from '@/lib/prisma';
import { Prisma, Voucher } from '@/generated/client';
import { AIAnalysisStatus } from '@/constants/ai_analysis_status';

export interface IVoucherRepository {
  verifyAllVouchers(accountBookId: string): Promise<Prisma.BatchPayload>;
  getVerifiedIncomesByAccountBookId(accountBookId: string): Promise<Prisma.VoucherGetPayload<{ include: { lines: true } }>[]>;
  createVoucher(data: Prisma.VoucherUncheckedCreateInput): Promise<Voucher>;
  countVouchers(where: Prisma.VoucherWhereInput): Promise<number>;
  getVouchers(args: Prisma.VoucherFindManyArgs): Promise<Prisma.VoucherGetPayload<{ include: { file: true; user: true; lines: true } }>[]>;
  getVoucherById(id: string): Promise<Prisma.VoucherGetPayload<{ include: { file: true; user: true; lines: true } }> | null>;
  updateVoucher(id: string, data: Prisma.VoucherUpdateInput): Promise<Prisma.VoucherGetPayload<{ include: { lines: true; user: true; file: true } }> | null>;
  getVoucherSummary(accountBookId: string): Promise<{ todayVoucherCount: number; monthTotalAmount: number; pendingVoucherCount: number; aiAverageConfidence: number; }>;
}

export class VoucherRepository implements IVoucherRepository {
  async verifyAllVouchers(accountBookId: string) {
    return prisma.voucher.updateMany({
      where: {
        accountBookId,
        isVerified: false
      },
      data: {
        isVerified: true
      }
    });
  }

  async getVerifiedIncomesByAccountBookId(accountBookId: string) {
    return prisma.voucher.findMany({
      where: {
        accountBookId,
        tradingType: 'INCOME',
        isVerified: true
      },
      include: { lines: true }
    });
  }

  async createVoucher(data: Prisma.VoucherUncheckedCreateInput) {
    return prisma.voucher.create({ data });
  }

  async countVouchers(where: Prisma.VoucherWhereInput) {
    return prisma.voucher.count({ where });
  }

  async getVouchers(args: Prisma.VoucherFindManyArgs) {
    return prisma.voucher.findMany(args) as unknown as Promise<Prisma.VoucherGetPayload<{ include: { file: true; user: true; lines: true } }>[]>;
  }

  async getVoucherById(id: string) {
    return prisma.voucher.findUnique({
      where: { id },
      include: { file: true, user: true, lines: true },
    });
  }

  async updateVoucher(id: string, data: Prisma.VoucherUpdateInput) {
    return prisma.voucher.update({
      where: { id },
      data,
      include: { lines: true, user: true, file: true },
    });
  }

  async getVoucherSummary(accountBookId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    const aiAverageConfidence = Math.round(aiAverageConfidenceAggr._avg.confidence || 0);

    return { todayVoucherCount, monthTotalAmount, pendingVoucherCount, aiAverageConfidence };
  }
}

export const voucherRepo = new VoucherRepository();
