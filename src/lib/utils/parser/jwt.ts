import { ISessionOption } from '@/interfaces/session';
import { parseCookie } from '@/lib/utils/parser/cookie';

/* Info: (20250111 - Luphia) parse JWT token
 * JWT format: { header, payload, signature }
 */
export const parseJWT = (jwtString: string) => {
  let result;
  try {
    const data = jwtString.split('.');
    if (data.length >= 2) {
      const headerString = Buffer.from(data[0], 'base64').toString('utf-8');
      const payloadString = Buffer.from(data[1], 'base64').toString('utf-8');
      const signature = data[2];
      let header;
      let payload;
      try {
        // headerString maybe not a valid JSON string
        header = JSON.parse(headerString);
      } catch (error) {
        (error as Error).message = 'No valid JWT header';
        header = {};
      }
      try {
        // payloadString maybe not a valid JSON string
        payload = JSON.parse(payloadString);
      } catch (error) {
        (error as Error).message = 'No valid JWT payload';
        payload = payloadString;
      }

      result = { header, payload, signature };
    }
  } catch (error) {
    // Info: (20250111 - Luphia) Invalid JWT format
    (error as Error).message = 'No valid JWT format anywhere';
  }
  return result;
};

export const parseJWTFromSessionOption = (options: ISessionOption) => {
  const cookie = parseCookie(options.cookie) as {
    'next-auth.jwt'?: string;
    'next-auth.session-token'?: string;
  };
  const nextAuthJwt = cookie['next-auth.jwt'] || (cookie['next-auth.session-token'] as string);
  const jwt: string = options?.jwt ? options.jwt : nextAuthJwt;
  // Info: (20250111 - Luphia) parse jwt token
  const result = parseJWT(jwt);
  return result;
};
