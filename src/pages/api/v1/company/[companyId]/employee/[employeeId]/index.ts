import type { NextApiRequest, NextApiResponse } from 'next';
import { EmployeeData, IEmployee } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

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
  res: NextApiResponse<IResponseData<EmployeeData[] | EmployeeData>>
) {
  try {
    if (req.method === 'GET') {
      const { employeeId } = req.query;
      if (employeeId) {
        const { httpCode, result } = formatApiResponse<EmployeeData[]>(
          STATUS_MESSAGE.SUCCESS_GET,
          ResponseDataEmployeeArray
        );
        res.status(httpCode).json(result);
      }
    }
    if (req.method === 'DELETE') {
      const { employeeId } = req.query;
      if (!employeeId) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const { httpCode, result } = formatApiResponse<EmployeeData>(
        STATUS_MESSAGE.SUCCESS_DELETE,
        null
      );
      res.status(httpCode).json(result);
    }
    if (req.method === 'PUT') {
      const { employeeId } = req.query;
      const {
        name,
        salary,
        departmentId,
        startDate,
        bonus,
        salaryPayMode,
        payFrequency,
      }: IEmployee = req.body;
      if (
        !employeeId ||
        !name ||
        !salary ||
        !departmentId ||
        !startDate ||
        !bonus ||
        !salaryPayMode ||
        !payFrequency
      ) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const { httpCode, result } = formatApiResponse<EmployeeData>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        null
      );
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<EmployeeData>(error.message, {} as EmployeeData);
    res.status(httpCode).json(result);
  }
}
