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
  | 'COMPANY_SELECT'
  | 'PROFIT_GET_INSIGHT'
  | 'LABOR_COST_CHART'
  | 'INCOME_EXPENSE_GET_TREND_IN_PERIOD'
  | 'PROJECT_LIST_PROGRESS'
  | 'PROJECT_LIST_PROFIT_COMPARISON'
  | 'ASSET_MANAGEMENT_LIST'
  | 'ASSET_MANAGEMENT_ADD'
  | 'ASSET_MANAGEMENT_GET_BY_ID'
  | 'ASSET_MANAGEMENT_UPDATE'
  | 'OCR_UPLOAD'
  | 'OCR_RESULT_GET_BY_ID'
  | 'OCR_LIST'
  | 'INVOICE_CREATE'
  | 'AI_ASK_STATUS'
  | 'AI_ASK_RESULT'
  | 'VOUCHER_CREATE'
  | 'JOURNAL_GET_BY_ID'
  | 'JOURNAL_LIST'
  | 'JOURNAL_UPDATE'
  | 'JOURNAL_DELETE'
  | 'REPORT_LIST_PENDING'
  | 'REPORT_LIST_GENERATED'
  | 'REPORT_FINANCIAL_GET_BY_ID'
  | 'REPORT_ANALYSIS_GET_BY_ID'
  | 'REPORT_GENERATE_FINANCIAL'
  | 'REPORT_GENERATE_ANALYSIS'
  | 'SESSION_GET'
  | 'ACCOUNT_LIST';

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
