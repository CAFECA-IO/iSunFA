import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, getDomains } from '@/lib/utils/common';
import { IUserAuth } from '@/interfaces/webauthn';
import { DUMMY_CHALLENGE } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { getSession, setSession } from '@/lib/utils/session';
import { generateUserIcon } from '@/lib/utils/generate_user_icon';
import { createUser } from '@/lib/utils/repo/user.repo';
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
        const { registration } = req.body;
        const origins = getDomains();
        const expected = {
          challenge: DUMMY_CHALLENGE,
          origin: (target: string) => origins.includes(target),
        };

        const registrationParsed = (await server.verifyRegistration(
          registration,
          expected
        )) as IUserAuth;

        let imageUrl = '';
        try {
          imageUrl = await generateUserIcon(registrationParsed.username);
        } catch (e) {
          // Deprecated: (20240516 - Murky) If the image generation fails, the user will not have an image
          // Deprecated: For debugging purpose
          // eslint-disable-next-line no-console
          console.error('Failed to generate user icon', e);
        }

        const createdUser = await createUser(
          registrationParsed.username,
          registrationParsed.credential.id,
          registrationParsed.credential.publicKey,
          registrationParsed.credential.algorithm,
          imageUrl
        );

        const user = await formatUser(createdUser);
        payload = user;
        statusMessage = STATUS_MESSAGE.CREATED;
        const session = await getSession(req, res);
        await setSession(session, user.id);
        if (req.query.invitation) {
          const admin = await useInvitation(req.query.invitation as string, user.id);
          statusMessage = admin
            ? STATUS_MESSAGE.CREATED_INVITATION
            : STATUS_MESSAGE.CREATED_WITH_INVALID_INVITATION;
        }
        break;
      }
      default:
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  }

  const { httpCode, result } = formatApiResponse<IUser | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
