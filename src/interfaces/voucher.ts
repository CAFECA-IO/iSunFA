import { PaymentPeriodType, PaymentStatusType, VoucherType } from './account';
import { ILineItem, isILineItem } from './line_item';

export interface IVoucherMetaData {
  date: number;
  voucherType: VoucherType;
  companyId: string; // 手動輸入
  companyName: string; // vendor supplier 改成這個
  description: string;
  totalPrice: number;
  taxPercentage: number;
  fee: number;
  paymentMethod: string;
  paymentPeriod: PaymentPeriodType;
  installmentPeriod: number;
  paymentStatus: PaymentStatusType;
  alreadyPaidAmount: number;
  reason: string; // 從paymentReason改這個
  projectId: string;
  project: string;
  contractId: string;
  contract: string;
}

export interface IVoucher {
  voucherIndex: string;
  invoiceIndex: string; // 改在這裡
  metadatas: IVoucherMetaData[];
  lineItems: ILineItem[];
}

function isIVoucherMetaData(arg: IVoucherMetaData): arg is IVoucherMetaData {
  if (
    typeof arg.date !== 'number' ||
    typeof arg.voucherType !== 'string' ||
    typeof arg.companyId !== 'string' ||
    typeof arg.companyName !== 'string' ||
    typeof arg.description !== 'string' ||
    typeof arg.totalPrice !== 'number' ||
    typeof arg.taxPercentage !== 'number' ||
    typeof arg.fee !== 'number' ||
    typeof arg.paymentMethod !== 'string' ||
    typeof arg.paymentPeriod !== 'string' ||
    typeof arg.installmentPeriod !== 'number' ||
    typeof arg.paymentStatus !== 'string' ||
    typeof arg.alreadyPaidAmount !== 'number' ||
    typeof arg.reason !== 'string' ||
    typeof arg.projectId !== 'string' ||
    typeof arg.project !== 'string' ||
    typeof arg.contractId !== 'string' ||
    typeof arg.contract !== 'string'
  ) {
    return false;
  }
  return true;
}

export function isIVoucher(arg: IVoucher): arg is IVoucher {
  if (arg.voucherIndex === undefined || arg.invoiceIndex === undefined) {
    return false;
  }
  const isIVoucherMetaDataReturn = arg.metadatas.every(isIVoucherMetaData);
  if (isIVoucherMetaDataReturn) {
    return false;
  }
  const isILineItemReturn = arg.lineItems.every(isILineItem);
  if (!isILineItemReturn) {
    return false;
  }
  return true;
}
