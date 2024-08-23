import { VoucherType } from '@/constants/account';
import { ILineItem } from '@/interfaces/line_item';
import { IPayment } from '@/interfaces/payment';
import { Prisma } from '@prisma/client';

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

// Deprecated: (20240524 - Murky) To Emily, To Julian IVoucher only contains lineItems
// I use IVoucherDataForSavingToDB
export interface IVoucher {
  voucherIndex: string;
  invoiceIndex: string; // 改在這裡
  metaData: IVoucherMetaData[];
  lineItems: ILineItem[];
}

export interface IVoucherDataForAPIResponse {
  id: number;
  createdAt: number;
  updatedAt: number;
  journalId: number;
  no: string;
  lineItems: {
    id: number;
    amount: number;
    description: string;
    debit: boolean;
    accountId: number;
    voucherId: number;
    createdAt: number;
    updatedAt: number;
  }[];
}

export interface IVoucherDataForSavingToDB {
  journalId?: number;
  lineItems: ILineItem[];
}

export type IVoucherFromPrismaIncludeJournalLineItems = Prisma.VoucherGetPayload<{
  include: {
    journal: true;
    lineItems: {
      include: {
        account: true;
      };
    };
  };
}>;

export type IVoucherFromPrismaIncludeLineItems = Prisma.VoucherGetPayload<{
  include: {
    lineItems: {
      include: {
        account: true;
      };
    };
  };
}>;
