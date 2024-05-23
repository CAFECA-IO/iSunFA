import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/get_session';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<number>>
) {
  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    if (req.method === 'GET') {
      const projectCompletedPercent = await prisma.project.findUnique({
        where: {
          id: Number(req.query.projectId),
        },
        select: {
          completedPercent: true,
        },
      });
      if (!projectCompletedPercent) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const progress = projectCompletedPercent.completedPercent;
      const { httpCode, result } = formatApiResponse<number>(STATUS_MESSAGE.SUCCESS_GET, progress);
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
