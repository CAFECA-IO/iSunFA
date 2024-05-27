import { IPayment } from '@/interfaces/payment';
import { EventType } from '@/constants/account';

// ToDo: （ 20240522 - Murkky）這邊之後要改成符合Prisma的資料型態
export interface IInvoice {
  invoiceId: string;
  date: number; // timestamp
  eventType: EventType;
  paymentReason: string;
  description: string;
  vendorOrSupplier: string;
  projectId: string | null;
  project: string | null;
  contractId: string | null;
  contract: string | null;
  payment: IPayment;
}

// Info: （ 20240522 - Murky）To Emily, To Julian 這個interface是用來存入prisma的資料, 用來在ISFMK00052時Upload使用
export interface IInvoiceDataForSavingToDB {
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
