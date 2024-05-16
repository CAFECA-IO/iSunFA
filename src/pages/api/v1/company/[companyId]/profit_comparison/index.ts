import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitComparison } from '@/interfaces/profit';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: IProfitComparison[] = [
  {
    name: 'iSunFA',
    profit: [
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
    ],
  },
  {
    name: 'BAIFA',
    profit: [
      {
        income: 70000,
        expenses: 40000,
        date: new Date('2024-03-01'),
        profit: 30000,
      },
      {
        income: 200000,
        expenses: 150000,
        date: new Date('2024-03-02'),
        profit: 50000,
      },
      {
        income: 30000,
        expenses: 10000,
        date: new Date('2024-03-03'),
        profit: 20000,
      },
      {
        income: 10000,
        expenses: 8000,
        date: new Date('2024-03-04'),
        profit: 2000,
      },
      {
        income: 5000,
        expenses: 4000,
        date: new Date('2024-03-05'),
        profit: 1000,
      },
      {
        income: 10000,
        expenses: 7000,
        date: new Date('2024-03-06'),
        profit: 3000,
      },
      {
        income: 21000,
        expenses: 15000,
        date: new Date('2024-03-07'),
        profit: 6000,
      },
    ],
  },
  {
    name: 'iSunOne',
    profit: [
      {
        income: 71000,
        expenses: 50000,
        date: new Date('2024-03-01'),
        profit: 21000,
      },
      {
        income: 250000,
        expenses: 130000,
        date: new Date('2024-03-02'),
        profit: 120000,
      },
      {
        income: 40000,
        expenses: 20000,
        date: new Date('2024-03-03'),
        profit: 20000,
      },
      {
        income: 20000,
        expenses: 5000,
        date: new Date('2024-03-04'),
        profit: 15000,
      },
      {
        income: 6000,
        expenses: 3000,
        date: new Date('2024-03-05'),
        profit: 3000,
      },
      {
        income: 10000,
        expenses: 9000,
        date: new Date('2024-03-06'),
        profit: 1000,
      },
      {
        income: 30000,
        expenses: 15000,
        date: new Date('2024-03-07'),
        profit: 15000,
      },
    ],
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitComparison[] | IProfitComparison>>
) {
  const { startDate, endDate, page = 1, limit = 10 } = req.query;
  try {
    if (startDate && endDate && page && limit) {
      const { httpCode, result } = formatApiResponse<IProfitComparison[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray
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
