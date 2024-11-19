import { ISessionData } from '@/interfaces/session_data';
import { NextApiRequest, NextApiResponse } from 'next';
import nextSession from 'next-session';

const options = {
  cookie: {
    httpOnly: true,
    path: '/',
    secure: true,
  },
};

// export const getSession = nextSession<ISessionData>(options);
// Deprecate: (20241119 - Luphia) dummy session for development
const env = process.env.NODE_ENV;
const dummyGetSession = async (req: NextApiRequest, res: NextApiResponse) => {
  const sessionData: ISessionData = {
    id: 'dummy',
    cookie: {
      httpOnly: true,
      path: '/',
      secure: true,
    },
    userId: 10000121,
    companyId: 10000001,
    challenge: 'dummy',
    roleId: 1006,
  };
  return sessionData;
};
export const getSession = env === 'development' ? dummyGetSession : nextSession<ISessionData>(options);

export async function setSession(
  session: ISessionData,
  data: { userId?: number; companyId?: number; challenge?: string; roleId?: number }
) {
  const { userId, companyId, challenge, roleId } = data;
  const updatedSession = session;

  if (userId) updatedSession.userId = userId;
  if (companyId) updatedSession.companyId = companyId;
  if (challenge) updatedSession.challenge = challenge;
  if (roleId) updatedSession.roleId = roleId;

  return updatedSession;
}

export async function destroySession(session: ISessionData) {
  session.destroy();
}
