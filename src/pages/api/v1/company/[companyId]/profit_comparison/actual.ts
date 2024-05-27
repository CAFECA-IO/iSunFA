import type { NextApiRequest, NextApiResponse } from 'next';
import { IProjectROIComparisonChartDataWithPagination } from '@/interfaces/project_roi_comparison_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProjectROIComparisonChartDataWithPagination>>
) {
  const { startDate, endDate, currentPage = 1, itemsPerPage = 10 } = req.query;
  try {
    if (startDate && endDate && currentPage && itemsPerPage) {
      // Info: (20240527 - Gibbs) transfer startDate to timestamp, using local time
      const startDateToTimeStamp = timestampInSeconds(
        new Date(startDate + 'T00:00:00+08:00').getTime()
      );
      const endDateToTimeStamp = timestampInSeconds(
        new Date(endDate + 'T00:00:00+08:00').getTime()
      );
      const projectLists = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
        },
      });
      const cashflowLists = await prisma.cashflow.groupBy({
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
        },
      });
      const categories: string[] = [];
      const income: number[] = [];
      const expense: number[] = [];

      projectLists.forEach((project) => {
        const match = cashflowLists.find((cashflow) => cashflow.projectId === project.id);
        if (match) {
          categories.push(project.name);
          // Info: (20240527 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
          // eslint-disable-next-line no-underscore-dangle
          income.push(match._sum.income!);
          // Info: (20240527 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
          // eslint-disable-next-line no-underscore-dangle
          expense.push(match._sum.expense!);
        }
      });
      const { httpCode, result } = formatApiResponse<IProjectROIComparisonChartDataWithPagination>(
        STATUS_MESSAGE.SUCCESS_GET,
        {
          startDate: startDateToTimeStamp,
          endDate: endDateToTimeStamp,
          categories,
          series: [income, expense],
          currentPage: Number(currentPage),
          totalPages: Math.ceil(categories.length / Number(itemsPerPage)),
        }
      );
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProjectROIComparisonChartDataWithPagination>(
      error.message,
      {} as IProjectROIComparisonChartDataWithPagination
    );
    res.status(httpCode).json(result);
  }
}
