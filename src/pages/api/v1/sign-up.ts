import type { NextApiRequest, NextApiResponse } from 'next';

import { server } from '@passwordless-id/webauthn';
import prisma from '@/client';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, getDomains, timestampInSeconds } from '@/lib/utils/common';
import { IUserAuth } from '@/interfaces/webauthn';
import { DUMMY_CHALLENGE } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IInvitation } from '@/interfaces/invitation';
import { getSession } from '@/lib/utils/get_session';
import { generateUserIcon } from '@/lib/utils/generate_user_icon';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser>>
) {
  try {
    if (req.method !== 'POST') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }

    const { registration } = req.body;

    const origins = getDomains();

    const expected = {
      challenge: DUMMY_CHALLENGE,
      origin: (target: string) => origins.includes(target), // Info: Any origin in the list of allowed origins is valid (20240408 - Shirley)
    };

    const registrationParsed = (await server.verifyRegistration(
      registration,
      expected
    )) as IUserAuth;
    const { credential } = registrationParsed;
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    let imageUrl = '';
    try {
      imageUrl = await generateUserIcon(registrationParsed.username);
    } catch (e) {
      // Info: (20240516 - Murky) If the image generation fails, the user will not have an image
      // Info: For debugging purpose
      // eslint-disable-next-line no-console
      console.error('Failed to generate user icon', e);
    }

    const newUser = {
      name: registrationParsed.username,
      credentialId: credential.id,
      publicKey: credential.publicKey,
      algorithm: credential.algorithm,
      imageId: imageUrl, // ToDo: check the interface (20240516 - Luphia)
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    };
    const createdUser: IUser = await prisma.user.create({
      data: newUser,
    });
    const session = await getSession(req, res);
    session.userId = createdUser.id;
    const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.CREATED, createdUser);
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
      if (invitation.expiredAt < nowTimestamp) {
        return;
      }
      const email = createdUser.email || '';
      await prisma.$transaction(async (tx) => {
        await tx.admin.create({
          data: {
            user: {
              connect: {
                id: createdUser.id,
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
            email,
            status: true,
            startDate: nowTimestamp,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        });
        await tx.invitation.update({
          where: {
            code: req.query.invitation as string,
          },
          data: {
            hasUsed: true,
          },
        });
      });
    }
  } catch (_error) {
    // Handle errors
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
