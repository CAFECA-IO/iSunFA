import { utils } from '@passwordless-id/webauthn';
import { ICredential } from '@/interfaces/webauthn';

export async function createChallenge(message: string) {
  const ArrayBuffer = utils.toBuffer(message);
  let challenge = utils.toBase64url(ArrayBuffer);
  challenge = utils.toBase64url(ArrayBuffer);
  challenge = challenge.replace(/=/g, '');
  return challenge;
}

export const checkFIDO2Cookie = (): Array<ICredential> | null => {
  const cookie = document.cookie.split('; ').find((row: string) => row.startsWith('FIDO2='));

  const FIDO2 = cookie ? cookie.split('=')[1] : null;

  if (FIDO2) {
    const decoded = decodeURIComponent(FIDO2);
    const credential = JSON.parse(decoded) as Array<ICredential>;
    return credential;
  }

  return null;
};
