import { PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { TRANSACTION_STATUS } from '@/constants/transaction';
import { TPlanType } from '@/interfaces/subscription';

/** Info: (20240823 - Jacky) Represents a payment.
 *
 * @interface
 * @property {boolean} isRevenue - 是否會創造收入，true是錢會進來，false是錢會出去
 * @property {number} price - 總金額
 * @property {boolean} hasTax - 是否含稅
 * @property {number} taxPercentage - 稅率 0 or 5等金額
 * @property {boolean} hasFee - 是否含手續額
 * @property {number} fee - 手續費 金額
 * @property {string} method - 錢收進來會付出去的方法
 * @property {PaymentPeriodType} period - 是 atOnce 或 installment
 * @property {number} installmentPeriod - 這邊才是填 分期付款有幾期
 * @property {number} alreadyPaid - 已經付了多少錢, 或是收取多少錢
 * @property {PaymentStatusType} status - 付款狀態
 * @property {number} progress - 這是給contract 使用的， 看contract 實際工作完成了多少%, 不是指付款進度
 * @property {number} taxPrice - 稅金
 */

export interface IPayment {
  isRevenue: boolean;
  price: number;
  hasTax: boolean;
  taxPercentage: number;
  hasFee: boolean;
  fee: number;
  method: string;
  period: PaymentPeriodType;
  installmentPeriod: number;
  alreadyPaid: number;
  status: PaymentStatusType;

  // ToDo: (20240807 - Jacky) Dear @TinyMurky, is this progress deleted in new design?

  progress: number;
}

export interface IPaymentBeta extends IPayment {
  taxPrice: number;
}

export interface IPaymentMethod {
  id?: number;
  type: PAYMENT_METHOD_TYPE;
  number: string;
  expirationDate: string;
  cvv: string;
  default?: boolean;
}

// Info: (20250318 - Luphia) 基本參照 UserPaymentInfo，獨 id 改為 optional
export interface IPaymentInfo {
  id?: number;
  platform?: string;
  userId: number;
  token: string;
  default: boolean;
  detail: IPaymentMethod;
  transactionId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

// Info: (20250417 - Luphia) 用戶目前方案資訊
export interface ITeamPayment {
  id?: number;
  teamId: number;
  teamPlanType: TPlanType;
  userPaymentInfoId?: number;
  autoRenewal: boolean;
  startDate: number;
  expiredDate: number;
  nextChargetDate: number;
  createdAt: number;
  updatedAt: number;
}

// Info: (20250330 - Luphia) 用戶信用卡扣款紀錄
export interface ITeamPaymentTransaction {
  id?: number;
  teamOrderId: number;
  userPaymentInfoId: number;
  amount: number;
  currency: string;
  paymentGateway: string;
  paymentGetwayRecordId?: string;
  status: TRANSACTION_STATUS;
  createdAt: number;
  updatedAt: number;
}

export interface ITeamInvoice {
  id?: number;
  teamOrderId: number;
  teamPaymentTransactionId: number;
  invoiceCode: string;
  price: number;
  tax: number;
  total: number;
  currency: string;
  payerId?: string;
  payerName?: string;
  payerEmail?: string;
  payerAddress?: string;
  payerPhone?: string;
  status: string;
  issuedAt: number;
  createdAt: number;
  updatedAt?: number;
}

export interface ITeamSubscription {
  id?: number;
  userId: number;
  teamId: number;
  planType: TPlanType;
  maxMembers: number;
  startDate: number;
  expiredDate: number;
  createdAt: number;
  updatedAt: number;
}
