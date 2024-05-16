import { EventType, isEventType } from '@/interfaces/account';
import { IPayment, isIPayment } from '@/interfaces/payment';

export interface IInvoice {
  invoiceId: string;
  date: number; // timestamp
  eventType: EventType;
  paymentReason: string;
  description: string;
  venderOrSupplyer: string;
  projectId: string | null; // Info: TO Murky project id is nullable (20240515 - tzuhan)
  project: string; // Info: TO Murky if project is null then it will be string 'None' (20240515 - tzuhan)
  contractId: string | null; // Info: TO Murky contract id is nullable (20240515 - tzuhan)
  contract: string; // Info: TO Murky if contract is null then it will be string 'None' (20240515 - tzuhan)
  payment: IPayment;
}
// Info Murky (20240416): Type Guard
//  Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
export function isIInvoice(data: IInvoice): data is IInvoice {
  return (
    typeof data.invoiceId === 'string' &&
    typeof data.date === 'number' &&
    isEventType(data.eventType) &&
    typeof data.paymentReason === 'string' &&
    typeof data.description === 'string' &&
    typeof data.venderOrSupplyer === 'string' &&
    (typeof data.projectId === 'string' || data.projectId === null) && // Info: TO Murky project id is nullable (20240515 - tzuhan)
    typeof data.project === 'string' &&
    typeof data.contract === 'string' &&
    (typeof data.contractId === 'string' || data.projectId === null) && // Info: TO Murky contract id is nullable (20240515 - tzuhan)
    isIPayment(data.payment)
  );
}
