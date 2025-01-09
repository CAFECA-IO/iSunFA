import { DefaultValue } from '@/constants/default_value';
import { ISessionData } from '@/interfaces/session';

export const SESSION_GUEST: ISessionData = {
  sid: DefaultValue.SESSION_ID,
  expires: 0,
  userId: DefaultValue.USER_ID.GUEST,
  companyId: 0,
  roleId: 0,
};
