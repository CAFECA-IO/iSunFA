import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitPercent } from '@/interfaces/profit';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { Period } from '@/interfaces/chart_unit';

const responseDataArray: IProfitPercent[] = [
  {
    income: 0.7,
    expenses: 0.5,
    date: new Date('2024-03-01'),
    profit: 0.2,
  },
  {
    income: 0.2,
    expenses: 0.13,
    date: new Date('2024-03-02'),
    profit: 0.07,
  },
  {
    income: 0.3,
    expenses: 0.2,
    date: new Date('2024-03-03'),
    profit: 0.1,
  },
  {
    income: 0.1,
    expenses: 0.05,
    date: new Date('2024-03-04'),
    profit: 0.05,
  },
  {
    income: 0.05,
    expenses: 0.03,
    date: new Date('2024-03-05'),
    profit: 0.02,
  },
  {
    income: 0.1,
    expenses: 0.08,
    date: new Date('2024-03-06'),
    profit: 0.02,
  },
  {
    income: 0.2,
    expenses: 0.15,
    date: new Date('2024-03-07'),
    profit: 0.05,
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitPercent[] | IProfitPercent>>
) {
  const { period = Period.WEEK } = req.query;
  try {
    if (period === Period.WEEK) {
      const { httpCode, result } = formatApiResponse<IProfitPercent[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray
      );
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProfitPercent>(
      error.message,
      {} as IProfitPercent
    );
    res.status(httpCode).json(result);
  }
}
