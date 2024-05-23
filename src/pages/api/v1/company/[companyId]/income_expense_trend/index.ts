import type { NextApiRequest, NextApiResponse } from 'next';
import {
  IIncomeExpenseTrendChartData,
  DUMMY_INCOME_EXPENSE_TREND_CHART_DATA,
} from '@/interfaces/income_expense_trend_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const incomeExpenseTrendChartData = DUMMY_INCOME_EXPENSE_TREND_CHART_DATA;

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IIncomeExpenseTrendChartData>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const { httpCode, result } = formatApiResponse<IIncomeExpenseTrendChartData>(
      STATUS_MESSAGE.SUCCESS_GET,
      incomeExpenseTrendChartData.week
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IIncomeExpenseTrendChartData>(
      error.message,
      {} as IIncomeExpenseTrendChartData
    );
    res.status(httpCode).json(result);
  }
}
