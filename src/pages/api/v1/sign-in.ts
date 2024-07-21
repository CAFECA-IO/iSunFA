import { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getDomains } from '@/lib/utils/common';
import { server } from '@passwordless-id/webauthn';
import { AuthenticationEncoded, NamedAlgo } from '@passwordless-id/webauthn/dist/esm/types';
import { getSession, setSession } from '@/lib/utils/session';
import { getUserByCredential } from '@/lib/utils/repo/user.repo';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { useInvitation } from '@/lib/utils/invitation';
import { verifyChallengeTimestamp } from '@/lib/utils/authorization';

async function authenticateUser(
  authentication: AuthenticationEncoded,
  challenge: string
): Promise<IUser | null> {
  let isValid = true;
  let user: IUser | null = null;
  isValid = verifyChallengeTimestamp(challenge);
  if (isValid) {
    const getUser = await getUserByCredential(authentication.credentialId);
    if (!getUser) {
      isValid = false;
    } else {
      user = await formatUser(getUser);
      const origins = getDomains();
      const expected = {
        challenge,
        origin: (target: string) => origins.includes(target),
        userVerified: true,
      };
      const typeOfAlgorithm: NamedAlgo = user.algorithm === 'ES256' ? 'ES256' : 'RS256';
      const registeredCredential = {
        id: user.credentialId,
        publicKey: user.publicKey,
        algorithm: typeOfAlgorithm,
      };
      // eslint-disable-next-line no-console
      console.log('authentication-------', authentication);
      try {
        await server.verifyAuthentication(authentication, registeredCredential, expected);
      } catch (error) {
        isValid = false;
        user = null;
      }
    }
  }
  return user;
}

async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;
  const { authentication } = req.body;
  const session = await getSession(req, res);
  const { challenge } = session;
  const user = await authenticateUser(authentication, challenge);
  if (!user) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    payload = user;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    await setSession(session, user.id);
    if (req.query.invitation) {
      const admin = await useInvitation(req.query.invitation as string, user.id);
      statusMessage = admin
        ? STATUS_MESSAGE.CREATED_INVITATION
        : STATUS_MESSAGE.CREATED_WITH_INVALID_INVITATION;
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
