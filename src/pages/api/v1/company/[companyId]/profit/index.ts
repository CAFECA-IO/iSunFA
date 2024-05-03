import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfit } from '@/interfaces/profit';
import { IResponseData } from '@/interfaces/response_data';

const responseDataArray: IProfit[] = [
  {
    period: '2024-03-01',
    income: 70000,
    expenses: 50000,
  },
  {
    period: '2024-03-02',
    income: 200000,
    expenses: 130000,
  },
  {
    period: '2024-03-03',
    income: 30000,
    expenses: 20000,
  },
  {
    period: '2024-03-04',
    income: 10000,
    expenses: 5000,
  },
  {
    period: '2024-03-05',
    income: 5000,
    expenses: 3000,
  },
  {
    period: '2024-03-06',
    income: 10000,
    expenses: 8000,
  },
  {
    period: '2024-03-07',
    income: 20000,
    expenses: 15000,
  },
  {
    period: '2024-03-08',
    income: 30000,
    expenses: 20000,
  },
  {
    period: '2024-03-09',
    income: 40000,
    expenses: 30000,
  },
  {
    period: '2024-03-10',
    income: 50000,
    expenses: 40000,
  },
  {
    period: '2024-03-11',
    income: 60000,
    expenses: 50000,
  },
  {
    period: '2024-03-12',
    income: 70000,
    expenses: 60000,
  },
  {
    period: '2024-03-13',
    income: 80000,
    expenses: 70000,
  },
  {
    period: '2024-03-14',
    income: 90000,
    expenses: 80000,
  },
  {
    period: '2024-03-15',
    income: 100000,
    expenses: 90000,
  },
  {
    period: '2024-03-16',
    income: 110000,
    expenses: 100000,
  },
  {
    period: '2024-03-17',
    income: 120000,
    expenses: 110000,
  },
  {
    period: '2024-03-18',
    income: 130000,
    expenses: 120000,
  },
  {
    period: '2024-03-19',
    income: 140000,
    expenses: 130000,
  },
  {
    period: '2024-03-20',
    income: 150000,
    expenses: 140000,
  },
  {
    period: '2024-03-21',
    income: 160000,
    expenses: 150000,
  },
  {
    period: '2024-03-22',
    income: 170000,
    expenses: 160000,
  },
  {
    period: '2024-03-23',
    income: 180000,
    expenses: 170000,
  },
  {
    period: '2024-03-24',
    income: 190000,
    expenses: 180000,
  },
  {
    period: '2024-03-25',
    income: 200000,
    expenses: 190000,
  },
  {
    period: '2024-03-26',
    income: 210000,
    expenses: 200000,
  },
  {
    period: '2024-03-27',
    income: 220000,
    expenses: 210000,
  },
  {
    period: '2024-03-28',
    income: 230000,
    expenses: 220000,
  },
  {
    period: '2024-03-29',
    income: 240000,
    expenses: 230000,
  },
  {
    period: '2024-03-30',
    income: 250000,
    expenses: 240000,
  },
  {
    period: '2024-03-31',
    income: 260000,
    expenses: 250000,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IProfit>>) {
  const { period = 'day' } = req.query;
  if (period === 'day') {
    const apiResponse: IResponseData<IProfit> = {
      powerby: 'iSunFa api 1.0.0',
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  }
}
