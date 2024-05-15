import cookie from 'cookie';
// TODO: check if the user's public key is registered on the server (20240403 - Shirley)
import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ICredential } from '@/interfaces/webauthn';
import { getDomains } from '@/lib/utils/common';
import { COOKIE_NAME } from '@/constants/config';

type Data = {
  payload: string | ICredential;
};

// const EXAMPLE_REGISTRATION_ARRAY: { credential: ICredential }[] = [
//   {
//     credential: {
//       id: 'KiUmnebT-CH4Bk9iSekfcpxEtc4',
//       publicKey:
//         'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEHgM9w621iM8arTj0TeLRltBs-oCaCj7psi-hAugT8cqau0Zr9a22Ne2bWGneRrpp4YFWaU15GUbV_ACuB63-3g==',
//       algorithm: 'ES256',
//     },
//   },
// ];

const CREDENTIALS_ARRAY: ICredential[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    const { authentication, registeredCredential, challenge } = req.body;

    const origins = getDomains();

    const expected = {
      challenge,
      origin: (target: string) => origins.includes(target),
      userVerified: true,
    };

    const authenticationParsed = await server.verifyAuthentication(
      authentication,
      registeredCredential,
      expected
    );

    // eslint-disable-next-line no-console
    console.log('authenticationParsed in SignIn API', authenticationParsed);

    CREDENTIALS_ARRAY.push(registeredCredential);

    const expiration = new Date();

    expiration.setHours(expiration.getHours() + 1);

    res.setHeader(
      'Set-Cookie',
      cookie.serialize(COOKIE_NAME.FIDO2, JSON.stringify(CREDENTIALS_ARRAY), {
        // httpOnly: true,
        expires: expiration,
        path: '/',
      })
    );

    // const credentials = EXAMPLE_REGISTRATION_ARRAY;

    // const credentialId = req.body.credential.id;

    // const isRegistered = credentials.find(
    //   (c: { credential: ICredential }) => c.credential.id === credentialId
    // );

    // if (!isRegistered) {
    //   throw new Error('User not found');
    // }

    res.status(200).json({ payload: 'Success!' });
  } catch (error) {
    // TODO: handle authentication error (20240403 - Shirley)
    // eslint-disable-next-line no-console
    console.log('error in sign in API', error);
    res.status(400).json({ payload: 'error' });
  }
}
