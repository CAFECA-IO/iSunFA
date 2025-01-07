import { DefaultValue } from '@/constants/default_value';
import { ISessionData } from '@/interfaces/session';

export const SESSION_GUEST: ISessionData = {
  userId: DefaultValue.USER_ID.GUEST,
  companyId: 0,
  roleId: 0,
  cookie: {
    httpOnly: true,
    path: '/',
    secure: true,
  },
};
