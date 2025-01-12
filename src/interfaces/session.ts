export interface ISessionOption {
  sid?: string;
  jwt?: string;
  'x-forwarded-for'?: string;
  'user-agent'?: string;
  cookie?: {
    jwt?: string;
    sid?: string;
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
  sid: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  userId: number;
  companyId: number;
  roleId: number;
  actionTime: number;
  expires: number;
}

export interface ISessionUpdateData {
  userId?: number;
  companyId?: number;
  roleId?: number;
  actionTime?: number;
}
