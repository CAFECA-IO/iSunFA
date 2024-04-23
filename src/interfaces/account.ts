export type AccountProgressStatus = 'success' | 'inProgress' | 'error';

export interface AccountResultStatus {
  resultId: string;
  status: AccountProgressStatus;
}

export interface AccountInvoiceData {
  date?: string;
  eventType?: string;
  incomeReason?: string;
  client?: string;
  description?: string;
  price?: string;
  tax?: string;
  taxPercentange?: string;
  fee?: string;
}

export const AccountInvoiceDataObjectVersion = {
  date: '發票日期YYYY-MM-DD',
  eventType: 'imcome | expense',
  incomeReason: '收入 or 支出原因',
  client: '供應商的名稱',
  description: '品項簡介',
  price: '品項價格',
  tax: '是否含稅',
  taxPercentange: '稅率',
  fee: '手續費',
};

export interface AccountLineItem {
  lineItemIndex: string;
  account: string;
  description: string;
  debit: boolean;
  amount: number;
}

export interface AccountVoucher {
  date: string;
  vouchIndex: string;
  type: string;
  from_or_to: string;
  description: string;
  lineItem: AccountLineItem[];
}

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// export function isAccountInvoiceData(data: any): data is AccountInvoiceData {
//   return (
//     data &&
//     typeof data.date === 'string' &&
//     typeof data.eventType === 'string' &&
//     typeof data.incomeReason === 'string' &&
//     typeof data.client === 'string' &&
//     typeof data.description === 'string' &&
//     typeof data.price === 'string' &&
//     typeof data.tax === 'string' &&
//     (typeof data.taxPercentange === 'string' || null) &&
//     (typeof data.fee === 'string')
//   );
// }

// Depreciated Murky (20240522) loose version of isAccountInvoiceData
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountInvoiceData(data: any): data is AccountInvoiceData {
  return (
    data &&
    (typeof data.date === 'string' || !data.date) &&
    (typeof data.eventType === 'string' || !data.eventType) &&
    (typeof data.incomeReason === 'string' || !data.incomeReason) &&
    (typeof data.client === 'string' || !data.client) &&
    (typeof data.description === 'string' || !data.description) &&
    (typeof data.price === 'string' || !data.price) &&
    (typeof data.tax === 'string' || !data.tax) &&
    (typeof data.taxPercentange === 'string' || !data.taxPercentange) &&
    (typeof data.fee === 'string' || !data.fee)
  );
}

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountLineItem(data: any): data is AccountLineItem {
  return (
    data &&
    typeof data.lineItemIndex === 'string' &&
    typeof data.account === 'string' &&
    typeof data.description === 'string' &&
    typeof data.debit === 'boolean' &&
    typeof data.amount === 'number'
  );
}

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountVoucher(data: any): data is AccountVoucher {
  return (
    data &&
    typeof data.date === 'string' &&
    typeof data.vouchIndex === 'string' &&
    typeof data.type === 'string' &&
    typeof data.from_or_to === 'string' &&
    typeof data.description === 'string' &&
    Array.isArray(data.lineItem) &&
    data.lineItem.every(isAccountLineItem)
  );
}
