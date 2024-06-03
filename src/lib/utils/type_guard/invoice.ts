// Info Murky (20240416): Type Guard

import { IInvoice } from '@/interfaces/invoice';
import { isEventType } from '@/lib/utils/type_guard/account';
import { isIPayment } from '@/lib/utils/type_guard/payment';

export function isIInvoice(
  data: IInvoice
): data is IInvoice {
  return (
    (typeof data.journalId === 'number' || data.journalId === null) &&
    typeof data.date === 'number' &&
    isEventType(data.eventType) &&
    typeof data.paymentReason === 'string' &&
    typeof data.description === 'string' &&
    typeof data.vendorOrSupplier === 'string' &&
    (typeof data.projectId === 'number' || data.projectId === null) &&
    (typeof data.project === 'string' || data.projectId === null) &&
    (typeof data.contractId === 'number' || data.contractId === null) &&
    (typeof data.contract === 'string' || data.contract === null) &&
    isIPayment(data.payment)
  );
}
