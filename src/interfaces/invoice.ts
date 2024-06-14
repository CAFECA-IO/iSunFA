import { IPayment } from '@/interfaces/payment';
import { EventType } from '@/constants/account';

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
