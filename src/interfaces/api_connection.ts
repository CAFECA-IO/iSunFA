import { IFinancialReportRequest } from '@/interfaces/report';
import { IVoucher } from '@/interfaces/voucher';

export type IAPIName =
  | 'CREATE_CHALLENGE'
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
  | 'OCR_DELETE'
  | 'OCR_RESULT_GET_BY_ID'
  | 'OCR_LIST'
  | 'INVOICE_CREATE'
  | 'INVOICE_UPDATE'
  | 'AI_ASK_STATUS'
  | 'AI_ASK_RESULT'
  | 'VOUCHER_CREATE'
  | 'VOUCHER_UPDATE'
  | 'JOURNAL_GET_BY_ID'
  | 'JOURNAL_LIST'
  // | 'JOURNAL_UPDATE'
  | 'JOURNAL_DELETE'
  | 'REPORT_LIST_PENDING'
  | 'REPORT_LIST_GENERATED'
  | 'REPORT_FINANCIAL_GET_BY_ID'
  | 'REPORT_ANALYSIS_GET_BY_ID'
  | 'REPORT_GENERATE_FINANCIAL'
  | 'REPORT_GENERATE_ANALYSIS'
  | 'SESSION_GET'
  | 'ACCOUNT_LIST'
  | 'FILE_UPLOAD'
  | 'FILE_DELETE'
  | 'FILE_LIST_UPLOADED'
  | 'COMPANY_GET_BY_ID'
  | 'COMPANY_DELETE'
  | 'COMPANY_UPDATE'
  | 'ROLE_GET_BY_ID'
  | 'ROLE_DELETE'
  | 'ROLE_UPDATE'
  | 'KYC_UPLOAD'
  | 'ACCOUNT_GET_BY_ID'
  | 'CREATE_NEW_SUB_ACCOUNT'
  | 'UPDATE_ACCOUNT_INFO_BY_ID'
  | 'DELETE_ACCOUNT_BY_ID';

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
  trigger: (
    input?: IAPIInput,
    signal?: AbortSignal
  ) => Promise<{
    success: boolean;
    data: Data | null;
    code: string;
    error: Error | null;
  }>;
  isLoading: boolean | undefined;
  data: Data | undefined;
  code: string | undefined;
  error: Error | null;
};
