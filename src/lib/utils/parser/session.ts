import { DefaultValue } from '@/constants/default_value';
import { ISessionOption } from '@/interfaces/session';
import { parseCookie } from '@/lib/utils/parser/cookie';

export const parseSessionId = (options: ISessionOption) => {
  const cookie = parseCookie(options.cookie) as { sid?: string; 'next-auth.csrf-token'?: string };
  const csrf = cookie['next-auth.csrf-token'];
  const sessionId = options?.sid
    ? options?.sid
    : cookie?.sid
      ? cookie.sid
      : csrf || DefaultValue.SESSION_ID;
  return sessionId;
};
