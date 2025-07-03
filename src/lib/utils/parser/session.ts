import { ISessionData, ISessionOption } from '@/interfaces/session';
import { parseCookie } from '@/lib/utils/parser/cookie';

const randomSessionId = () => {
  const seed1 = Math.random().toString(36).substring(2);
  const seed2 = Math.random().toString(36).substring(2);
  const sessionId = `${seed1}-${seed2}`;
  return sessionId;
};

/* Info: (20250122 - Luphia) 解析 session ID
 * 1. 從 header 中解析 isunfa 作為 session ID
 * 2. 從 session 資料中解析 isunfa 作為 session ID
 * 3. 從 header 中解析 csrf 作為 session ID
 * 4. 從 cookie 中解析 csrf 作為 session ID
 * 5. 若無法解析，則隨機生成一個 session ID
 * 6. 返回 session ID
 */
export const parseSessionId = (options: ISessionOption | ISessionData) => {
  const data = options || {};
  // Info: (20250122 - Luphia) step 1
  const isunfaInHeader = (data as ISessionData).isunfa;
  const cookieHeader = (data as ISessionOption).cookie;
  const cookieData = parseCookie(cookieHeader);
  // Info: (20250122 - Luphia) step 2
  const isunfaInSession = (options as ISessionData).isunfa;
  // Info: (20250625 - Shirley) step 2.5 - Check for isunfa in parsed cookies
  const isunfaInCookie = (cookieData as { [key: string]: string }).isunfa;
  const findCsrfKeyInHeader = Object.keys(options).find((key) => key.includes('csrf')) as string;
  // Info: (20250122 - Luphia) step 3
  const crsfInHeader = (data as { [key: string]: string })[findCsrfKeyInHeader];
  const findCsrfKeyInCookie = Object.keys(cookieData).find((key) => key.includes('csrf')) as string;
  // Info: (20250122 - Luphia) step 4
  const crsfInCookie = (cookieData as { [key: string]: string })[findCsrfKeyInCookie];
  // Info: (20250122 - Luphia) step 5
  const randomId = randomSessionId();
  const sessionId =
    isunfaInSession || isunfaInHeader || isunfaInCookie || crsfInHeader || crsfInCookie || randomId;
  return sessionId;
};
