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

export enum InvoiceType {
  PURCHASE_TRIPLICATE_AND_ELECTRONIC = 'PurchaseTriplicateAndElectronic', // 進項三聯式、電子計算機統一發票
  PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseDuplicateCashRegisterAndOther', // 進項二聯式收銀機統一發票、載有稅額之其他憑證
  PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC = 'PurchaseReturnsTriplicateAndElectronic', // 三聯式、電子計算機、三聯式收銀機統一發票及一般稅額計算之電子發票之進貨退出或折讓證明單
  PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseReturnsDuplicateCashRegisterAndOther', // 二聯式收銀機統一發票及載有稅額之其他憑證之進貨退出或折讓證明單
  PURCHASE_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC = 'PurchaseTriplicateCashRegisterAndElectronic', // 進項三聯式收銀機統一發票及一般稅額計算之電子發票，每張稅額五百元以下之進項三聯式收銀機統一發票及一般稅額計算之電子發票
  PURCHASE_UTILITY_ELECTRONIC_INVOICE = 'PurchaseUtilityElectronicInvoice', // 進項公用事業電子發票字軌號碼得以公用事業產製抬頭為一百零五年一月以後已繳納之繳費通知單或已繳費憑證之載具流水號替代登錄
  PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC = 'PurchaseSummarizedTriplicateAndElectronic', // 彙總登錄每張稅額五百元以下之進項三聯式、電子計算機統一發票
  PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseSummarizedDuplicateCashRegisterAndOther', // 彙總登錄每張稅額五百元以下之進項二聯式收銀機統一發票、載有稅額之其他憑證
  PURCHASE_CUSTOMS_DUTY_PAYMENT = 'PurchaseCustomsDutyPayment', // 進項海關代徵營業稅繳納證
  PURCHASE_CUSTOMS_DUTY_REFUND = 'PurchaseCustomsDutyRefund', // 進項海關退還溢繳營業稅申報單
  SALES_TRIPLICATE_INVOICE = 'SalesTriplicateInvoice', // 銷項三聯式統一發票
  SALES_DUPLICATE_CASH_REGISTER_INVOICE = 'SalesDuplicateCashRegisterInvoice', // 銷項二聯式、二聯式收銀機統一發票
  SALES_RETURNS_TRIPLICATE_AND_ELECTRONIC = 'SalesReturnsTriplicateAndElectronic', // 三聯式、電子計算機、三聯式收銀機統一發票及一般稅額計算之電子發票之銷貨退回或折讓證明單
  SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM = 'SalesReturnsDuplicateAndNonUniform', // 二聯式、二聯式收銀機統一發票及銷項免用統一發票之銷貨退回或折讓證明單
  SALES_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC = 'SalesTriplicateCashRegisterAndElectronic', // 銷項三聯式收銀機統一發票及一般稅額計算之電子發票
  SALES_NON_UNIFORM_INVOICE = 'SalesNonUniformInvoice', // 銷項免用統一發票
  SPECIAL_TAX_CALCULATION = 'SpecialTaxCalculation', // 銷項憑證、特種稅額計算之電子發票
  SPECIAL_TAX_RETURNS = 'SpecialTaxReturns', // 銷貨退回或折讓證明單
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
  //  CHANGE_IN_EQUITY = 'changeInEquity', // ToDo: (20240802 - Julian) change in equity statement is not released yet
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
  [EquityType.STOCK]: ['3110', '3120', '3130', '3140', '3150', '3160', '3170', '3100'],
  [EquityType.CAPITAL_SURPLUS]: [
    '3210',
    '3211',
    '3212',
    '3213',
    '3220',
    '3225',
    '3230',
    '3235',
    '3240',
    '3250',
    '3251',
    '3252',
    '3260',
    '3265',
    '3270',
    '3271',
    '3272',
    '3273',
    '3280',
    '3200',
  ],
  [EquityType.RETAINED_EARNINGS]: ['3310', '3320', '3350', '3351', '3352', '3353', '3220'],
  [EquityType.OTHER_EQUITY]: [
    '3410',
    '3411',
    '341A',
    '3412',
    '341B',
    '3413',
    '341C',
    '3420',
    '3421',
    '3422',
    '3423',
    '3424',
    '342A',
    '342B',
    '342C',
    '342D',
    '342E',
    '3440',
    '3441',
    '3442',
    '3443',
    '3445',
    '3446',
    '3447',
    '3448',
    '3450',
    '3451',
    '345A',
    '345B',
    '345C',
    '345D',
    '345E',
    '345F',
    '345G',
    '345H',
    '3452',
    '345I',
    '345J',
    '345K',
    '345L',
    '345M',
    '345N',
    '345O',
    '345P',
    '3453',
    '345Q',
    '345R',
    '345S',
    '345T',
    '345U',
    '345V',
    '345W',
    '345X',
    '3460',
    '3461',
    '3462',
    '3463',
    '3470',
    '3471',
    '3472',
    '3473',
    '3480',
    '3481',
    '3482',
    '3483',
    '3490',
    '3491',
    '3499',
    '3400',
    '3500',
    '35XX',
    '355X',
    '3XXX',
  ],
};

export const CURRENT_ASSET_CODE = [
  '1100',
  '1110',
  '1120',
  '1136',
  '1139',
  '1140',
  '1150',
  '1160',
  '1170',
  '1180',
  '1190',
  '1195',
  '1196',
  '1197',
  '1198',
  '1199',
  '1200',
  '1210',
  '1220',
  '130X',
  '1400',
  '1410',
  '1450',
  '1460',
  '1470',
];

export const NON_CURRENT_ASSET_CODE = [
  '1510',
  '1517',
  '1535',
  '1538',
  '1560',
  '1550',
  '1600',
  '1750',
  '1755',
  '1760',
  '1780',
  '1830',
  '1840',
  '1900',
];

export const ASSET_CODE = [...CURRENT_ASSET_CODE, ...NON_CURRENT_ASSET_CODE];
