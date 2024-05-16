import { IFinancialReportRequest } from '@/interfaces/report';
import { IVoucher } from '@/interfaces/voucher';

export type IAPIName =
  | 'SIGN_UP'
  | 'SIGN_IN'
  | 'SIGN_OUT'
  | 'EMAIL'
  | 'USER_GET_BY_ID'
  | 'INVOCIE_GET_BY_ID'
  | 'INVOCIE_UPLOAD'
  | 'FINANCIAL_REPORT_GENERATE'
  | 'FINANCIAL_REPORT_GET_PROGRESS_STATUS'
  | 'FINANCIAL_REPORT_GET_BY_ID'
  | 'ANALYSIS_REPORT_GENERATE'
  | 'ANALYSIS_REPORT_GET_PROGRESS_STATUS'
  | 'ANALYSIS_REPORT_GET_BY_ID'
  | 'VOUCHER_GENERATE'
  | 'VOUCHER_GET_PROGRESS_STATUS'
  | 'VOUCHER_PREVIEW_GET_BY_ID'
  | 'VOUCHER_LIST'
  | 'JOURNAL_GENERATE'
  | 'JOURNAL_GET_PROGRESS_STATUS'
  | 'JOURNAL_LIST'
  | 'JOURNAL_GET_BY_ID'
  | 'GET_JOURNAL_PROCESSING_STATUS';

export type IHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type IAPIInput = {
  header?: { [key: string]: string };
  body?: { [key: string]: unknown } | FormData | IVoucher | IFinancialReportRequest;
  params?: { [key: string]: unknown };
  query?: { [key: string]: unknown };
};

export type IAPIOutput = { [key: string]: unknown };

export type IAPIConfig = {
  name: IAPIName;
  method: IHttpMethod;
  path: string;
  input: IAPIInput;
  output: IAPIOutput;
  useWorker: boolean;
};

export type IAPIResponse<Data> = {
  success: boolean | undefined;
  trigger: (input?: IAPIInput, signal?: AbortSignal) => void;
  isLoading: boolean | undefined;
  data: Data | undefined;
  code: string | undefined;
  error: Error | null;
};
