import cookie from 'cookie';
import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDomains } from '../../../lib/utils/common';
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

    const { host } = req.headers;
    const { origin } = req.headers;

    const origins = getDomains();
    const filteredOrigins = origins.filter((o: string) => o.includes(origin as string));
    // eslint-disable-next-line no-console
    console.log('filteredOrigins', filteredOrigins);

    const { registration } = req.body;

    const expected = {
      challenge: DUMMY_CHALLENGE,
      origin: (target: string) => origins.includes(target), // Info: Any origin in the list of allowed origins is valid (20240408 - Shirley)
    };

    // eslint-disable-next-line no-console
    console.log(
      'origins',
      origins,
      'expected',
      expected,
      'host',
      host,
      'origin',
      origin,
      'registration',
      registration
    );

    const registrationParsed = (await server.verifyRegistration(registration, expected)) as IUser;
    const { credential } = registrationParsed;

    CREDENTIALS_ARRAY.push(credential);

    // eslint-disable-next-line no-console
    console.log('CREDENTIALS_ARRAY', CREDENTIALS_ARRAY);

    const expiration = new Date();

    expiration.setHours(expiration.getHours() + 1);

    res.setHeader(
      'Set-Cookie',
      cookie.serialize('FIDO2', JSON.stringify(CREDENTIALS_ARRAY), {
        // httpOnly: true,
        expires: expiration,
        path: '/',
      })
    );

    res.status(200).json({ payload: credential });
  } catch (error) {
    // TODO: handle authentication error (20240403 - Shirley)
    // eslint-disable-next-line no-console
    console.log('error in sign-up', error);
    res.status(400).json({ payload: 'error' });
  }
}
