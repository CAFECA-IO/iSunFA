import { EventType, PaymentPeriodType, PaymentStatusType, ProgressStatus, VoucherType } from '@/constants/account';
import { IAccountResultStatus } from '@/interfaces/accounting_account';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEventType(data: any): data is EventType {
  return Object.values(EventType).includes(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isVoucherType(data: any): data is VoucherType {
  return Object.values(VoucherType).includes(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPaymentStatusType(data: any): data is PaymentStatusType {
  return Object.values(PaymentStatusType).includes(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPaymentPeriodType(data: any): data is PaymentPeriodType {
  return Object.values(PaymentPeriodType).includes(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isProgressStatus(data: any): data is ProgressStatus {
  return Object.values(ProgressStatus).includes(data as ProgressStatus);
}

export function isIAccountResultStatus(value: unknown): value is IAccountResultStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { resultId, status } = value as IAccountResultStatus;
  return typeof resultId === 'string' && isProgressStatus(status);
}
