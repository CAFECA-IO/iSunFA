import { ISessionData } from '@/interfaces/session_data';
import nextSession from 'next-session';

const options = {
  cookie: {
    httpOnly: true,
    path: '/',
    secure: true,
  },
};

export const getSession = nextSession<ISessionData>(options);

export async function setSession(
  session: ISessionData,
  data: { userId?: number; companyId?: number; challenge?: string; roleId?: number }
) {
  Object.assign(session, data);
  return session;
}

export async function destroySession(session: ISessionData) {
  session.destroy();
}
