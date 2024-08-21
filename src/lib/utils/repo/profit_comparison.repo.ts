import prisma from '@/client';

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
      name: 'asc',
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
