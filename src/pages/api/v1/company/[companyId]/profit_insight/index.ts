import type { NextApiRequest, NextApiResponse } from 'next';
import { IProfitInsight } from '@/interfaces/project_insight';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseData: IProfitInsight = {
  profitChange: -0.1,
  topProjectRoi: 0.3,
  preLaunchProject: 5,
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProfitInsight>>
) {
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = formatApiResponse<IProfitInsight>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseData
      );
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProfitInsight>(
      error.message,
      {} as IProfitInsight
    );
    res.status(httpCode).json(result);
  }
}
