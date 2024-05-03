import { PaymentPeriodType, PaymentStatusType, VoucherType } from './account';
import { LineItem } from './line_item';

export interface IVoucherMetaData {
  date: number;
  voucherType: VoucherType;
  venderOrSupplyer: string;
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
  metadatas: IVoucherMetaData[];
  lineItems: LineItem[];
}
