import { client } from '@passwordless-id/webauthn';
import type { AuthenticationJSON, RegistrationJSON } from '@passwordless-id/webauthn/dist/esm/types';

/**
 * Info: (20251231 - Tzuhan)
 * Client-side FIDO2 Authentication Helper
 */
export async function authenticateFido2(challenge: string): Promise<AuthenticationJSON> {
  const authentication = await client.authenticate({
    challenge,
    allowCredentials: [],
    userVerification: 'required',
    timeout: 60000,
  });
  return authentication;
}

/**
 * Info: (20251231 - Tzuhan)
 * Client-side FIDO2 Registration Helper
 */
export async function registerFido2(username: string, challenge: string): Promise<RegistrationJSON> {
  const registration = await client.register({
    user: username,
    challenge,
    userVerification: 'required',
    discoverable: 'preferred',
    timeout: 60000,
  });
  return registration;
}
