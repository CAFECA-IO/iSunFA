import { TeamRole } from '@/interfaces/team';

export interface ISessionOption {
  sid?: string;
  jwt?: string;
  'x-forwarded-for'?: string;
  'user-agent'?: string;
  cookie?:
    | string
    | {
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
  accountBookId: number;
  roleId: number;
  actionTime: number;
  expires: number;
  external?: {
    provider: string;
    uid: string;
  };
  teams: {
    // Info: (20250517 - Shirley) 用戶所屬的所有團隊及其角色
    id: number;
    role: TeamRole;
  }[];
}

export interface ISessionUpdateData {
  userId?: number;
  accountBookId?: number;
  roleId?: number;
  actionTime?: number;
  teams?: {
    // Info: (20250517 - Shirley) 用戶所屬的所有團隊及其角色
    id: number;
    role: string;
  }[];
}
