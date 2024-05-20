import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitComparison } from '@/interfaces/profit';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseData: IProfitComparison = {
  startDate: new Date('2024-04-01'),
  endDate: new Date('2024-05-01'),
  comparisons: [
    {
      projectName: 'iSunFA',
      income: 170000,
      expenses: 150000,
      profit: 20000,
    },
    {
      projectName: 'BAIFA',
      income: 2000000,
      expenses: 1500000,
      profit: 500000,
    },
    {
      projectName: 'iSunOne',
      income: 250000,
      expenses: 80000,
      profit: 170000,
    },
  ],
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitComparison>>
) {
  const { startDate, endDate, page = 1, limit = 10 } = req.query;
  try {
    if (startDate && endDate && page && limit) {
      const { httpCode, result } = formatApiResponse<IProfitComparison>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseData
      );
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProfitComparison>(
      error.message,
      {} as IProfitComparison
    );
    res.status(httpCode).json(result);
  }
}
