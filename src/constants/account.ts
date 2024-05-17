// Info: this file contains the interfaces, type guards, type cleaner for OCR and Voucher LLM recognition (20240416 - Murky)

// Info: type (20240416 - Murky)
export enum ProgressStatus {
  SUCCESS = 'success',
  IN_PROGRESS = 'inProgress',
  NOT_FOUND = 'notFound',
  ALREADY_UPLOAD = 'alreadyUpload',
  INVALID_INPUT = 'invalidInput',
  LLM_ERROR = 'llmError',
  SYSTEM_ERROR = 'systemError',
}

export enum EventType {
  INCOME = 'income',
  PAYMENT = 'payment',
  TRANSFER = 'transfer',
}

export enum VoucherType {
  RECEIVE = 'receive',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum PaymentStatusType {
  PAID = 'paid',
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
}

export enum PaymentPeriodType {
  AT_ONCE = 'atOnce',
  INSTALLMENT = 'installment',
}

// ToDo: change to SNAKE_CASE (20240516 - Murky)
export const eventTypeToVoucherType = {
  income: 'receive' as VoucherType,
  payment: 'expense' as VoucherType,
  transfer: 'transfer' as VoucherType,
};

// ToDo: move to util (20240516 - Murky)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEventType(data: any): data is EventType {
  return Object.values(EventType).includes(data);
}

// ToDo: move to util (20240516 - Murky)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isVoucherType(data: any): data is VoucherType {
  return Object.values(VoucherType).includes(data);
}

// ToDo: move to util (20240516 - Murky)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPaymentStatusType(data: any): data is PaymentStatusType {
  return Object.values(PaymentStatusType).includes(data);
}

// ToDo: move to util (20240516 - Murky)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPaymentPeriodType(data: any): data is PaymentPeriodType {
  return Object.values(PaymentPeriodType).includes(data);
}

// ToDo: move to util (20240516 - Murky)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isProgressStatus(data: any): data is ProgressStatus {
  return Object.values(ProgressStatus).includes(data as ProgressStatus);
}
