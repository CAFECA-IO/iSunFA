export interface ISubscription {
  id: number;
  accountBookId: number;
  planId: number;
  autoRenewal: boolean;
  startDate: number;
  expiredDate: number;
  status: boolean;
  createdAt: number;
  updatedAt: number;
}

// Info: (20241230 - Liz) 以下是 Beta 版本新增的 interface

export enum TPlanPrice {
  BEGINNER_PRICE = 0,
  PROFESSIONAL_PRICE = 899,
  ENTERPRISE_PRICE = 2399,
  EXTRA_MEMBER_PRICE = 89,
}

interface IPlanFeature {
  id: string;
  name: string;
  value: string | string[];
}

export enum TPlanType {
  TRIAL = 'TRIAL',
  BEGINNER = 'BEGINNER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export interface IPlan {
  id: TPlanType;
  planName: string;
  price: TPlanPrice;
  extraMemberPrice?: TPlanPrice.EXTRA_MEMBER_PRICE;
  features: IPlanFeature[];
  comparison?: Record<string, string>;
}

export enum TPaymentStatus {
  PAID = 'PAID', // Info: (20250110 - Liz) 已付款
  PAYMENT_FAILED = 'PAYMENT_FAILED', // ~Info: (20250110 - Liz) 未付款~ Info: (20250401 - Tzuhan) 改為付款失敗
  FREE = 'FREE', // Info: (20250110 - Liz) 免費所以不用付款
  TRIAL = 'TRIAL', // Info: (20250401 - Tzuhan) 試用中
}

// Info: (20250214 - Liz) 使用者擁有的團隊 (使用者為團隊的擁有者 owner)
export interface IUserOwnedTeam {
  id: number; // Info: (20250110 - Liz) 團隊 ID
  name: string; // Info: (20250110 - Liz) 團隊名稱
  plan: TPlanType; // Info: (20250110 - Liz) 訂閱方案
  enableAutoRenewal: boolean; // Info: (20250110 - Liz) 是否開啟自動續約
  nextRenewalTimestamp: number; // Info: (20250110 - Liz) 下次續約日期 (與 expiredTimestamp 一樣，所以可以刪除)
  expiredTimestamp: number; // Info: (20250110 - Liz) 過期日期
  paymentStatus: TPaymentStatus; // Info: (20250110 - Liz) 付款狀態
}

export interface ITeamInvoice {
  id: number; // Info: (20250113 - Liz) 發票 ID
  teamId: number; // Info: (20250113 - Liz) 團隊 ID
  status: boolean; // Info: (20250113 - Liz) 付款狀態 (true:付款成功, false:付款失敗)
  issuedTimestamp: number; // Info: (20250113 - Liz) 發票開立日期 === Billing Date
  dueTimestamp: number; // Info: (20250113 - Liz) 收款到期日(目前設計是:收款到期日是服務開始日的第一天)

  // Info: (20250113 - Liz) 發票品項
  planId: TPlanType; // Info: (20250113 - Liz) 訂閱方案 ID
  planStartTimestamp: number; // Info: (20250113 - Liz) 訂閱方案開始時間
  planEndTimestamp: number; // Info: (20250113 - Liz) 訂閱方案結束時間
  planQuantity: number; // Info: (20250113 - Liz) 數量
  planUnitPrice: number; // Info: (20250113 - Liz) 單價
  planAmount: number; // Info: (20250113 - Liz) 總金額

  // Info: (20250113 - Liz) 付款人資訊
  payer: {
    name: string;
    address: string;
    phone: string;
    taxId: string;
  };

  // Info: (20250113 - Liz) 收款人資訊
  payee: {
    name: string;
    address: string;
    phone: string;
    taxId: string;
  };

  // Info: (20250113 - Liz) 發票金額
  subtotal: number;
  tax: number;
  total: number;
  amountDue: number;
}

export interface ICreditCardInfo {
  lastFourDigits: string;
}
