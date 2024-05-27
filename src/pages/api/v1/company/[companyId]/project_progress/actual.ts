import type { NextApiRequest, NextApiResponse } from 'next';
import { IProjectProgressChartData } from '@/interfaces/project_progress_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProjectProgressChartData>>
) {
  const { date } = req.query;
  try {
    if (date) {
      const dateToTimeStamp = timestampInSeconds(
        new Date((date as string) + 'T00:00:00+08:00').getTime()
      );
      const statusNumber = await prisma.milestone.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
        where: {
          startDate: {
            lte: dateToTimeStamp,
          },
          endDate: {
            gte: dateToTimeStamp,
          },
        },
      });
      const responseData: IProjectProgressChartData = {
        date: dateToTimeStamp,
        categories: statusNumber.map((status) => status.status),
        series: [
          {
            name: 'Projects',
            // eslint-disable-next-line no-underscore-dangle
            data: statusNumber.map((status) => status._count.id),
          },
        ],
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
