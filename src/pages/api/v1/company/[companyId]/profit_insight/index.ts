import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitInsight } from '@/interfaces/project_insight';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { ONE_DAY_IN_MS } from '@/constants/time';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import {
  getIncomeExpenseToday,
  getIncomeExpenseYesterday,
  getProjectsIncomeExpense,
  getPreLaunchProjectCount,
} from '@/lib/utils/repo/profit_insight.repo';
import { loggerError } from '@/lib/utils/logger_back';

export async function getProfitChange(targetTime: number, companyId: number) {
  // Info: (20240607 - Gibbs) startDayTimestampOfTargetTime, endDayTimestampOfTargetTime, startPreviousDayTimestampOfTargetTime, endPreviousDayTimestampOfTargetTime
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
  const IncomeExpenseToday = await getIncomeExpenseToday(
    startDayTimestampOfTargetTime,
    endDayTimestampOfTargetTime,
    companyId
  );
  const emptyToday = IncomeExpenseToday.length === 0;
  const profitToday = IncomeExpenseToday.reduce((acc, today) => {
    return acc + (today.income! - today.expense!);
  }, 0);
  const IncomeExpenseYesterday = await getIncomeExpenseYesterday(
    startPreviousDayTimestampOfTargetTime,
    endPreviousDayTimestampOfTargetTime,
    companyId
  );
  const emptyYesterday = IncomeExpenseYesterday.length === 0;
  const profitYesterday = IncomeExpenseYesterday.reduce((acc, yesterday) => {
    return acc + (yesterday.income! - yesterday.expense!);
  }, 0);
  const profitChange = (profitToday - profitYesterday) / profitYesterday || 0;
  const emptyProfitChange = emptyToday && emptyYesterday;
  return { profitChange, emptyProfitChange };
}

export async function getTopProjectRoi(companyId: number) {
  const projectsIncomeExpense = await getProjectsIncomeExpense(companyId);
  const emptyTopProjectRoi = projectsIncomeExpense.length === 0;
  const topProjectRoi = projectsIncomeExpense.reduce((acc, project) => {
    // Info: (20240527 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
    // eslint-disable-next-line no-underscore-dangle
    const roi = (project._sum.income! - project._sum.expense!) / project._sum.income!;
    return roi > acc ? roi : acc;
  }, 0);
  return { topProjectRoi, emptyTopProjectRoi };
}

export async function getPreLaunchProject(companyId: number) {
  const preLaunchProject = await getPreLaunchProjectCount(companyId);
  const emptyPreLaunchProject = preLaunchProject === 0;
  return { preLaunchProject, emptyPreLaunchProject };
}

export async function handleGetRequest(companyId: number): Promise<IProfitInsight> {
  const targetTime = getTimestampNow();
  const { profitChange, emptyProfitChange } = await getProfitChange(targetTime, companyId);
  const { preLaunchProject, emptyPreLaunchProject } = await getPreLaunchProject(companyId);
  const { topProjectRoi, emptyTopProjectRoi } = await getTopProjectRoi(companyId);

  const profitInsight: IProfitInsight = {
    profitChange,
    topProjectRoi,
    preLaunchProject,
    emptyProfitChange,
    emptyTopProjectRoi,
    emptyPreLaunchProject,
  };
  return profitInsight;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitInsight | null>>
) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  let payload: IProfitInsight | null = null;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  if (isAuth) {
    try {
      switch (req.method) {
        case 'GET': {
          payload = await handleGetRequest(companyId);
          statusMessage = STATUS_MESSAGE.SUCCESS;
          break;
        }
        default: {
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
          break;
        }
      }
    } catch (_error) {
      const logError = loggerError(
        userId,
        'request handler in profit_insight/index.ts failed',
        _error as Error
      );
      logError.error('request handler in profit_insight/index.ts failed');
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  const { httpCode, result } = formatApiResponse<IProfitInsight | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
