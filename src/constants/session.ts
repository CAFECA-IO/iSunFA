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
  userId: 10000006,
  companyId: 10001236, // Info: (20250408 - Liz) 需要將已連結帳本的所屬 team data 加入至 teams (直接修改 id 比較快)，原因是後端會驗證 user 是否有此帳本權限， user 在團隊裡=有帳本權限=可以連結帳本
  roleId: 9,
  teams: [
    {
      id: 9, // Info: (20250324 - Shirley) 修改為 team table 裡 owner_id === SESSION_DEVELOPER.userId 的 id
      role: TeamRole.OWNER,
    },
    {
      id: 5,
      role: TeamRole.ADMIN,
    },
    {
      id: 2,
      role: TeamRole.OWNER,
    },
  ],
  actionTime: 0,
  expires: 0,
};
