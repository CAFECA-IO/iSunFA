import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitInsight } from '@/interfaces/project_insight';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';
import { checkAdminSession } from '@/lib/utils/session_check';

async function getProfitChange(targetTime: number, companyId: number) {
  // Info: startDayTimestampOfTargetTime, endDayTimestampOfTargetTime, startPreviousDayTimestampOfTargetTime, endPreviousDayTimestampOfTargetTime (20240607 - Gibbs)
  const startDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(0, 0, 0, 0)
  );
  const endDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(23, 59, 59, 999)
  );
  const startPreviousDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000
  );
  const endPreviousDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(23, 59, 59, 999) - 24 * 60 * 60 * 1000
  );
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
  const profitToday = IncomeExpenseToday.reduce((acc, today) => {
    return acc + (today.income! - today.expense!);
  }, 0);
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
  const profitYesterday = IncomeExpenseYesterday.reduce((acc, yesterday) => {
    return acc + (yesterday.income! - yesterday.expense!);
  }, 0);
  const profitChange = (profitToday - profitYesterday) / profitYesterday || 0;
  return profitChange;
}

async function getTopProjectRoi(companyId: number) {
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
  const topProjectRoi = projectsIncomeExpense.reduce((acc, project) => {
    // Info: (20240527 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
    // eslint-disable-next-line no-underscore-dangle
    const roi = (project._sum.income! - project._sum.expense!) / project._sum.income!;
    return roi > acc ? roi : acc;
  }, 0);
  return topProjectRoi;
}

async function getPreLaunchProject(companyId: number) {
  const preLaunchProject = await prisma.project.count({
    where: {
      stage: 'Beta Testing',
      companyId,
    },
  });
  return preLaunchProject;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitInsight>>
) {
  try {
    if (req.method === 'GET') {
      const session = await checkAdminSession(req, res);
      const { companyId } = session;
      const targetTime = new Date().getTime();
      const profitChange = await getProfitChange(targetTime, companyId);
      const preLaunchProject = await getPreLaunchProject(companyId);
      const topProjectRoi = await getTopProjectRoi(companyId);
      const { httpCode, result } = formatApiResponse<IProfitInsight>(STATUS_MESSAGE.SUCCESS_GET, {
        profitChange,
        topProjectRoi,
        preLaunchProject,
      });
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProfitInsight>(
      error.message,
      {} as IProfitInsight
    );
    res.status(httpCode).json(result);
  }
}
