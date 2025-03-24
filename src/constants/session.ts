import { DefaultValue } from '@/constants/default_value';
import { ISessionData } from '@/interfaces/session';
import { TeamRole } from '@/interfaces/team';

const DEV_NO_LOGIN: boolean = true;
export const ALWAYS_LOGIN: boolean = process.env.NODE_ENV === 'development' && DEV_NO_LOGIN;

export const SESSION_DEVELOPER: ISessionData = {
  isunfa: DefaultValue.SESSION_ID,
  deviceId: DefaultValue.DEVICE_ID,
  userAgent: DefaultValue.USER_AGENT,
  ipAddress: DefaultValue.IP,
  userId: 10000003,
  companyId: 10000003,
  roleId: 1006,
  teamId: 6,
  teamRole: TeamRole.OWNER,
  teams: [
    {
      id: 2,
      role: TeamRole.OWNER,
    },
    {
      id: 3,
      role: TeamRole.OWNER,
    },
    {
      id: 6,
      role: TeamRole.OWNER,
    },
  ],
  actionTime: 0,
  expires: 0,
};
