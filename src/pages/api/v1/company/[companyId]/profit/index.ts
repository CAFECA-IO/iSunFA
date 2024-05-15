import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfit } from '@/interfaces/profit';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { Period } from '@/interfaces/chart_unit';

const responseDataArray: IProfit[] = [
  {
    income: 70000,
    expenses: 50000,
    date: new Date('2024-03-01'),
    profit: 20000,
  },
  {
    income: 200000,
    expenses: 130000,
    date: new Date('2024-03-02'),
    profit: 70000,
  },
  {
    income: 30000,
    expenses: 20000,
    date: new Date('2024-03-03'),
    profit: 10000,
  },
  {
    income: 10000,
    expenses: 5000,
    date: new Date('2024-03-04'),
    profit: 5000,
  },
  {
    income: 5000,
    expenses: 3000,
    date: new Date('2024-03-05'),
    profit: 2000,
  },
  {
    income: 10000,
    expenses: 8000,
    date: new Date('2024-03-06'),
    profit: 2000,
  },
  {
    income: 20000,
    expenses: 15000,
    date: new Date('2024-03-07'),
    profit: 5000,
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfit[] | IProfit>>
) {
  const { period = Period.WEEK } = req.query;
  try {
    if (period === Period.WEEK) {
      const { httpCode, result } = formatApiResponse<IProfit[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray
      );
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProfit>(error.message, {} as IProfit);
    res.status(httpCode).json(result);
  }
}
