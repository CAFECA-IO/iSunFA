import { IFinancialReportRequest } from '@/interfaces/report';
import { IVoucher } from '@/interfaces/voucher';

export type IAPIName =
  | 'SIGN_UP'
  | 'SIGN_IN'
  | 'SIGN_OUT'
  | 'EMAIL'
  | 'USER_GET_BY_ID'
  | 'USER_UPDATE'
  | 'COMPANY_LIST'
  | 'COMPANY_ADD'
  | 'COMPANY_ADD_BY_INVITATION_CODE'
  | 'PROFIT_GET_INSIGHT'
  | 'PROFIT_GET_TREND_IN_PERIOD'
  | 'PROFIT_GET_MARGIN_TREND_IN_PERIOD'
  | 'PROJECT_LIST_PROGRESS'
  | 'PROJECT_LIST_PROFIT_COMPARISON'
  | 'INVOCIE_UPLOAD'
  | 'INVOCIE_LIST_UNBOUNDED'
  | 'INVOCIE_GET_BY_ID'
  | 'ASSET_MANAGEMENT_LIST'
  | 'ASSET_MANAGEMENT_ADD'
  | 'ASSET_MANAGEMENT_GET_BY_ID'
  | 'ASSET_MANAGEMENT_UPDATE'
  | 'JOURNAL_GENERATE'
  | 'JOURNAL_GET_PROGRESS_STATUS'
  | 'JOURNAL_GET_PREVIEW_BY_ID'
  | 'JOURNAL_UPDATE'
  | 'JOURNAL_DELETE'
  | 'JOURNAL_LIST_PROGRESS_STATUS'
  | 'JOURNAL_LIST'
  | 'JOURNAL_GET_BY_ID'
  | 'VOUCHER_GENERATE'
  | 'VOUCHER_LIST'
  | 'FINANCIAL_REPORT_LIST_PROGRESS_STATUS'
  | 'FINANCIAL_REPORT_LIST'
  | 'FINANCIAL_REPORT_GENERATE'
  | 'FINANCIAL_REPORT_GET_BY_ID'
  | 'ANALYSIS_REPORT_LIST_PROGRESS_STATUS'
  | 'ANALYSIS_REPORT_LIST'
  | 'ANALYSIS_REPORT_GENERATE'
  | 'ANALYSIS_REPORT_GET_BY_ID';

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
