import { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getDomains } from '@/lib/utils/common';
import { server } from '@passwordless-id/webauthn';
import { getSession, setSession } from '@/lib/utils/session';
import { generateUserIcon } from '@/lib/utils/generate_user_icon';
import { createUser } from '@/lib/utils/repo/user.repo';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { useInvitation } from '@/lib/utils/invitation';
import { RegistrationEncoded, RegistrationParsed } from '@passwordless-id/webauthn/dist/esm/types';
import { verifyChallengeTimestamp } from '@/lib/utils/authorization';

async function createUserByRegistrationParsed(registrationParsed: RegistrationParsed) {
  let user: IUser | null = null;
  const imageUrl = await generateUserIcon(registrationParsed.username);
  try {
    const createdUser = await createUser(
      registrationParsed.username,
      registrationParsed.credential.id,
      registrationParsed.credential.publicKey,
      registrationParsed.credential.algorithm,
      imageUrl
    );
    user = await formatUser(createdUser);
  } catch (error) {
    // Todo (20240710 - Jacky) add LOG in the future
    user = null;
  }
  return user;
}

async function registerUser(
  registration: RegistrationEncoded,
  challenge: string
): Promise<RegistrationParsed | null> {
  let registrationParsed: RegistrationParsed | null = null;
  const isValid = verifyChallengeTimestamp(challenge);
  if (isValid) {
    const origins = getDomains();
    const expected = {
      challenge,
      origin: (target: string) => origins.includes(target),
    };
    try {
      registrationParsed = await server.verifyRegistration(registration, expected);
    } catch (_error) {
      // Todo (20240710 - Jacky) add LOG in the future
      registrationParsed = null;
    }
  }
  return registrationParsed;
}

async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;
  const { registration, challenge } = req.body;
  const session = await getSession(req, res);
  // Todo (20240710 - Jacky) Dear Emily: should use this challenge after use getChallenge API
  // const { challenge } = session;
  const registrationParsed = await registerUser(registration, challenge);
  if (!registrationParsed) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const user = await createUserByRegistrationParsed(registrationParsed);
    if (!user) {
      statusMessage = STATUS_MESSAGE.BAD_GATEWAY_PRISMA_ERROR;
    } else {
      payload = user;
      statusMessage = STATUS_MESSAGE.CREATED;
      await setSession(session, user.id);
      if (req.query.invitation) {
        const admin = await useInvitation(req.query.invitation as string, user.id);
        statusMessage = admin
          ? STATUS_MESSAGE.CREATED_INVITATION
          : STATUS_MESSAGE.CREATED_WITH_INVALID_INVITATION;
      }
    }
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUser | null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | null>>
): Promise<void> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IUser | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
