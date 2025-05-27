import prisma from '@/client';
import { ProjectStage } from '@/constants/project';

export async function getIncomeExpenseToday(
  startDayTimestampOfTargetTime: number,
  endDayTimestampOfTargetTime: number,
  accountBookId: number
) {
  const IncomeExpenseToday = await prisma.incomeExpense.findMany({
    select: {
      income: true,
      expense: true,
    },
    where: {
      createdAt: {
        gte: startDayTimestampOfTargetTime,
        lte: endDayTimestampOfTargetTime,
      },
      accountBookId,
    },
  });
  return IncomeExpenseToday;
}

export async function getIncomeExpenseYesterday(
  startPreviousDayTimestampOfTargetTime: number,
  endPreviousDayTimestampOfTargetTime: number,
  accountBookId: number
) {
  const IncomeExpenseYesterday = await prisma.incomeExpense.findMany({
    select: {
      income: true,
      expense: true,
    },
    where: {
      createdAt: {
        gte: startPreviousDayTimestampOfTargetTime,
        lte: endPreviousDayTimestampOfTargetTime,
      },
      accountBookId,
    },
  });
  return IncomeExpenseYesterday;
}

export async function getProjectsIncomeExpense(accountBookId: number) {
  const projectsIncomeExpense = await prisma.incomeExpense.groupBy({
    by: ['projectId'],
    _sum: {
      income: true,
      expense: true,
    },
    where: {
      accountBookId,
    },
  });
  return projectsIncomeExpense;
}

export async function getPreLaunchProjectCount(accountBookId: number) {
  const preLaunchProject = await prisma.project.count({
    where: {
      stage: ProjectStage.BETA_TESTING,
      accountBookId,
    },
  });
  return preLaunchProject;
}
