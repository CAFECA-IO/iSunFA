import { EMAIL_LOGIN_ACTION } from '@/constants/email';

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
