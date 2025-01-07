import { SessionData } from 'node_modules/next-session/lib/types';

export interface ISessionOption {
  sid?: string;
  cookie?: {
    httpOnly: boolean;
    path: string;
    secure: boolean;
  };
}

export interface ISessionHandlerOption {
  gcInterval: number;
  filePath: string;
  secret: string;
}

export interface ISessionData extends SessionData {
  userId: number;
  companyId: number;
  roleId: number;
}

export interface ISessionUpdateData {
  userId?: number;
  companyId?: number;
  roleId?: number;
}
