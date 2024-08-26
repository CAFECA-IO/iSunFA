import { PaymentPeriodType, PaymentStatusType } from '@/constants/account';

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
