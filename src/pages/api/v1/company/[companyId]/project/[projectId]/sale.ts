import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { ISale } from '@/interfaces/project';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/get_session';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISale | ISale[]>>
) {
  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    if (req.method === 'GET') {
      const Sale: ISale[] = [
        {
          id: 1,
          projectId: 1,
          date: '2024-01-01',
          totalSales: 1000,
          comparison: 10,
        },
        {
          id: 2,
          projectId: 1,
          date: '2024-02-06',
          totalSales: 1000,
          comparison: 10,
        },
      ];
      const { httpCode, result } = formatApiResponse<ISale[]>(STATUS_MESSAGE.SUCCESS_GET, Sale);
      res.status(httpCode).json(result);
    } else {
      throw new Error('Method Not Allowed');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
