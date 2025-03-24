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
  userId: 10000000,
  companyId: 10000000,
  roleId: 1006,
  teamId: 1,
  teamRole: TeamRole.OWNER,
  team: [
    {
      teamId: 2,
      teamRole: TeamRole.OWNER,
    },
    {
      teamId: 3,
      teamRole: TeamRole.OWNER,
    },
    {
      teamId: 6,
      teamRole: TeamRole.OWNER,
    },
  ],
  actionTime: 0,
  expires: 0,
};
