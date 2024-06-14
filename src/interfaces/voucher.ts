import { VoucherType } from '@/constants/account';
import { ILineItem } from '@/interfaces/line_item';
import { IPayment } from '@/interfaces/payment';

export interface IVoucherMetaData {
  date: number;
  voucherType: VoucherType;
  companyId: string;
  companyName: string;
  description: string;
  reason: string; // 從paymentReason改這個
  projectId: string;
  project: string;
  contractId: string;
  contract: string;
  payment: IPayment;
}

// Depreciate: (20240524 - Murky) To Emily, To Julian IVoucher only contains lineItems
// I use IVoucherDataForSavingToDB
export interface IVoucher {
  voucherIndex: string;
  invoiceIndex: string; // 改在這裡
  metaData: IVoucherMetaData[];
  lineItems: ILineItem[];
}

export interface IVoucherDataForSavingToDB {
  journalId?: number;
  lineItems: ILineItem[];
}
