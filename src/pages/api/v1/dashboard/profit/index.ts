import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  date: string;
  income: number;
  expenses: number;
};

// 0301 - 0331
const responseDataArray: ResponseData[] = [
  {
    date: '2024-03-01',
    income: 70000,
    expenses: 50000,
  },
  {
    date: '2024-03-02',
    income: 200000,
    expenses: 130000,
  },
  {
    date: '2024-03-03',
    income: 350000,
    expenses: 15000,
  },
  {
    date: '2024-03-04',
    income: 40000,
    expenses: 25000,
  },
  {
    date: '2024-03-05',
    income: 5000000,
    expenses: 1000000,
  },
  {
    date: '2024-03-06',
    income: 70000,
    expenses: 50000,
  },
  {
    date: '2024-03-07',
    income: 200000,
    expenses: 130000,
  },
  {
    date: '2024-03-08',
    income: 350000,
    expenses: 15000,
  },
  {
    date: '2024-03-09',
    income: 40000,
    expenses: 25000,
  },
  {
    date: '2024-03-10',
    income: 5000000,
    expenses: 1000000,
  },
  {
    date: '2024-03-11',
    income: 70000,
    expenses: 50000,
  },
  {
    date: '2024-03-12',
    income: 200000,
    expenses: 130000,
  },
  {
    date: '2024-03-13',
    income: 350000,
    expenses: 15000,
  },
  {
    date: '2024-03-14',
    income: 40000,
    expenses: 25000,
  },
  {
    date: '2024-03-15',
    income: 5000000,
    expenses: 1000000,
  },
  {
    date: '2024-03-16',
    income: 70000,
    expenses: 50000,
  },
  {
    date: '2024-03-17',
    income: 200000,
    expenses: 130000,
  },
  {
    date: '2024-03-18',
    income: 350000,
    expenses: 15000,
  },
  {
    date: '2024-03-19',
    income: 40000,
    expenses: 25000,
  },
  {
    date: '2024-03-20',
    income: 5000000,
    expenses: 1000000,
  },
  {
    date: '2024-03-21',
    income: 70000,
    expenses: 50000,
  },
  {
    date: '2024-03-22',
    income: 200000,
    expenses: 130000,
  },
  {
    date: '2024-03-23',
    income: 350000,
    expenses: 15000,
  },
  {
    date: '2024-03-24',
    income: 40000,
    expenses: 25000,
  },
  {
    date: '2024-03-25',
    income: 5000000,
    expenses: 1000000,
  },
  {
    date: '2024-03-26',
    income: 70000,
    expenses: 50000,
  },
  {
    date: '2024-03-27',
    income: 200000,
    expenses: 130000,
  },
  {
    date: '2024-03-28',
    income: 350000,
    expenses: 15000,
  },
  {
    date: '2024-03-29',
    income: 40000,
    expenses: 25000,
  },
  {
    date: '2024-03-30',
    income: 5000000,
    expenses: 1000000,
  },
  {
    date: '2024-03-31',
    income: 5000000,
    expenses: 1000000,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData[]>) {
  res.status(200).json(responseDataArray);
}
