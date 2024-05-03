import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { EmployeeData, IEmployee } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';

const ResponseDataEmployeeArray: EmployeeData[] = [
  {
    id: 3,
    name: 'Bob Brown',
    salary: 60000,
    department: 'Marketing',
    email: 'bobbrown@example.org',
    start_date: new Date('2021-08-10'),
    bonus: 7500,
    salary_payment_mode: 'Bank Transfer',
    pay_frequency: 'Hourly',
    projects: ['Project A', 'Project B', 'Project C'],
    insurance_payments: 5500,
    additional_of_total: 62000,
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<EmployeeData>>
) {
  if (req.method === 'GET') {
    const { employeeId } = req.query;
    if (employeeId) {
      const apiResponse: IResponseData<EmployeeData> = {
        powerby: 'iSunFA v' + version,
        success: true,
        code: '200',
        message: 'request successful',
        payload: ResponseDataEmployeeArray,
      };
      res.status(200).json(apiResponse);
    }
  }
  if (req.method === 'DELETE') {
    const { employeeId } = req.query;
    if (!employeeId) {
      res.status(400).json({
        powerby: 'iSunFA v' + version,
        success: false,
        code: '400',
        message: 'delete employee failed',
        payload: null,
      });
      return;
    }
    res.status(200).json({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'delete employee successful',
      payload: null,
    });
  }
  if (req.method === 'PUT') {
    const { employeeId } = req.query;
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
      !employeeId ||
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
        message: 'update employee information failed',
        payload: null,
      });
      return;
    }
    res.status(200).json({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'update employee information successful',
      payload: null,
    });
  }
}
