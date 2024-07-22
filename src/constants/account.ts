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
  PAYMENT = 'payment',
  INCOME = 'income',
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

export enum EquityType {
  STOCK = 'stock',
  CAPITAL_SURPLUS = 'capitalSurplus',
  RETAINED_EARNINGS = 'retainedEarnings',
  OTHER_EQUITY = 'otherEquity',
}

export const EVENT_TYPE_TO_VOUCHER_TYPE_MAP: {
  [key in EventType]: VoucherType;
} = {
  [EventType.INCOME]: VoucherType.RECEIVE,
  [EventType.PAYMENT]: VoucherType.EXPENSE,
  [EventType.TRANSFER]: VoucherType.TRANSFER,
};

export const MISSING_CODE_MARKERS = ['!', '@', '#', '$', '%'];

export const EVENT_TYPE = {
  ...EventType,
};

export const EQUITY_TYPE_TO_CODE_MAP: {
  [key in EquityType]: string[];
} = {
  [EquityType.STOCK]: ["3110", "3120", "3130", "3140", "3150", "3160", "3170", "3100"],
  [EquityType.CAPITAL_SURPLUS]: [
    "3210",
    "3211",
    "3212",
    "3213",
    "3220",
    "3225",
    "3230",
    "3235",
    "3240",
    "3250",
    "3251",
    "3252",
    "3260",
    "3265",
    "3270",
    "3271",
    "3272",
    "3273",
    "3280",
    "3200"
  ],
  [EquityType.RETAINED_EARNINGS]: [
    "3310",
    "3320",
    "3350",
    "3351",
    "3352",
    "3353",
    "3220"
  ],
  [EquityType.OTHER_EQUITY]: [
    "3410",
    "3411",
    "341A",
    "3412",
    "341B",
    "3413",
    "341C",
    "3420",
    "3421",
    "3422",
    "3423",
    "3424",
    "342A",
    "342B",
    "342C",
    "342D",
    "342E",
    "3440",
    "3441",
    "3442",
    "3443",
    "3445",
    "3446",
    "3447",
    "3448",
    "3450",
    "3451",
    "345A",
    "345B",
    "345C",
    "345D",
    "345E",
    "345F",
    "345G",
    "345H",
    "3452",
    "345I",
    "345J",
    "345K",
    "345L",
    "345M",
    "345N",
    "345O",
    "345P",
    "3453",
    "345Q",
    "345R",
    "345S",
    "345T",
    "345U",
    "345V",
    "345W",
    "345X",
    "3460",
    "3461",
    "3462",
    "3463",
    "3470",
    "3471",
    "3472",
    "3473",
    "3480",
    "3481",
    "3482",
    "3483",
    "3490",
    "3491",
    "3499",
    "3400",
    "3500",
    "35XX",
    "355X",
    "3XXX"
  ]
};
