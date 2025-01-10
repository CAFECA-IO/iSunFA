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

export enum TPaymentStatus {
  PAID = 'paid', // Info: (20250110 - Liz) 已付款
  UNPAID = 'unpaid', // Info: (20250110 - Liz) 未付款
  FREE = 'free', // Info: (20250110 - Liz) 免費所以不用付款
}

export interface IUserOwnedTeam {
  id: number;
  name: string; // Info: (20250110 - Liz) 團隊名稱
  plan: TPlanType; // Info: (20250110 - Liz) 訂閱方案
  enableAutoRenewal: boolean; // Info: (20250110 - Liz) 是否開啟自動續約
  nextRenewal: number; // Info: (20250110 - Liz) 下次續約日期
  expiredDate: number; // Info: (20250110 - Liz) 過期日期
  paymentStatus: TPaymentStatus; // Info: (20250110 - Liz) 付款狀態
}
