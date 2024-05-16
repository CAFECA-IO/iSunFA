import type { NextApiRequest, NextApiResponse } from 'next';
import { ISalary } from '@/interfaces/salary';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: ISalary[] = [
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

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISalary[] | ISalary>>
) {
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = formatApiResponse<ISalary[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ISalary>(error.message, {} as ISalary);
    res.status(httpCode).json(result);
  }
}
