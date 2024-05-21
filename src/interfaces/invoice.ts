import { IPayment } from '@/interfaces/payment';
import { EventType } from '@/constants/account';

export interface IInvoice {
  invoiceId: string;
  date: number; // timestamp
  eventType: EventType;
  paymentReason: string;
  description: string;
  venderOrSupplier: string;
  projectId: string | null; // Info: TO Murky project id is nullable (20240515 - tzuhan)
  project: string; // Info: TO Murky if project is null then it will be string 'None' (20240515 - tzuhan)
  contractId: string | null; // Info: TO Murky contract id is nullable (20240515 - tzuhan)
  contract: string; // Info: TO Murky if contract is null then it will be string 'None' (20240515 - tzuhan)
  payment: IPayment;
}
