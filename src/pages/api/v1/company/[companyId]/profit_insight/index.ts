import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitInsight } from '@/interfaces/project_insight';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { ONE_DAY_IN_MS } from '@/constants/time';
import { ProjectStage } from '@/constants/project';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeyStr } from '@/constants/auth';

async function getProfitChange(targetTime: number, companyId: number) {
  // Info: startDayTimestampOfTargetTime, endDayTimestampOfTargetTime, startPreviousDayTimestampOfTargetTime, endPreviousDayTimestampOfTargetTime (20240607 - Gibbs)
  const startDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(0, 0, 0, 0)
  );
  const endDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(23, 59, 59, 999)
  );
  const startPreviousDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(0, 0, 0, 0) - ONE_DAY_IN_MS
  );
  const endPreviousDayTimestampOfTargetTime = timestampInSeconds(
    new Date(targetTime).setHours(23, 59, 59, 999) - ONE_DAY_IN_MS
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
  const emptyToday = IncomeExpenseToday.length === 0;
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
  const emptyYesterday = IncomeExpenseYesterday.length === 0;
  const profitYesterday = IncomeExpenseYesterday.reduce((acc, yesterday) => {
    return acc + (yesterday.income! - yesterday.expense!);
  }, 0);
  const profitChange = (profitToday - profitYesterday) / profitYesterday || 0;
  const emptyProfitChange = emptyToday && emptyYesterday;
  return { profitChange, emptyProfitChange };
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
  const emptyTopProjectRoi = projectsIncomeExpense.length === 0;
  const topProjectRoi = projectsIncomeExpense.reduce((acc, project) => {
    // Info: (20240527 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
    // eslint-disable-next-line no-underscore-dangle
    const roi = (project._sum.income! - project._sum.expense!) / project._sum.income!;
    return roi > acc ? roi : acc;
  }, 0);
  return { topProjectRoi, emptyTopProjectRoi };
}

async function getPreLaunchProject(companyId: number) {
  const preLaunchProject = await prisma.project.count({
    where: {
      stage: ProjectStage.BETA_TESTING,
      companyId,
    },
  });
  const emptyPreLaunchProject = preLaunchProject === 0;
  return { preLaunchProject, emptyPreLaunchProject };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitInsight>>
) {
  try {
    if (req.method === 'GET') {
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization([AuthFunctionsKeyStr.admin], { userId, companyId });
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const targetTime = new Date().getTime();
      const { profitChange, emptyProfitChange } = await getProfitChange(targetTime, companyId);
      const { preLaunchProject, emptyPreLaunchProject } = await getPreLaunchProject(companyId);
      const { topProjectRoi, emptyTopProjectRoi } = await getTopProjectRoi(companyId);
      const { httpCode, result } = formatApiResponse<IProfitInsight>(STATUS_MESSAGE.SUCCESS_GET, {
        profitChange,
        topProjectRoi,
        preLaunchProject,
        emptyProfitChange,
        emptyTopProjectRoi,
        emptyPreLaunchProject,
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
