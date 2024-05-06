import { PaymentPeriodType, PaymentStatusType, VoucherType } from './account';
import { ILineItem } from './line_item';

export interface IVoucherMetaData {
  date: number;
  voucherType: VoucherType;
  companyId: string;
  companyName: string;
  description: string;
  totalPrice: number;
  taxPercentage: number;
  fee: number;
  paymentMethod: string;
  paymentPeriod: PaymentPeriodType;
  installmentPeriod: number;
  paymentStatus: PaymentStatusType;
  alreadyPaidAmount: number;
}

export interface IVoucher {
  voucherIndex: string;
  invoiceIndex: string;
  metadatas: IVoucherMetaData[];
  lineItems: ILineItem[];
}
