import type { NextApiRequest, NextApiResponse } from 'next';
import { server } from '@passwordless-id/webauthn';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE, SuccessMessage } from '@/constants/status_code';
import { formatApiResponse, getDomains } from '@/lib/utils/common';
import { IUserAuth } from '@/interfaces/webauthn';
import { DUMMY_CHALLENGE } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/get_session';
import { generateUserIcon } from '@/lib/utils/generate_user_icon';
import { checkInvitation } from '@/lib/utils/auth_check';
import { createAdminByInvitation } from '@/lib/utils/repo/transaction/create_admin_by_invitation';
import { createUser } from '@/lib/utils/repo/user.repo';
import { formatUser } from '@/lib/utils/formatter/user.formatter';

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
    let imageUrl = '';
    try {
      imageUrl = await generateUserIcon(registrationParsed.username);
    } catch (e) {
      // Info: (20240516 - Murky) If the image generation fails, the user will not have an image
      // Info: For debugging purpose
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
    const session = await getSession(req, res);
    session.userId = createdUser.id;
    let successMessage: SuccessMessage = STATUS_MESSAGE.CREATED;
    if (req.query.invitation) {
      try {
        const invitation = await checkInvitation(req.query.invitation as string, createdUser.id);
        await createAdminByInvitation(createdUser.id, invitation);
        successMessage = STATUS_MESSAGE.CREATED_INVITATION;
      } catch (error) {
        // TODO: (20240617 - Jacky): Log error in future
        successMessage = STATUS_MESSAGE.CREATED_WITH_INVALID_INVITATION;
      }
    }
    const { httpCode, result } = formatApiResponse<IUser>(successMessage, user);
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
