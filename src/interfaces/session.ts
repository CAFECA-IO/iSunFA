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
  actionTime: number;
  expires: number;
  teamId: number;
  teamRole: string; // Info: (20250311 - Shirley) TeamRole
}

export interface ISessionUpdateData {
  userId?: number;
  companyId?: number;
  roleId?: number;
  actionTime?: number;
  teamId?: number;
  teamRole?: string;
}
