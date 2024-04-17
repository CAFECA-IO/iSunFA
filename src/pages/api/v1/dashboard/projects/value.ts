import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  name: string;
  income: number;
  expenses: number;
};

type ApiResponse = {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload: ResponseData[] | null;
};

const responseDataArray: ResponseData[] = [
  {
    name: 'Project 1',
    income: 70000,
    expenses: 50000,
  },
  {
    name: 'Project 2',
    income: 200000,
    expenses: 130000,
  },
  {
    name: 'Project 3',
    income: 350000,
    expenses: 15000,
  },
  {
    name: 'Project 4',
    income: 40000,
    expenses: 25000,
  },
  {
    name: 'Project 5',
    income: 5000000,
    expenses: 1000000,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const apiResponse: ApiResponse = {
    powerby: 'iSunFa api 1.0.0',
    success: true,
    code: '200',
    message: 'request successful',
    payload: responseDataArray,
  };
  res.status(200).json(apiResponse);
}
