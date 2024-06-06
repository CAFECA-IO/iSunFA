import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IMilestone } from '@/interfaces/project';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/get_session';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { ONE_DAY_IN_S } from '@/constants/time';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IMilestone | IMilestone[]>>
) {
  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    if (req.method === 'GET') {
      const Milestone: IMilestone[] = [
        {
          id: 1,
          projectId: 1,
          status: 'Milestone 1',
          startDate: nowTimestamp - 150 * ONE_DAY_IN_S,
          endDate: nowTimestamp - 100 * ONE_DAY_IN_S,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        {
          id: 2,
          projectId: 1,
          status: 'Milestone 2',
          startDate: nowTimestamp - 50 * ONE_DAY_IN_S,
          endDate: nowTimestamp - 100 * ONE_DAY_IN_S,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        {
          id: 3,
          projectId: 1,
          status: 'Milestone 3',
          startDate: nowTimestamp - 50 * ONE_DAY_IN_S,
          endDate: nowTimestamp - 5 * ONE_DAY_IN_S,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
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
