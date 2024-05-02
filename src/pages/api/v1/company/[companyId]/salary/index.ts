import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';

type ResponseData = {
  department: string;
  names_ids: { name: string; id: number }[];
};

type ApiResponse = {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload?: ResponseData[] | null;
};

type SalaryRequest = {
  description: string;
  start_date: Date;
  end_date: Date;
};

const responseDataArray: ResponseData[] = [
  {
    department: 'Tech Dev',
    names_ids: [
      { name: 'John Doe', id: 1 },
      { name: 'Andy', id: 2 },
      { name: 'Eva', id: 3 },
    ],
  },
  {
    department: 'Product Design',
    names_ids: [
      { name: 'Jane Smith', id: 4 },
      { name: 'Paul', id: 5 },
    ],
  },
  {
    department: 'Marketing',
    names_ids: [
      { name: 'Bob Brown', id: 6 },
      { name: 'Johnny', id: 7 },
      { name: 'Queen', id: 8 },
      { name: 'Lion', id: 9 },
    ],
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method === 'GET') {
    const apiResponse: ApiResponse = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  }
  if (req.method === 'POST') {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({
        powerby: 'iSunFA v' + version,
        success: false,
        code: '400',
        message: 'create salary bookkeeping failed',
      });
      return;
    }
    const { description, start_date: startDate, end_date: endDate }: SalaryRequest = req.body;
    if (!description || !startDate || !endDate) {
      res.status(400).json({
        powerby: 'iSunFA v' + version,
        success: false,
        code: '400',
        message: 'create salary bookkeeping failed',
      });
      return;
    }
    res.status(200).json({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'create salary bookkeeping successful',
    });
  }
}
