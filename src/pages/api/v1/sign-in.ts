import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getDomains } from '@/lib/utils/common';
import { NamedAlgo } from '@passwordless-id/webauthn/dist/esm/types';
import { getSession, setSession } from '@/lib/utils/session';
import { getUserByCredential } from '@/lib/utils/repo/user.repo';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { useInvitation } from '@/lib/utils/invitation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | null>>
): Promise<void> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;
  try {
    switch (req.method) {
      case 'POST': {
        const { authentication, challenge } = req.body;
        // Todo (20240705 - Jacky): Check input

        const getUser = await getUserByCredential(authentication.credentialId);
        if (!getUser) {
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        } else {
          const user = await formatUser(getUser);
          payload = user;
          const origins = getDomains();
          // Todo (20240705 - Jacky) should store challenge in session
          const expected = {
            challenge,
            origin: (target: string) => origins.includes(target),
            userVerified: true,
          };
          const typeOfAlgorithm: NamedAlgo = getUser.algorithm === 'ES256' ? 'ES256' : 'RS256';
          const registeredCredential = {
            id: getUser.credentialId,
            publicKey: getUser.publicKey,
            algorithm: typeOfAlgorithm,
          };

          await server.verifyAuthentication(authentication, registeredCredential, expected);
          const session = await getSession(req, res);
          await setSession(session, user.id);
          if (req.query.invitation) {
            const admin = await useInvitation(req.query.invitation as string, user.id);
            statusMessage = admin
              ? STATUS_MESSAGE.CREATED_INVITATION
              : STATUS_MESSAGE.CREATED_WITH_INVALID_INVITATION;
          }
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  }

  const { httpCode, result } = formatApiResponse<IUser | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
