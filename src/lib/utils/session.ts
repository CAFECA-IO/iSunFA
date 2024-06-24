import { ISessionData } from '@/interfaces/session_data';
import nextSession from 'next-session';
import { Session } from 'node_modules/next-session/lib/types';

const options = {
  cookie: {
    httpOnly: true,
    path: '/',
    secure: true,
  },
};

export const getSession = nextSession<ISessionData>(options);

export async function setSession(session: Session, userId?: number, companyId?: number) {
  const updatedSession = session;
  if (userId) {
    updatedSession.userId = userId;
  }
  if (companyId) {
    updatedSession.companyId = companyId;
  }
  return updatedSession;
}

export async function destroySession(session: Session) {
  session.destroy();
}
