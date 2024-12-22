import { ISessionData } from '@/interfaces/session_data';
// import nextSession from 'next-session';
/*
const options = {
  cookie: {
    httpOnly: true,
    path: '/',
    secure: true,
  },
};
 */

// export const getSession = nextSession<ISessionData>(options);
import { NextApiRequest, NextApiResponse } from 'next';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getSession = (req: NextApiRequest, res: NextApiResponse) => {
  const session = {
    id: 'session',
    userId: 10000006,
    companyId: 10000007,
    challenge: 'challenge',
    roleId: 1003,
    cookie: {
      httpOnly: true,
      path: '/',
      secure: true,
    },
  };
  return session;
};

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
