import type { NextApiRequest, NextApiResponse } from 'next';
import { IProjectProgress } from '@/interfaces/progress';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: IProjectProgress = {
  date: new Date('2024-03-01'),
  progress: [
    {
      progress: 'Designing',
      projectNum: 2,
    },
    {
      progress: 'Beta Testing',
      projectNum: 3,
    },
    {
      progress: 'Develop',
      projectNum: 2,
    },
    {
      progress: 'Sold',
      projectNum: 3,
    },
    {
      progress: 'Selling',
      projectNum: 2,
    },
    {
      progress: 'Archived',
      projectNum: 1,
    },
  ],
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProjectProgress>>
) {
  const { date } = req.query;
  try {
    if (date) {
      const { httpCode, result } = formatApiResponse<IProjectProgress>(STATUS_MESSAGE.SUCCESS_GET, {
        ...responseDataArray,
        date: new Date(date as string),
      });
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProjectProgress>(
      error.message,
      {} as IProjectProgress
    );
    res.status(httpCode).json(result);
  }
}
