import type { NextApiRequest, NextApiResponse } from 'next';
import {
  IProjectROIComparisonChartDataWithPagination,
  generateRandomPaginatedData,
} from '@/interfaces/project_roi_comparison_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseData: IProjectROIComparisonChartDataWithPagination = generateRandomPaginatedData(
  1,
  10
);

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProjectROIComparisonChartDataWithPagination>>
) {
  const { startDate, endDate, currentPage = 1, itemsPerPage = 10 } = req.query;
  try {
    if (startDate && endDate && currentPage && itemsPerPage) {
      const { httpCode, result } = formatApiResponse<IProjectROIComparisonChartDataWithPagination>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseData
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
