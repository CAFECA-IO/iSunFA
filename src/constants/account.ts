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
  PAUSED = 'paused',
  HAS_BEEN_USED = 'hasBeenUsed',
}

export enum EventType {
  INCOME = 'income',
  PAYMENT = 'payment',
  TRANSFER = 'transfer',
}

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  COST = 'cost',
  INCOME = 'income',
  EXPENSE = 'expense',
  GAIN_OR_LOSS = 'gainOrLoss',
  OTHER_COMPREHENSIVE_INCOME = 'otherComprehensiveIncome',
  CASH_FLOW = 'cashFlow',
  CHANGE_IN_EQUITY = 'changeInEquity',
  OTHER = 'other',
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

export enum AccountSystem {
  IFRS = 'IFRS',
  US_GAAP = 'US_GAAP',
}

export const EVENT_TYPE_TO_VOUCHER_TYPE_MAP: {
  [key in EventType]: VoucherType;
} = {
  [EventType.INCOME]: VoucherType.RECEIVE,
  [EventType.PAYMENT]: VoucherType.EXPENSE,
  [EventType.TRANSFER]: VoucherType.TRANSFER,
};
