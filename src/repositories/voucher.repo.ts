import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/client';

export interface IVoucherRepository {
  verifyAllVouchers(accountBookId: string): Promise<Prisma.BatchPayload>;
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
}

export const voucherRepo = new VoucherRepository();
