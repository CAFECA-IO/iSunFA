import { utils } from '@passwordless-id/webauthn';
import { RegisterOptions } from '@passwordless-id/webauthn/dist/esm/types';

export async function createChallenge(message: string) {
  const ArrayBuffer = utils.toBuffer(message);
  let challenge = utils.toBase64url(ArrayBuffer);
  challenge = utils.toBase64url(ArrayBuffer);
  challenge = challenge.replace(/=/g, '');
  // eslint-disable-next-line no-console
  console.log(
    'in createChallenge',
    challenge,
    'is the challenge valid? ',
    utils.isBase64url(challenge)
  );
  // validate challenge
  // if (!utils.isBase64url(challenge)) {
  // throw new Error('Invalid challenge');
  // }
  return challenge;
}

export const challenge = 'RklETzIuVEVTVC5sb2dpbi0xNzExNzAxNjUwNTQ3LWhlbGxv';
export const name = 'Arnaud';
export const options: RegisterOptions = {
  userHandle: 'Optional server-side user id. Must not reveal personal information.',
  attestation: true,

  userVerification: 'required',

  authenticatorType: 'auto',
  timeout: 60000,
  debug: false,
};

// export async function verifyChallenge(challenge: string, response: string) {
//   const challengeBuffer = utils.toBuffer(challenge);
//   const responseBuffer = utils.toBuffer(response);
//   return utils.compare(challengeBuffer, responseBuffer);
// }
