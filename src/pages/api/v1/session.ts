import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<{ user: IUser; company: ICompany }>>
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
      const sessionData: { user: IUser; company: ICompany } = {
        user,
        company,
      };
      const { httpCode, result } = formatApiResponse<{ user: IUser; company: ICompany }>(
        STATUS_MESSAGE.SUCCESS_GET,
        sessionData
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<{ user: IUser; company: ICompany }>(
      error.message,
      {} as { user: IUser; company: ICompany }
    );
    res.status(httpCode).json(result);
  }
}
