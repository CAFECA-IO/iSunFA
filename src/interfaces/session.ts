export interface ISessionOption {
  sid?: string;
  jwt?: string;
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
  expires: number;
  userId: number;
  companyId: number;
  roleId: number;
}

export interface ISessionUpdateData {
  userId?: number;
  companyId?: number;
  roleId?: number;
}
