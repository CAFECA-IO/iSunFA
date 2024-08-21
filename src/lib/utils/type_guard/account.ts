import {
  AccountType,
  EquityType,
  EventType,
  PaymentPeriodType,
  PaymentStatusType,
  ProgressStatus,
  VoucherType,
} from '@/constants/account';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  IAccountForSheetDisplay,
  IAccountResultStatus,
  IAccountReadyForFrontend,
} from '@/interfaces/accounting_account';
import { isEnumValue } from './common';

export function isEventType(data: unknown): data is EventType {
  const isValid = isEnumValue(EventType, data);
  return isValid;
}

export function isAccountType(data: unknown): data is AccountType {
  const isValid = isEnumValue(AccountType, data);
  return isValid;
}

export function isVoucherType(data: unknown): data is VoucherType {
  const isValid = isEnumValue(VoucherType, data);
  return isValid;
}

export function isPaymentStatusType(data: unknown): data is PaymentStatusType {
  const isValid = isEnumValue(PaymentStatusType, data);
  return isValid;
}

export function isPaymentPeriodType(data: unknown): data is PaymentPeriodType {
  const isValid = isEnumValue(PaymentPeriodType, data);
  return isValid;
}

export function isProgressStatus(data: unknown): data is ProgressStatus {
  const isValid = isEnumValue(ProgressStatus, data);
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

export function isIAccountForSheetDisplay(value: unknown): value is IAccountForSheetDisplay {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { code, name, amount, indent, debit, percentage } = value as IAccountForSheetDisplay;
  const isValid =
    typeof code === 'string' &&
    typeof name === 'string' &&
    (amount === null || typeof amount === 'number') &&
    typeof indent === 'number' &&
    (debit === undefined || typeof debit === 'boolean') &&
    (percentage === null || typeof percentage === 'number');
  return isValid;
}

export function isIAccountForSheetDisplayArray(value: unknown): value is IAccountForSheetDisplay[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => isIAccountForSheetDisplay(item));
}

export function isIAccountReadyForFrontend(value: unknown): value is IAccountReadyForFrontend {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const {
    code,
    name,
    curPeriodAmount,
    curPeriodAmountString,
    curPeriodPercentage,
    prePeriodAmount,
    prePeriodAmountString,
    prePeriodPercentage,
    indent,
  } = value as IAccountReadyForFrontend;
  const isValid =
    typeof code === 'string' &&
    typeof name === 'string' &&
    typeof curPeriodAmount === 'number' &&
    typeof curPeriodAmountString === 'string' &&
    typeof curPeriodPercentage === 'number' &&
    typeof prePeriodAmount === 'number' &&
    typeof prePeriodAmountString === 'string' &&
    typeof prePeriodPercentage === 'number' &&
    typeof indent === 'number';
  return isValid;
}

export function isIAccountReadyForFrontendArray(
  value: unknown
): value is IAccountReadyForFrontend[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => isIAccountReadyForFrontend(item));
}

export function isEquityType(data: unknown): data is EquityType {
  const isValid = Object.values(EquityType).includes(data as EquityType);
  return isValid;
}

export function assertIsIAccountResultStatus(
  value: unknown
): asserts value is IAccountResultStatus {
  if (!isIAccountResultStatus(value)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
}

export function assertIsIAccountForSheetDisplay(
  value: unknown
): asserts value is IAccountForSheetDisplay {
  if (!isIAccountForSheetDisplay(value)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
}

export function assertIsIAccountForSheetDisplayArray(
  value: unknown
): asserts value is IAccountForSheetDisplay[] {
  if (!isIAccountForSheetDisplayArray(value)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
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

export function convertStringToEquityType(data: string) {
  if (!isEquityType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as EquityType;
}
