// Info (Murky - 20240514) To Emily, IInvoice多了project 和 contract, 要填入project name 和 contract name
import { EventType, isEventType } from './account';
import { IPayment, isIPayment } from './payment';

export interface IInvoice {
  invoiceId: string;
  date: number; // timestamp
  eventType: EventType;
  paymentReason: string;
  description: string;
  venderOrSupplyer: string;
  projectId: string;
  project: string; // Info (Murky - 20240514) To Emily, IInvoice多了project, 要填入project name
  contractId: string;
  contract: string; // Info (Murky - 20240514) To Emily, IInvoice多了contract, 要填入contract name
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
    typeof data.projectId === 'string' &&
    typeof data.project === 'string' &&
    typeof data.contract === 'string' &&
    typeof data.contractId === 'string' &&
    isIPayment(data.payment)
  );
}
