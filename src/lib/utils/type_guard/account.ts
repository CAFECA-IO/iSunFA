import {
  EventType,
  PaymentPeriodType,
  PaymentStatusType,
  ProgressStatus,
  VoucherType,
} from '@/constants/account';
import { STATUS_MESSAGE } from '@/constants/status_code';
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

// Info: (20240527 - Murky) convert string to EventType:
export function convertStringToEventType(data: string) {
  if (!isEventType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as EventType;
}

export function convertStringToVoucherType(data: string) {
  if (!isVoucherType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as VoucherType;
}

export function convertStringToPaymentStatusType(data: string) {
  if (!isPaymentStatusType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as PaymentStatusType;
}

export function convertStringToPaymentPeriodType(data: string) {
  if (!isPaymentPeriodType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as PaymentPeriodType;
}
