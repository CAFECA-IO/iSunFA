import type { NextApiRequest, NextApiResponse } from 'next';
import { IProjectProgressChartData, generateRandomData } from '@/interfaces/project_progress_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseData: IProjectProgressChartData = generateRandomData();

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProjectProgressChartData>>
) {
  const { date } = req.query;
  try {
    if (date) {
      const { httpCode, result } = formatApiResponse<IProjectProgressChartData>(
        STATUS_MESSAGE.SUCCESS_GET,
        {
          ...responseData,
        }
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
