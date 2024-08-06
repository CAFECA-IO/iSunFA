import prisma from '@/client';
import { ProjectStage } from '@/constants/project';

export async function getIncomeExpenseToday(
  startDayTimestampOfTargetTime: number,
  endDayTimestampOfTargetTime: number,
  companyId: number
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
      companyId,
    },
  });
  return IncomeExpenseToday;
}

export async function getIncomeExpenseYesterday(
  startPreviousDayTimestampOfTargetTime: number,
  endPreviousDayTimestampOfTargetTime: number,
  companyId: number
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
      companyId,
    },
  });
  return IncomeExpenseYesterday;
}

export async function getProjectsIncomeExpense(companyId: number) {
  const projectsIncomeExpense = await prisma.incomeExpense.groupBy({
    by: ['projectId'],
    _sum: {
      income: true,
      expense: true,
    },
    where: {
      companyId,
    },
  });
  return projectsIncomeExpense;
}

export async function getPreLaunchProjectCount(companyId: number) {
  const preLaunchProject = await prisma.project.count({
    where: {
      stage: ProjectStage.BETA_TESTING,
      companyId,
    },
  });
  return preLaunchProject;
}
