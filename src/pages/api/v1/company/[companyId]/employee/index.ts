import type { NextApiRequest, NextApiResponse } from 'next';
import { IEasyEmployee, IEmployee } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: IEasyEmployee[] = [
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
  res: NextApiResponse<IResponseData<IEasyEmployee[] | IEasyEmployee>>
) {
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = formatApiResponse<IEasyEmployee[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray
      );
      res.status(httpCode).json(result);
    }
    if (req.method === 'POST') {
      const {
        name,
        salary,
        departmentId,
        bonus,
        salaryPayMode,
        startDate,
        payFrequency,
      }: IEmployee = req.body;
      if (
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
      const { httpCode, result } = formatApiResponse<IEasyEmployee>(
        STATUS_MESSAGE.CREATED,
        {} as IEasyEmployee
      );
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IEasyEmployee>(
      error.message,
      {} as IEasyEmployee
    );
    res.status(httpCode).json(result);
  }
}
