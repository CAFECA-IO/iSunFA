import type { NextApiRequest, NextApiResponse } from 'next';
import { IProjectProgressChartData } from '@/interfaces/project_progress_chart';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, changeDateToTimeStampOfDayEnd } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { isDateFormatYYYYMMDD } from '@/lib/utils/type_guard/date';
import { stageList } from '@/constants/project';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getStatusNumber } from '@/lib/utils/repo/progress.repo';

async function checkEmpty(
  statusNumber: {
    status: string;
    _count: {
      id: number;
    };
  }[]
) {
  // Info: (20240614 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
  // eslint-disable-next-line no-underscore-dangle
  return statusNumber.every((status) => status._count.id === 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date } = req.query;
  try {
    if (date && isDateFormatYYYYMMDD(date as string)) {
      const session = await getSession(req);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const dateToTimeStamp = changeDateToTimeStampOfDayEnd(date as string);
      const statusNumber = await getStatusNumber(dateToTimeStamp, companyId);
      const isEmpty = await checkEmpty(statusNumber);
      const responseData: IProjectProgressChartData = {
        date: dateToTimeStamp,
        categories: stageList,
        series: [
          {
            name: 'Projects',
            data: stageList.map((stage) => {
              const match = statusNumber.find((status) => status.status === stage);
              // Info: (20240612 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
              // eslint-disable-next-line no-underscore-dangle
              return match ? match._count.id : 0;
            }) as number[],
          },
        ],
        empty: isEmpty,
      };
      const { httpCode, result } = formatApiResponse<IProjectProgressChartData>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseData
      );
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProjectProgressChartData>(
      error.message,
      {} as IProjectProgressChartData
    );
    res.status(httpCode).json(result);
  }
}
