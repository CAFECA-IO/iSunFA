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
  teamId: 2, // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teamRole: TeamRole.OWNER, // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teams: [
    {
      id: 1, // Info: (20250324 - Shirley) 在 npm run dev 開發環境，可修改 id 為 DB 裡 team table 的 id，之後後端會用 session 來判斷權限
      role: TeamRole.OWNER,
    },
    {
      id: 5,
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
