import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';

type ResponseData = {
  id: number;
  name: string;
  salary: number;
  department: string;
};

type ResponseDataEmployee = {
  id: number;
  name: string;
  salary: number;
  department: string;
  email: string;
  start_date: Date;
  bonus: number;
  salary_payment_mode: string;
  pay_frequency: string;
  projects: string[];
  insurance_payments: number;
  additional_of_total: number;
};

type ApiResponse = {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload?: ResponseData[] | ResponseDataEmployee[] | null;
};

type Employee = {
  name: string;
  salary: number;
  department: string;
  start_date: Date;
  bonus: number;
  salary_payment_mode: string;
  pay_frequency: string;
};

const responseDataArray: ResponseData[] = [
  {
    id: 1,
    name: 'John Doe',
    salary: 45000,
    department: 'Tech Dev',
  },
  {
    id: 2,
    name: 'Jane Smith',
    salary: 55000,
    department: 'Product Design',
  },
  {
    id: 3,
    name: 'Bob Brown',
    salary: 60000,
    department: 'Marketing',
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
    const {
      name,
      salary,
      department,
      start_date: startDate,
      bonus,
      salary_payment_mode: salaryPaymentMode,
      pay_frequency: payFrequency,
    }: Employee = req.body;
    if (
      !name ||
      !salary ||
      !department ||
      !startDate ||
      !bonus ||
      !salaryPaymentMode ||
      !payFrequency
    ) {
      res.status(400).json({
        powerby: 'iSunFA v' + version,
        success: false,
        code: '400',
        message: 'create employee failed',
      });
      return;
    }
    res.status(200).json({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'create employee successful',
    });
  }
}
