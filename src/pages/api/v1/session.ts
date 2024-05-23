// import { NextApiRequest, NextApiResponse } from 'next';
// import { getSession } from '@/lib/utils/get_session';
// import prisma from '@/client';

// export default async function sessionHandler(req: NextApiRequest, res: NextApiResponse) {
//   const session = await getSession(req, res);

//   // eslint-disable-next-line no-console
//   console.log('session in session API', session);
//   if (session && session.userId) {
//     const user = await prisma.user.findUnique({
//       where: { id: session.userId },
//     });
//     res.status(200).json({ user });
//   } else {
//     res.status(200).json({ user: null });
//   }
// }

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
      if (session.userId) {
        user = (await prisma.user.findUnique({
          where: {
            id: session.userId,
          },
        })) as IUser;

        // eslint-disable-next-line no-console
        console.log('user in session API', user);
      }
      if (session.companyId) {
        company = (await prisma.company.findUnique({
          where: {
            id: session.companyId,
          },
        })) as ICompany;

        // eslint-disable-next-line no-console
        console.log('company in session API', company);
      }
      const sessionData: ISessionData = {
        user,
        company,
      };

      // eslint-disable-next-line no-console
      console.log('sessionData in session API', sessionData);
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
    const { httpCode, result } = formatApiResponse<ISessionData>(error.message, {} as ISessionData);
    res.status(httpCode).json(result);
  }
}
