import type { NextApiRequest, NextApiResponse } from 'next';

import { server } from '@passwordless-id/webauthn';
import prisma from '@/client';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, getDomains } from '@/lib/utils/common';
import { IUserAuth } from '@/interfaces/webauthn';
import { DUMMY_CHALLENGE } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';

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

    const newUser = {
      name: registrationParsed.username,
      // kycStatus: false,
      credentialId: credential.id,
      publicKey: credential.publicKey,
      algorithm: credential.algorithm,
      imageId: '', // ToDo: check the interface (20240516 - Luphia)
    };
    const createdUser: IUser = await prisma.user.create({
      data: newUser,
    });
    const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.CREATED, createdUser);
    res.status(httpCode).json(result);
  } catch (_error) {
    // Handle errors
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    // eslint-disable-next-line no-console
    console.log('error in signUp API', error.message, httpCode, result);
    res.status(httpCode).json(result);
  }
}
