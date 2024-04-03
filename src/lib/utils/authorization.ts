import { utils } from '@passwordless-id/webauthn';

export async function createChallenge(message: string) {
  const ArrayBuffer = utils.toBuffer(message);
  let challenge = utils.toBase64url(ArrayBuffer);
  challenge = utils.toBase64url(ArrayBuffer);
  challenge = challenge.replace(/=/g, '');
  return challenge;
}
