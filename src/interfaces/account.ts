export type AccountProgressStatus = 'success' | 'inProgress' | 'error' | 'notFound';

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
  debit: string;
  amount: string;
}

export interface AccountVoucher {
  date: string;
  vouchIndex: string;
  type: string;
  from_or_to: string;
  description: string;
  lineItem: AccountLineItem[];
}

export const AccountVoucherObjectVersion = {
  date: '日期YYYY-MM-DD',
  vouchIndex: '憑證編號，用今天日期+流水號3碼，例如20220416001',
  type: '收入 or 支出',
  from_or_to: '收入的來源公司 or 支出收入的來源公司',
  description: '傳票是為什麼產生的',
  lineItem: [
    {
      lineItemIndex: 'lineItem 是傳票中的其中一行，用今天日期+流水號3碼，例如20220416001',
      account: '這個lineItem是屬於哪個會計科目',
      description: 'lineItem是做了什麼，ex 買蘋果',
      debit: 'true or false, true代表借方，false代表貸方，需要用雙括號包起來, 因為是string type',
      amount: '金額，請把中間的分隔用逗號都去掉',
    },
  ],
};

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
    (typeof data.lineItemIndex === 'string' || !data.lineItemIndex) &&
    (typeof data.account === 'string' || !data.account) &&
    (typeof data.description === 'string' || !data.description) &&
    (typeof data.debit === 'string' || !data.debit) &&
    (typeof data.amount === 'string' || !data.amount)
  );
}

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAccountVoucher(data: any): data is AccountVoucher {
  return (
    data &&
    (typeof data.date === 'string' || !data.date) &&
    (typeof data.vouchIndex === 'string' || !data.vouchIndex) &&
    (typeof data.type === 'string' || !data.type) &&
    (typeof data.from_or_to === 'string' || !data.from_or_to) &&
    (typeof data.description === 'string' || !data.description) &&
    Array.isArray(data.lineItem) &&
    data.lineItem.every(isAccountLineItem)
  );
}
