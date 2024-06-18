import { SessionData } from 'node_modules/next-session/lib/types';

export interface ISessionData extends SessionData {
  userId: number;
  companyId: number;
}
