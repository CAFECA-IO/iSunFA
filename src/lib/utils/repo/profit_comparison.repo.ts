import prisma from '@/client';
import { SortOrder } from '@/constants/sort';

export async function getProjectLists(companyId: number) {
  return prisma.project.findMany({
    select: {
      id: true,
      name: true,
    },
    where: {
      companyId,
    },
    orderBy: {
      id: SortOrder.ASC,
    },
  });
}

export async function getIncomeExpenses(
  startDateToTimeStamp: number,
  endDateToTimeStamp: number,
  companyId: number
) {
  return prisma.incomeExpense.groupBy({
    by: ['projectId'],
    _sum: {
      income: true,
      expense: true,
    },
    where: {
      createdAt: {
        gte: startDateToTimeStamp,
        lte: endDateToTimeStamp,
      },
      companyId,
    },
  });
}
