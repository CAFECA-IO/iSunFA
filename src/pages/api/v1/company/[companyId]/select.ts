import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkUser } from '@/lib/utils/auth_check';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<number>>
) {
  try {
    if (req.method === 'PUT') {
      const companyIdNum = convertStringToNumber(req.query.companyId);
      const session = await checkUser(req, res);
      session.companyId = companyIdNum;
      const { httpCode, result } = formatApiResponse<number>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        session.companyId
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<number>(error.message, {} as number);
    res.status(httpCode).json(result);
  }
}
