import { ISessionData, ISessionOption } from '@/interfaces/session';
import { parseCookie } from '@/lib/utils/parser/cookie';

const randomSessionId = () => {
  const seed1 = Math.random().toString(36).substring(2);
  const seed2 = Math.random().toString(36).substring(2);
  const sessionId = `${seed1}-${seed2}`;
  return sessionId;
};

/* Info: (20250114 - Luphia) 解析 session ID
 * 1. 從 cookie 中解析 session ID，資料在 options.cookie.isunfa
 * 2. 從 session data 中解析 session ID，資料在 options.isunfa
 * 3. 若無法解析，則隨機生成一個 session ID
 * 4. 返回 session ID
 */
export const parseSessionId = (options: ISessionOption | ISessionData) => {
  const cookieHeader = (options as ISessionOption).cookie;
  const isunfaInCookie = (parseCookie(cookieHeader) as { isunfa: string }).isunfa;
  const isunfaInSession = (options as ISessionData).isunfa;
  const sessionId = isunfaInSession || isunfaInCookie || randomSessionId();
  return sessionId;
};
