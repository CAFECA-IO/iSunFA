// Sign-in by webauthn
// import cookie from 'cookie';
// import { server } from '@passwordless-id/webauthn';
import type { NextApiRequest, NextApiResponse } from 'next';
// import { getDomain } from '../../../lib/utils/common';
import { ICredential } from '../../../interfaces/webauthn';

type Data = {
  payload: string | ICredential;
};

// const CREDENTIALS_ARRAY: ICredential[] = [];
const REGISTRATION_ARRAY: { credential: ICredential }[] = [
  {
    credential: {
      id: 'KiUmnebT-CH4Bk9iSekfcpxEtc4',
      publicKey:
        'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEHgM9w621iM8arTj0TeLRltBs-oCaCj7psi-hAugT8cqau0Zr9a22Ne2bWGneRrpp4YFWaU15GUbV_ACuB63-3g==',
      algorithm: 'ES256',
    },
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    // const cookies = cookie.parse(req.headers.cookie || '');

    // Loop through REGISTRATION_ARRAY to find the credential id if it's the same as the one in the request
    // If it's the same, return the credential
    const credentials = REGISTRATION_ARRAY;

    const credentialId = req.body.credential.id;

    const isRegistered = credentials.find(
      (c: { credential: ICredential }) => c.credential.id === credentialId
    );

    if (!isRegistered) {
      throw new Error('User not found');
    }

    // eslint-disable-next-line no-console
    console.log('isRegistered', isRegistered);

    // if (!user) {
    //   throw new Error('User not found');
    // }

    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   throw new Error('Invalid credentials');
    // }

    res.status(200).json({ payload: 'Success!' });
  } catch (error) {
    // TODO: handle authentication error (20240403 - Shirley)
    // eslint-disable-next-line no-console
    console.log('error', error);
    res.status(400).json({ payload: 'error' });
  }
}
