// ToDo (20240605 - Murk): 不同的type guard 需要放在屬於他的資料夾，不要都放在這個檔案裡
import {
  AccountType,
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
  const isValid = Object.values(EventType).includes(data as EventType);
  return isValid;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountType(data: any): data is AccountType {
  const isValid = Object.values(AccountType).includes(data as AccountType);
  return isValid;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isVoucherType(data: any): data is VoucherType {
  const isValid = Object.values(VoucherType).includes(data as VoucherType);
  return isValid;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPaymentStatusType(data: any): data is PaymentStatusType {
  const isValid = Object.values(PaymentStatusType).includes(data as PaymentStatusType);
  return isValid;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPaymentPeriodType(data: any): data is PaymentPeriodType {
  const isValid = Object.values(PaymentPeriodType).includes(data as PaymentPeriodType);
  return isValid;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isProgressStatus(data: any): data is ProgressStatus {
  const isValid = Object.values(ProgressStatus).includes(data as ProgressStatus);
  return isValid;
}

export function isIAccountResultStatus(value: unknown): value is IAccountResultStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { resultId, status } = value as IAccountResultStatus;
  const isValid = typeof resultId === 'string' && isProgressStatus(status);
  return isValid;
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

export function convertStringToAccountType(data: string) {
  if (!isAccountType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as AccountType;
}
