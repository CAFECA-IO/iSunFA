import type { NextApiRequest, NextApiResponse } from 'next';
import { ISalary, ISalaryRequest } from '@/interfaces/salary';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<ISalary>>) {
  try {
    if (req.method === 'POST') {
      const { employeeId } = req.query;
      if (!employeeId) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const { description, start_date: startDate, end_date: endDate }: ISalaryRequest = req.body;
      if (!description || !startDate || !endDate) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const { httpCode, result } = formatApiResponse<ISalary>(
        STATUS_MESSAGE.CREATED,
        {} as ISalary
      );
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ISalary>(error.message, {} as ISalary);
    res.status(httpCode).json(result);
  }
}
