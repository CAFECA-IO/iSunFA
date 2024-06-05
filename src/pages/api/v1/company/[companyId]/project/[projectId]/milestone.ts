import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IMilestone } from '@/interfaces/project';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/get_session';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { ONE_DAY_IN_MS } from '@/constants/time';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IMilestone | IMilestone[]>>
) {
  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    if (req.method === 'GET') {
      const Milestone: IMilestone[] = [
        {
          id: 1,
          projectId: 1,
          status: 'Milestone 1',
          startDate: new Date().getTime() - 150 * ONE_DAY_IN_MS,
          endDate: new Date().getTime() - 100 * ONE_DAY_IN_MS,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
        },
        {
          id: 2,
          projectId: 1,
          status: 'Milestone 2',
          startDate: new Date().getTime() - 50 * ONE_DAY_IN_MS,
          endDate: new Date().getTime() - 100 * ONE_DAY_IN_MS,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
        },
        {
          id: 3,
          projectId: 1,
          status: 'Milestone 3',
          startDate: new Date().getTime() - 50 * ONE_DAY_IN_MS,
          endDate: new Date().getTime() - 5 * ONE_DAY_IN_MS,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
        },
      ];
      const { httpCode, result } = formatApiResponse<IMilestone[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        Milestone
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
