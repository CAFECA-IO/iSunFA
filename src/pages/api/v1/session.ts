import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { ISessionData } from '@/interfaces/session_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/get_session';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISessionData>>
) {
  try {
    if (req.method === 'GET') {
      const session = await getSession(req, res);
      let user: IUser = {} as IUser;
      let company: ICompany = {} as ICompany;
      const { userId, companyId } = session;
      if (userId) {
        user = (await prisma.user.findUnique({
          where: {
            id: userId,
          },
        })) as IUser;
      }
      if (companyId) {
        company = (await prisma.company.findUnique({
          where: {
            id: companyId,
          },
        })) as ICompany;
      }
      const sessionData: ISessionData = {
        user,
        company,
      };
      const { httpCode, result } = formatApiResponse<ISessionData>(
        STATUS_MESSAGE.SUCCESS_GET,
        sessionData
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    // eslint-disable-next-line no-console
    console.log('🚀 ~ error:', error);
    const { httpCode, result } = formatApiResponse<ISessionData>(error.message, {} as ISessionData);
    res.status(httpCode).json(result);
  }
}
