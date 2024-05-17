// Info Murky (20240416): Type Guard

import { IInvoice } from "@/interfaces/invoice";
import { isEventType } from "@/lib/utils/type_guard/account";
import { isIPayment } from "@/lib/utils/type_guard/payment";

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
