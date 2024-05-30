import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { checkUserSession } from '@/lib/utils/session_check';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<string>>
) {
  try {
    if (req.method === 'PUT') {
      if (!req.query.companyId) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const companyIdNum = Number(req.query.companyId);
      const session = await checkUserSession(req, res);
      session.companyId = companyIdNum;
      const { httpCode, result } = formatApiResponse<string>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        session.companyId
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<string>(error.message, '');
    res.status(httpCode).json(result);
  }
}
