import { DefaultValue } from '@/constants/default_value';
import { ISessionData } from '@/interfaces/session';

const DEV_NO_LOGIN: boolean = true;
export const ALWAYS_LOGIN: boolean = process.env.NODE_ENV === 'development' && DEV_NO_LOGIN;

export const SESSION_DEVELOPER: ISessionData = {
  isunfa: DefaultValue.SESSION_ID,
  deviceId: DefaultValue.DEVICE_ID,
  userAgent: DefaultValue.USER_AGENT,
  ipAddress: DefaultValue.IP,
  userId: 10000028,
  companyId: 10000029,
  roleId: 1006,
  actionTime: 0,
  expires: 0,
};
