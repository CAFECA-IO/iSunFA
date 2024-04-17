export interface AccountResultStatus {
  resultId: string;
  status: string;
}

export type AccountProgressStatus = 'success' | 'inProgress' | 'error';

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

// Info Murky (20240416): Check if data 本來進來就可能是any形式的data，然後我們chec他他有沒有以下屬性
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
