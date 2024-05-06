import {
  PaymentPeriodType,
  PaymentStatusType,
  isEventType,
  isPaymentPeriodType,
  isPaymentStatusType,
} from './account';

export interface IInvoice {
  invoiceId: string;
  date: number; // timestamp
  eventType: string; // 'income' | 'payment' | 'transfer';
  paymentReason: string;
  description: string;
  venderOrSupplyer: string;
  payment: {
    price: number;
    hasTax: boolean;
    taxPercentage: number;
    hasFee: boolean;
    fee: number;
  };
}

export interface IInvoiceWithPaymentMethod extends IInvoice {
  projectId: string;
  contractId: string;
  payment: IInvoice['payment'] & {
    paymentMethod: string;
    paymentPeriod: PaymentPeriodType;
    installmentPeriod: number;
    paymentStatus: PaymentStatusType;
    alreadyPaidAmount: number;
  };
}
// Info Murky (20240416): Type Guard
//  Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIInvoice(data: any): data is IInvoice {
  const validInvoiceId = typeof data.invoiceId === 'string';
  // 檢查date是否存在，且start_date和end_date是否為數字
  const validDate = data.date && typeof data.date === 'number';

  // 檢查eventType是否符合EventType類型（假設EventType為一個字符串的聯合類型）
  const validEventType = isEventType(data.eventType);

  // 檢查其他字符串屬性
  const validPaymentReason = typeof data.paymentReason === 'string';
  const validDescription = typeof data.description === 'string';
  const validVenderOrSupplyer = typeof data.venderOrSupplyer === 'string';

  // 檢查payment對象
  const validPayment =
    data.payment &&
    typeof data.payment.price === 'number' &&
    typeof data.payment.hasTax === 'boolean' &&
    typeof data.payment.taxPercentage === 'number' &&
    typeof data.payment.hasFee === 'boolean' &&
    typeof data.payment.fee === 'number';

  return (
    validDate &&
    validInvoiceId &&
    validEventType &&
    validPaymentReason &&
    validDescription &&
    validVenderOrSupplyer &&
    validPayment
  );
}

export function isIInvoiceWithPaymentMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): data is IInvoiceWithPaymentMethod {
  return (
    typeof data.projectId === 'string' &&
    typeof data.contractId === 'string' &&
    typeof data.payment?.paymentMethod === 'string' &&
    isPaymentPeriodType(data.payment?.paymentPeriod) &&
    typeof data.payment?.installmentPeriod === 'number' &&
    isPaymentStatusType(data.payment?.paymentStatus) &&
    typeof data.payment?.alreadyPaidAmount === 'number' &&
    isIInvoice(data)
  );
}
