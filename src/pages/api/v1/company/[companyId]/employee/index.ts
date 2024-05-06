import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { EasyEmployee, IEmployee } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';

const responseDataArray: EasyEmployee[] = [
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

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<EasyEmployee>>
) {
  if (req.method === 'GET') {
    const apiResponse: IResponseData<EasyEmployee> = {
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
    }: IEmployee = req.body;
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
        payload: null,
      });
      return;
    }
    res.status(200).json({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'create employee successful',
      payload: null,
    });
  }
}
