import { IVoucher } from './voucher';

export interface IJournal {
  eventType: string;
  date: string;
  reason: string;
  companyId: string;
  company: string;
  description: string;
  totalPrice: number;
  paymentMethod: string;
  paymentPeriod: string;
  paymentStatus: string;
  projectId: string;
  project: string;
  contract: string;
  voucher: IVoucher;
}
