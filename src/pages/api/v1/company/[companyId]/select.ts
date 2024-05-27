import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/get_session';
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
      const session = await getSession(req, res);
      if (!session.userId) {
        throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
      }
      session.companyId = req.query.companyId;
      const { httpCode, result } = formatApiResponse<string>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        session.selectedCompanyId
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
