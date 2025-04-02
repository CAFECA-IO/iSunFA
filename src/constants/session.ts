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
  roleId: 10000000,
  teams: [
    {
      id: 1, // Info: (20250324 - Shirley) 修改為 team table 裡 owner_id === SESSION_DEVELOPER.userId 的 id
      role: TeamRole.OWNER,
    },
    {
      id: 5,
      role: TeamRole.ADMIN,
    },
    {
      id: 6,
      role: TeamRole.OWNER,
    },
  ],
  actionTime: 0,
  expires: 0,
};
