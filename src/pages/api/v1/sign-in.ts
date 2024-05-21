import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '@/client';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getDomains, timestampInSeconds } from '@/lib/utils/common';
import { IInvitation } from '@/interfaces/invitation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser>>
) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    const { authentication, registeredCredential, challenge } = req.body;

    const origins = getDomains();

    const expected = {
      challenge,
      origin: (target: string) => origins.includes(target),
      userVerified: true,
    };

    const authenticationParsed = await server.verifyAuthentication(
      authentication,
      registeredCredential,
      expected
    );

    const getUser = (await prisma.user.findUnique({
      where: {
        credentialId: authenticationParsed.credentialId,
      },
    })) as IUser;

    const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.CREATED, getUser);
    res.status(httpCode).json(result);
    if (req.query.invitation) {
      // update user
      const invitation = (await prisma.invitation.findUnique({
        where: {
          code: req.query.invitation as string,
        },
      })) as IInvitation;
      if (!invitation) {
        return;
      }
      if (invitation.hasUsed) {
        return;
      }
      if (invitation.expiredAt < timestampInSeconds(Date.now())) {
        return;
      }
      await prisma.userCompanyRole.create({
        data: {
          user: {
            connect: {
              id: getUser.id,
            },
          },
          company: {
            connect: {
              id: invitation.companyId,
            },
          },
          role: {
            connect: {
              id: invitation.roleId,
            },
          },
          startDate: timestampInSeconds(Date.now()),
        },
      });
    }
    await prisma.invitation.update({
      where: {
        code: req.query.invitation as string,
      },
      data: {
        hasUsed: true,
      },
    });
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
