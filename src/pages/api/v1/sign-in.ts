import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '@/client';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getDomains, timestampInSeconds } from '@/lib/utils/common';
import { CredentialKey } from '@passwordless-id/webauthn/dist/esm/types';
import { IInvitation } from '@/interfaces/invitation';
import { getSession } from '@/lib/utils/get_session';
// import MemoryStore from '@/lib/utils/get_session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser>>
) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    const { authentication, challenge } = req.body;

    const origins = getDomains();

    const expected = {
      challenge,
      origin: (target: string) => origins.includes(target),
      userVerified: true,
    };

    const getUser = (await prisma.user.findUnique({
      where: {
        credentialId: authentication.credentialId,
      },
    })) as IUser;

    const typeOfAlgorithm = getUser.algorithm === 'ES256' ? 'ES256' : 'RS256';

    const registeredCredential = {
      id: getUser.credentialId,
      publicKey: getUser.publicKey,
      algorithm: typeOfAlgorithm,
    } as CredentialKey;

    await server.verifyAuthentication(authentication, registeredCredential, expected);
    const session = await getSession(req, res);
    // const memoryStore = new MemoryStore();
    session.userId = getUser.id;
    // memoryStore.set(session.id, session);
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
      const now = Date.now();
      const nowTimestamp = timestampInSeconds(now);
      if (invitation.expiredAt < nowTimestamp) {
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.userCompanyRole.create({
          data: {
            user: {
              connect: {
                id: session.userId,
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
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
