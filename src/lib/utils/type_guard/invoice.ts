// Info Murky (20240416): Type Guard

import { IInvoice, IInvoiceDataForSavingToDB } from '@/interfaces/invoice';
import { isEventType } from '@/lib/utils/type_guard/account';
import { isIPayment } from '@/lib/utils/type_guard/payment';

//  Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
export function isIInvoice(data: IInvoice): data is IInvoice {
  return (
    typeof data.invoiceId === 'number' &&
    typeof data.date === 'number' &&
    isEventType(data.eventType) &&
    typeof data.paymentReason === 'string' &&
    typeof data.description === 'string' &&
    typeof data.vendorOrSupplier === 'string' &&
    (typeof data.projectId === 'string' || data.projectId === null) &&
    (typeof data.project === 'string' || data.projectId === null) &&
    (typeof data.contract === 'string' || data.projectId === null) &&
    (typeof data.contractId === 'string' || data.projectId === null) &&
    isIPayment(data.payment)
  );
}
export function isIInvoiceDataForSavingToDB(
  data: IInvoiceDataForSavingToDB
): data is IInvoiceDataForSavingToDB {
  return (
    (typeof data.journalId === 'number' || data.journalId === null) &&
    typeof data.date === 'number' &&
    isEventType(data.eventType) &&
    typeof data.paymentReason === 'string' &&
    typeof data.description === 'string' &&
    typeof data.vendorOrSupplier === 'string' &&
    (typeof data.projectId === 'string' || data.projectId === null) &&
    (typeof data.project === 'string' || data.projectId === null) &&
    (typeof data.contract === 'string' || data.projectId === null) &&
    (typeof data.contractId === 'string' || data.projectId === null) &&
    isIPayment(data.payment)
  );
}
