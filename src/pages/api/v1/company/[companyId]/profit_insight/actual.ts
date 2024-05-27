import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitInsight } from '@/interfaces/project_insight';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

async function getPofitChange() {
  // Info: (20240524 - Gibbs) startOfTodayTimestamp, endOfTodayTimestamp, startOfYesterdayTimestamp, endOfYesterdayTimestamp
  const startOfTodayTimestamp = timestampInSeconds(new Date().setHours(0, 0, 0, 0));
  const endOfTodayTimestamp = timestampInSeconds(new Date().setHours(23, 59, 59, 999));
  const startOfYesterdayTimestamp = timestampInSeconds(
    new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000
  );
  const endOfYesterdayTimestamp = timestampInSeconds(
    new Date().setHours(23, 59, 59, 999) - 24 * 60 * 60 * 1000
  );
  const IncomeExpenseToday = await prisma.cashflow.groupBy({
    by: ['createdAt'],
    _sum: {
      income: true,
      expense: true,
    },
    where: {
      createdAt: {
        gte: startOfTodayTimestamp,
        lte: endOfTodayTimestamp,
      },
    },
  });
  const profitToday = IncomeExpenseToday.reduce((acc, today) => {
    // eslint-disable-next-line no-underscore-dangle
    return acc + (today._sum.income! - today._sum.expense!);
  }, 0);
  const IncomeExpenseYesterday = await prisma.cashflow.groupBy({
    by: ['createdAt'],
    _sum: {
      income: true,
      expense: true,
    },
    where: {
      createdAt: {
        gte: startOfYesterdayTimestamp,
        lte: endOfYesterdayTimestamp,
      },
    },
  });
  const profitYesterday = IncomeExpenseYesterday.reduce((acc, yesterday) => {
    // eslint-disable-next-line no-underscore-dangle
    return acc + (yesterday._sum.income! - yesterday._sum.expense!);
  }, 0);
  const profitChange = (profitToday - profitYesterday) / profitYesterday;
  return profitChange;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitInsight>>
) {
  try {
    if (req.method === 'GET') {
      const profitChange = await getPofitChange();
      const preLaunchProject = await prisma.project.count({
        where: {
          stage: 'Beta Testing',
        },
      });
      const projectsROI = await prisma.cashflow.groupBy({
        by: ['projectId'],
        _sum: {
          income: true,
          expense: true,
        },
      });
      const topProjectRoi = projectsROI.reduce((acc, project) => {
        // eslint-disable-next-line no-underscore-dangle
        const roi = (project._sum.income! - project._sum.expense!) / project._sum.income!;
        return roi > acc ? roi : acc;
      }, 0);

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
