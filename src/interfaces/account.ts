import { cleanBoolean, cleanNumber, convertDateToTimestamp } from '@/lib/utils/common';

export type AccountProgressStatus = 'success' | 'inProgress' | 'error' | 'notFound';

export type EventType = 'income' | 'payment' | 'transfer';

export function isEventType(data: string): data is EventType {
  return data === 'income' || data === 'payment' || data === 'transfer';
}

export type VoucherType = 'receive' | 'expense' | 'transfer';

export function isVoucherType(data: string): data is VoucherType {
  return data === 'receive' || data === 'expense';
}

export const eventTypeToVoucherType = {
  income: 'receive' as VoucherType,
  payment: 'expense' as VoucherType,
  transfer: 'transfer' as VoucherType,
};

export type PaymentStatusType = 'paid' | 'unpaid' | 'partial';

export function isPaymentStatusType(data: string): data is PaymentStatusType {
  return data === 'paid' || data === 'unpaid' || data === 'partial';
}

export type PaymentPeriodType = 'atOnce' | 'installment';

export function isPaymentPeriodType(data: string): data is PaymentPeriodType {
  return data === 'atOnce' || data === 'installment';
}

export interface AccountResultStatus {
  resultId: string;
  status: AccountProgressStatus;
}

export interface AccountInvoiceData {
  date: {
    start_date: number; // timestamp
    end_date: number; // timestamp
  };
  eventType: EventType;
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

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountInvoiceData(data: any): data is AccountInvoiceData {
  // 檢查date是否存在，且start_date和end_date是否為數字
  const validDate =
    data.date && typeof data.date.start_date === 'number' && typeof data.date.end_date === 'number';

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
    validEventType &&
    validPaymentReason &&
    validDescription &&
    validVenderOrSupplyer &&
    validPayment
  );
}

export interface AccountInvoiceWithPaymentMethod extends AccountInvoiceData {
  payment: AccountInvoiceData['payment'] & {
    paymentMethod: string;
    paymentPeriod: PaymentPeriodType;
    installmentPeriod: number;
    paymentStatus: PaymentStatusType;
    alreadyPaidAmount: number;
  };
}

export function isAccountInvoiceWithPaymentMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): data is AccountInvoiceWithPaymentMethod {
  return (
    typeof data.payment?.paymentMethod === 'string' &&
    isPaymentPeriodType(data.payment?.paymentPeriod) &&
    typeof data.payment?.installmentPeriod === 'number' &&
    isPaymentStatusType(data.payment?.paymentStatus) &&
    typeof data.payment?.alreadyPaidAmount === 'number' &&
    isAccountInvoiceData(data)
  );
}

// Main function to process and convert the invoice data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanInvoiceData(rawData: any): AccountInvoiceData {
  const { date, eventType, paymentReason, description, venderOrSupplyer, payment } = rawData;

  // Construct the new object with the cleaned and converted data
  const cleanedData: AccountInvoiceData = {
    date: {
      start_date: convertDateToTimestamp(date.start_date),
      end_date: convertDateToTimestamp(date.end_date),
    },
    eventType: isEventType(eventType) ? eventType : 'income',
    paymentReason: paymentReason || '',
    description: description || '',
    venderOrSupplyer: venderOrSupplyer || '',
    payment: {
      price: cleanNumber(payment.price),
      hasTax: cleanBoolean(payment?.hasTax),
      taxPercentage: payment.taxPercentage ? parseFloat(payment.taxPercentage) : 5,
      hasFee: cleanBoolean(payment?.hasFee),
      fee: payment.fee ? cleanNumber(payment.fee) : 0,
    },
  };

  if (!isAccountInvoiceData(cleanedData)) {
    throw new Error('Invalid invoice data');
  }
  return cleanedData;
}

export const AccountInvoiceDataObjectVersion = {
  date: {
    start_date: 'use YYYY-MM-DD format',
    end_date: 'use YYYY-MM-DD format',
  },
  eventType: "'income' | 'payment' | 'transfer'",
  paymentReason: 'string',
  description: 'string',
  venderOrSupplyer: 'string',
  payment: {
    price: 'number',
    hasTax: 'boolean',
    taxPercentage: 'number',
    hasFee: 'boolean',
    fee: 'number',
  },
};

export interface AccountLineItem {
  lineItemIndex: string;
  accounting: string;
  particular: string;
  debit: boolean;
  amount: number;
}

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountLineItem(data: any): data is AccountLineItem {
  return (
    data &&
    typeof data.lineItemIndex === 'string' &&
    typeof data.accounting === 'string' &&
    typeof data.particular === 'string' &&
    typeof data.debit === 'boolean' &&
    typeof data.amount === 'number'
  );
}

export function isAccountLineItems(data: unknown): data is AccountLineItem[] {
  if (!Array.isArray(data)) {
    return false;
  }
  return data.every(isAccountLineItem);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanAccountLineItem(rawData: any): AccountLineItem {
  if (Array.isArray(rawData)) {
    throw new Error('Invalid line item data, is array');
  }
  const { accounting, particular, debit, amount } = rawData;

  const today = new Date();
  const cleanedData: AccountLineItem = {
    // Info: Murky this id is for demo, need to refactor
    lineItemIndex:
      today.getFullYear().toString() +
      today.getMonth.toString() +
      today.getDate().toString() +
      Math.floor(Math.random() * 1000).toString(),
    accounting: accounting || '',
    particular: particular || '',
    debit: cleanBoolean(debit),
    amount: cleanNumber(amount),
  };

  if (!isAccountLineItem(cleanedData)) {
    throw new Error('Invalid line item data, not clean');
  }
  return cleanedData;
}
export const AccountLineItemObjectVersion = [
  {
    lineItemIndex: 'string',
    accounting: 'string',
    particular: 'string',
    debit: 'boolean',
    amount: 'number',
  },
];
export interface AccountVoucher {
  voucherIndex: string;
  metadatas: AccountVoucherMetaData[];
  lineItems: AccountLineItem[];
}

export function cleanAccountLineItems(rawData: unknown): AccountLineItem[] {
  if (!Array.isArray(rawData)) {
    throw new Error('Invalid line item data');
  }
  return rawData.map((lineItem) => cleanAccountLineItem(lineItem));
}

export interface AccountVoucherMetaData {
  date: number;
  voucherType: VoucherType;
  venderOrSupplyer: string;
  description: string;
  totalPrice: number;
  taxPercentage: number;
  fee: number;
  paymentMethod: string;
  paymentPeriod: PaymentPeriodType;
  installmentPeriod: number;
  paymentStatus: PaymentStatusType;
  alreadyPaidAmount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountVoucherMetaData(data: any): data is AccountVoucherMetaData {
  return (
    data &&
    typeof data.date === 'number' &&
    isVoucherType(data.voucherType) &&
    typeof data.venderOrSupplyer === 'string' &&
    typeof data.description === 'string' &&
    typeof data.totalPrice === 'number' &&
    typeof data.taxPercentage === 'number' &&
    typeof data.fee === 'number' &&
    typeof data.paymentMethod === 'string' &&
    isPaymentPeriodType(data.paymentPeriod) &&
    typeof data.installmentPeriod === 'number' &&
    isPaymentStatusType(data.paymentStatus) &&
    typeof data.alreadyPaidAmount === 'number'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanedVoucherMetaData(rawData: any): AccountVoucherMetaData {
  const {
    date,
    voucherType,
    venderOrSupplyer,
    description,
    totalPrice,
    taxPercentage,
    fee,
    paymentMethod,
    paymentPeriod,
    installmentPeriod,
    paymentStatus,
    alreadyPaidAmount,
  } = rawData;

  const cleanedData: AccountVoucherMetaData = {
    date: convertDateToTimestamp(date),
    voucherType: isVoucherType(voucherType) ? voucherType : 'receive',
    venderOrSupplyer: venderOrSupplyer || '',
    description: description || '',
    totalPrice: cleanNumber(totalPrice),
    taxPercentage: cleanNumber(taxPercentage),
    fee: cleanNumber(fee),
    paymentMethod: paymentMethod || '',
    paymentPeriod: isPaymentPeriodType(paymentPeriod) ? paymentPeriod : 'atOnce',
    installmentPeriod: cleanNumber(installmentPeriod),
    paymentStatus: isPaymentStatusType(paymentStatus) ? paymentStatus : 'unpaid',
    alreadyPaidAmount: cleanNumber(alreadyPaidAmount),
  };

  if (!isAccountVoucherMetaData(cleanedData)) {
    throw new Error('Invalid voucher metadata data');
  }
  return cleanedData;
}

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountVoucher(data: any): data is AccountVoucher {
  const { voucherIndex, lineItems, metadatas } = data;
  return (
    typeof voucherIndex === 'string' &&
    Array.isArray(metadatas) &&
    metadatas.every(isAccountVoucherMetaData) &&
    Array.isArray(lineItems) &&
    lineItems.every(isAccountLineItem)
  );
}
export const AccountVoucherObjectVersion = {
  voucherIndex: 'string',
  metadatas: [
    {
      date: 'number (timestamp)',
      voucherType: "VoucherType ('receive' | 'expense' | 'transfer')",
      venderOrSupplyer: 'string',
      description: 'string',
      totalPrice: 'number',
      taxPercentage: 'number',
      fee: 'number',
      paymentMethod: 'string',
      paymentPeriod: "PaymentPeriodType ('atOnce' | 'installment')",
      installmentPeriod: 'number',
      paymentStatus: "PaymentStatusType ('paid' | 'unpaid' | 'partial')",
      alreadyPaidAmount: 'number',
    },
  ],
  lineItems: [
    {
      lineItemIndex: 'string',
      accounting: 'string',
      particular: 'string',
      debit: 'boolean',
      amount: 'number',
    },
  ],
};
// info Murky (20240416): Convert the raw data to the AccountVoucher object
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export function cleanVoucherData(rawData: any): AccountVoucher {
  const { lineItems, metadatas } = rawData;

  if (!Array.isArray(lineItems)) {
    throw new Error('Invalid line item data');
  }

  if (!Array.isArray(metadatas)) {
    throw new Error('Invalid metadata data');
  }

  const today = new Date();
  const voucherIndex =
    today.getFullYear().toString() +
    today.getMonth.toString() +
    today.getDate().toString() +
    Math.floor(Math.random() * 1000).toString();
  const cleandLineItems = lineItems.map((lineItem) => cleanAccountLineItem(lineItem));

  const cleanedVoucherMetaDatas: AccountVoucherMetaData[] = metadatas.map((voucherMetaData) =>
    cleanedVoucherMetaData(voucherMetaData)
  );
  return {
    voucherIndex,
    metadatas: cleanedVoucherMetaDatas,
    lineItems: cleandLineItems,
  };
}
