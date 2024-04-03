import cookie from 'cookie';
import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDomain } from '../../../lib/utils/common';
import { ICredential, IUser } from '../../../interfaces/webauthn';
import { DUMMY_CHALLENGE } from '../../../constants/config';

type Data = {
  payload: string | ICredential;
};

const CREDENTIALS_ARRAY: ICredential[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    const origin = getDomain() || process.env.DOMAIN_FOR_DEVELOPMENT || 'http://localhost:3000/';

    const { registration } = req.body;

    const expected = {
      challenge: DUMMY_CHALLENGE,
      origin,
    };
    const registrationParsed = (await server.verifyRegistration(registration, expected)) as IUser;
    const { credential } = registrationParsed;

    CREDENTIALS_ARRAY.push(credential);

    const expiration = new Date();

    expiration.setHours(expiration.getHours() + 1);

    res.setHeader(
      'Set-Cookie',
      cookie.serialize('FIDO2', JSON.stringify(CREDENTIALS_ARRAY), {
        httpOnly: true,
        sameSite: 'strict',
        expires: expiration,
        path: '/',
      })
    );

    res.status(200).json({ payload: credential });
  } catch (error) {
    // TODO: handle authentification error (20240403 - Shirley)
    // eslint-disable-next-line no-console
    console.log('error', error);
    res.status(400).json({ payload: 'error' });
  }
}
