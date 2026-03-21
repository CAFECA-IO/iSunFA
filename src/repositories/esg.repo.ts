import { prisma } from '@/lib/prisma';
import { EsgDashboardSummary } from '@/generated/client';

export interface IEsgRepository {
  getDashboardSummaryByAccountBookId(accountBookId: string): Promise<EsgDashboardSummary | null>;
}

export class EsgRepository implements IEsgRepository {
  async getDashboardSummaryByAccountBookId(accountBookId: string) {
    return prisma.esgDashboardSummary.findUnique({
      where: { accountBookId }
    });
  }
}

export const esgRepo = new EsgRepository();
