export interface ISessionOption {
  sid?: string;
  jwt?: string;
  'x-forwarded-for'?: string;
  'user-agent'?: string;
  cookie?: {
    jwt?: string;
    isunfa?: string;
    httpOnly?: boolean;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  };
}

export interface ISessionHandlerOption {
  sessionExpires: number;
  gcInterval: number;
  filePath: string;
  secret: string;
}

export interface ISessionData {
  isunfa: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  userId: number;
  companyId: number;
  roleId: number;
  tagId: number;
  teamId: number; // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teamRole: string; // Info: (20250311 - Shirley) TeamRole // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  actionTime: number;
  expires: number;
  teams: {
    // Info: (20250517 - Shirley) 用戶所屬的所有團隊及其角色
    id: number;
    role: string;
  }[];
}

export interface ISessionUpdateData {
  userId?: number;
  companyId?: number;
  roleId?: number;
  actionTime?: number;
  tagId?: number;
  teamId?: number; // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teamRole?: string; // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teams?: {
    // Info: (20250517 - Shirley) 用戶所屬的所有團隊及其角色
    id: number;
    role: string;
  }[];
}
