import { isEventType } from './account';
import {
  IPartialPaymentForInvoiceUpload,
  IPayment,
  isIPayment,
  isPartialPaymentForInvoiceUpload,
} from './payment';

// IInvoiceWithPaymentMethod Interface
export interface IInvoiceWithPaymentMethod {
  invoiceId: string;
  date: number; // timestamp
  eventType: string; // 'income' | 'payment' | 'transfer';
  paymentReason: string;
  description: string;
  venderOrSupplyer: string;
  projectId: string;
  contractId: string;
  payment: IPayment;
}

// IInvoice Interface
export interface IInvoice {
  invoiceId: string;
  date: number; // timestamp
  eventType: string; // 'income' | 'payment' | 'transfer';
  paymentReason: string;
  description: string;
  venderOrSupplyer: string;
  projectId: string;
  contractId: string;
  payment: IPartialPaymentForInvoiceUpload;
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
    isPartialPaymentForInvoiceUpload(data.payment)
  );
}

export function isIInvoiceWithPaymentMethod(
  data: IInvoiceWithPaymentMethod
): data is IInvoiceWithPaymentMethod {
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
