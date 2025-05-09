import { EMAIL_LOGIN_ACTION } from '@/constants/email_login';

export interface IInviteTemplate {
  inviterName: string;
  teamName: string;
  inviteLink: string;
}

export interface IFreeTemplate {
  userName: string;
  currentPlanName: string;
  currentDataStatus: string;
  subscribeLink: string;
}

export interface IPayTemplate {
  planName: string;
  userName: string;
  startTime: string;
  endTime: string;
  price: string;
}

export interface IPayErrorTemplate {
  userName: string;
  planName: string;
  startTime: string;
  endTime: string;
  price: string;
  payStatus: string;
  payLink: string;
}

export interface ISubscribeTemplate {
  userName: string;
}

export interface IEmailLogin {
  id?: number;
  email: string;
  code: string;
  hash: string;
  used: boolean;
  expiredAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface IEmailLoginLog {
  email: string;
  action: EMAIL_LOGIN_ACTION;
  createdAt: number;
}

export interface IOneTimePasswordResult {
  email: string;
  expiredAt: number;
  coolDown: number;
  coolDownAt: number;
}
export interface ICoolDown {
  coolDown: number;
  coolDownAt: number;
  // maxAttempts: number; // ToDo: (20250509 - Liz) 需要此欄位
  // attempts: number; // ToDo: (20250509 - Liz) 其實目前前端沒用到這個欄位，但文件上有寫
}
