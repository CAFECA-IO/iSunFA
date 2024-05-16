import { PaymentPeriodType } from '@/interfaces/account';

export interface IPayment {
  isRevenue: boolean; // 是否會創造收入，true是錢會進來，false是錢會出去
  price: number; // 總金額
  hasTax: boolean; // 是否含稅
  taxPercentage: number; // 稅率 0 or 5等金額
  hasFee: boolean; // 是否含手續額
  fee: number; // 手續費 金額
  paymentMethod: string; // 錢收進來會付出去的方法
  paymentPeriod: PaymentPeriodType; // 是 atOnce 或 installment
  installmentPeriod: number; // 這邊才是填 分期付款有幾期
  paymentAlreadyDone: number; // 已經付了多少錢, 或是收取多少錢
  paymentStatus: string; // 付款狀態
  progress: number; // 這是給contract 使用的， 看contract 實際工作完成了多少%, 不是指付款進度
}

export type IPartialPaymentForInvoiceUpload = Omit<
  IPayment,
  | 'paymentMethod'
  | 'paymentPeriod'
  | 'installmentPeriod'
  | 'paymentStatus'
  | 'paymentAlreadyDone'
  | 'progress'
>;

export function isIPayment(arg: IPayment): arg is IPayment {
  if (
    typeof arg.isRevenue !== 'boolean' ||
    typeof arg.price !== 'number' ||
    typeof arg.hasTax !== 'boolean' ||
    typeof arg.taxPercentage !== 'number' ||
    typeof arg.hasFee !== 'boolean' ||
    typeof arg.fee !== 'number' ||
    typeof arg.paymentMethod !== 'string' ||
    typeof arg.paymentPeriod !== 'string' ||
    typeof arg.installmentPeriod !== 'number' ||
    typeof arg.paymentAlreadyDone !== 'number' ||
    typeof arg.paymentStatus !== 'string' ||
    typeof arg.progress !== 'number'
  ) {
    return false;
  }
  return true;
}

export function isPartialPaymentForInvoiceUpload(
  arg: IPartialPaymentForInvoiceUpload
): arg is IPartialPaymentForInvoiceUpload {
  if (
    typeof arg.isRevenue !== 'boolean' ||
    typeof arg.price !== 'number' ||
    typeof arg.hasTax !== 'boolean' ||
    typeof arg.taxPercentage !== 'number' ||
    typeof arg.hasFee !== 'boolean' ||
    typeof arg.fee !== 'number'
  ) {
    return false;
  }
  return true;
}
