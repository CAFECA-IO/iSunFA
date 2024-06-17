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
