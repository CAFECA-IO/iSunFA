import cookie from 'cookie';
import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDomains } from '@/lib/utils/common';
import { ICredential, IUserAuth } from '@/interfaces/webauthn';
import { COOKIE_NAME, DUMMY_CHALLENGE } from '@/constants/config';

type Data = {
  payload: null | IUserAuth;
};

const USERINFO_ARRAY: IUserAuth[] = [];
const CREDENTIALS_ARRAY: ICredential[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    // // eslint-disable-next-line no-console
    // console.log('req.body in signUp', req.body);

    const { registration } = req.body;

    const origins = getDomains();

    const expected = {
      challenge: DUMMY_CHALLENGE,
      origin: (target: string) => origins.includes(target), // Info: Any origin in the list of allowed origins is valid (20240408 - Shirley)
    };

    // eslint-disable-next-line no-console
    console.log('registration as param in signUp API', registration);

    const registrationParsed = (await server.verifyRegistration(
      registration,
      expected
    )) as IUserAuth;
    const { credential } = registrationParsed;

    USERINFO_ARRAY.push(registrationParsed);
    CREDENTIALS_ARRAY.push(credential);

    // eslint-disable-next-line no-console
    console.log('registrationParsed', registrationParsed);

    const expiration = new Date();

    expiration.setHours(expiration.getHours() + 1);

    // res.setHeader(
    //   'Set-Cookie',
    //   cookie.serialize(COOKIE_NAME.USER_INFO, JSON.stringify(USERINFO_ARRAY), {
    //     // httpOnly: true,
    //     expires: expiration,
    //     path: '/',
    //   })
    // );

    res.setHeader(
      'Set-Cookie',
      cookie.serialize(COOKIE_NAME.FIDO2, JSON.stringify(CREDENTIALS_ARRAY), {
        // httpOnly: true,
        expires: expiration,
        path: '/',
      })
    );

    res.status(200).json({ payload: registrationParsed });
  } catch (error) {
    // TODO: handle authentication error (20240403 - Shirley)
    // eslint-disable-next-line no-console
    console.log('error in sign-up', error);
    res.status(400).json({ payload: null });
  }
}
