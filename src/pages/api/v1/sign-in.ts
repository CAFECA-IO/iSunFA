import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getDomains } from '@/lib/utils/common';
import { CredentialKey } from '@passwordless-id/webauthn/dist/esm/types';
import { getSession } from '@/lib/utils/get_session';
import { getUserByCredential } from '@/lib/utils/repo/user.repo';
import { checkInvitation } from '@/lib/utils/auth_check';
import { createAdminByInvitation } from '@/lib/utils/repo/transaction/create_admin_by_invitation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser>>
): Promise<void> {
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

    const getUser = await getUserByCredential(authentication.credentialId);

    const typeOfAlgorithm = getUser.algorithm === 'ES256' ? 'ES256' : 'RS256';

    const registeredCredential = {
      id: getUser.credentialId,
      publicKey: getUser.publicKey,
      algorithm: typeOfAlgorithm,
    } as CredentialKey;

    await server.verifyAuthentication(authentication, registeredCredential, expected);
    const session = await getSession(req, res);
    session.userId = getUser.id;
    const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.CREATED, getUser);
    res.status(httpCode).json(result);
    if (!req.query.invitation) {
      return;
    }
    const invitation = await checkInvitation(req.query.invitation as string);
    await createAdminByInvitation(getUser.id, invitation);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
