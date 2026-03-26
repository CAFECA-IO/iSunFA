import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/client';

export class JournalRepository {
  async createJournal(data: Prisma.JournalUncheckedCreateInput) {
    return prisma.journal.create({ data });
  }

  async countJournals(where: Prisma.JournalWhereInput) {
    return prisma.journal.count({ where });
  }

  async getJournals(args: Prisma.JournalFindManyArgs) {
    return prisma.journal.findMany(args) as unknown as Promise<Prisma.JournalGetPayload<{ include: { file: true } }>[]>;
  }

  async getJournalById(id: string) {
    return prisma.journal.findUnique({
      where: { id },
      include: { file: true },
    });
  }

  async updateJournal(id: string, data: Prisma.JournalUpdateInput) {
    return prisma.journal.update({
      where: { id },
      data,
      include: { file: true },
    });
  }

  async deleteJournal(id: string) {
    return prisma.journal.delete({
      where: { id },
    });
  }

  async getJournalSummary(accountBookId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayJournalCount = await prisma.journal.count({
      where: { accountBookId, tradingDate: { gte: startOfToday } },
    });

    const pendingJournalCount = await prisma.journal.count({
      where: { accountBookId, isVerified: false },
    });

    const aiAverageConfidenceAggr = await prisma.journal.aggregate({
      where: { accountBookId },
      _avg: { confidence: true },
    });
    
    const aiAverageConfidence = Math.round(aiAverageConfidenceAggr._avg.confidence || 0);

    return { todayJournalCount, pendingJournalCount, aiAverageConfidence };
  }
}

export const journalRepo = new JournalRepository();
