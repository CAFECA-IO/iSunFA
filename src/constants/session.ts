import { DefaultValue } from '@/constants/default_value';
import { ISessionData } from '@/interfaces/session';

export const SESSION_GUEST: ISessionData = {
  sid: DefaultValue.SESSION_ID,
  deviceId: DefaultValue.DEVICE_ID,
  userAgent: DefaultValue.USER_AGENT,
  ipAddress: DefaultValue.IP,
  userId: DefaultValue.USER_ID.GUEST,
  companyId: DefaultValue.COMPANY_ID.UNKNOWN,
  roleId: DefaultValue.ROLE_ID.UNKNOWN,
  actionTime: 0,
  expires: 0,
};
