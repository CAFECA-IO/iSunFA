import { EventType, isEventType } from '@/interfaces/account';
import { IPayment, isIPayment } from '@/interfaces/payment';

export interface IInvoice {
  invoiceId: string;
  date: number; // timestamp
  eventType: EventType; // 'income' | 'payment' | 'transfer';
  paymentReason: string;
  description: string;
  venderOrSupplyer: string;
  projectId: string;
  contractId: string;
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
    typeof data.contractId === 'string' &&
    isIPayment(data.payment)
  );
}

// export function isIInvoiceWithPaymentMethod(
//   data: IInvoiceWithPaymentMethod
// ): data is IInvoiceWithPaymentMethod {
//   return (
//     typeof data.invoiceId === 'string' &&
//     typeof data.date === 'number' &&
//     isEventType(data.eventType) &&
//     typeof data.paymentReason === 'string' &&
//     typeof data.description === 'string' &&
//     typeof data.venderOrSupplyer === 'string' &&
//     typeof data.projectId === 'string' &&
//     typeof data.contractId === 'string' &&
//     isIPayment(data.payment)
//   );
// }
