import { IPayment, IPaymentBeta } from '@/interfaces/payment';
import { EventType } from '@/constants/account';
import { Prisma } from '@prisma/client';

// Info: （ 20240522 - Murky）To Emily, To Julian 這個interface是用來存入prisma的資料, 用來在ISFMK00052時Upload使用
export interface IInvoice {
  journalId: number | null;
  date: number; // timestamp
  eventType: EventType;
  paymentReason: string;
  description: string;
  vendorOrSupplier: string;
  projectId: number | null;
  project: string | null;
  contractId: number | null;
  contract: string | null;
  payment: IPayment;
}

export type IInvoiceIncludePaymentJournal = Prisma.InvoiceGetPayload<{
  include: {
    payment: true;
    journal: {
      include: {
        project: true;
        contract: true;
      };
    };
  };
}>;

export interface IInvoiceBeta extends IInvoice {
  number: string; // origin invoice number
  type: string;
  vendorTaxId: string;
  payment: IPaymentBeta;
}
