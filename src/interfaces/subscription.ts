export interface ISubscription {
  id: number;
  companyId: number;
  planId: number;
  autoRenewal: boolean;
  startDate: number;
  expiredDate: number;
  status: boolean;
  createdAt: number;
  updatedAt: number;
}

// Info: (20241230 - Liz) 以下是 Beta 版本新增的 interface

export enum TPlanType {
  BEGINNER = 'beginner',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

interface IPlanFeature {
  id: string;
  name: string;
  value: string | string[];
}

export interface IPlan {
  id: string;
  planName: string;
  price: number;
  features: IPlanFeature[];
}

export interface IUserOwnedTeam {
  id: number;
  name: string;
  plan: TPlanType;
  nextRenewal: number;
  expiredDate: number;
  enableAutoRenewal: boolean;
}
