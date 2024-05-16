import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '@/client';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getDomains } from '@/lib/utils/common';

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

    const getUser = await prisma.user.findFirstOrThrow({
      where: {
        credentialId: authenticationParsed.credentialId,
      },
    });

    const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.CREATED, getUser);
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
