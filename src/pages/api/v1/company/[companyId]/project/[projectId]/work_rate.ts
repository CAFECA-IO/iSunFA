import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IWorkRate } from '@/interfaces/project';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/get_session';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IWorkRate | IWorkRate[]>>
) {
  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    // Info: (20240419 - Jacky) S010001 - GET /project
    if (req.method === 'GET') {
      const workRate: IWorkRate[] = [
        {
          id: 1,
          projectId: 1,
          name: 'Worker 1',
          avatar: 'avatar1',
          involvementRate: 50,
          hours: 10,
        },
        {
          id: 1,
          projectId: 2,
          name: 'Worker 2',
          avatar: 'avatar2',
          involvementRate: 50,
          hours: 10,
        },
      ];
      const { httpCode, result } = formatApiResponse<IWorkRate[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        workRate
      );
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
