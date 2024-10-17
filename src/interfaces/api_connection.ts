import { IFinancialReportRequest } from '@/interfaces/report';
import { IVoucher } from '@/interfaces/voucher';
import { ICompanyKYCForm } from './company_kyc';

export type IAPIName =
  | 'AGREE_TO_TERMS'
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
  | 'INVOICE_GET_BY_ID'
  | 'AI_ASK_STATUS'
  | 'AI_ASK_RESULT'
  | 'VOUCHER_CREATE'
  | 'VOUCHER_UPDATE'
  | 'JOURNAL_GET_BY_ID'
  | 'JOURNAL_LIST'
  | 'JOURNAL_DELETE'
  | 'REPORT_LIST'
  | 'REPORT_GET_BY_ID'
  | 'REPORT_GET_V2'
  | 'REPORT_GENERATE'
  | 'STATUS_INFO_GET'
  | 'ACCOUNT_LIST'
  | 'FILE_UPLOAD'
  | 'PUBLIC_FILE_UPLOAD'
  | 'FILE_DELETE'
  | 'FILE_GET'
  | 'COMPANY_GET_BY_ID'
  | 'COMPANY_DELETE'
  | 'COMPANY_UPDATE'
  | 'ROLE_LIST'
  | 'CREATE_ROLE'
  | 'ROLE_SELECT'
  | 'ROLE_GET_BY_ID'
  | 'ROLE_DELETE'
  | 'ROLE_UPDATE'
  | 'NEWS_LIST'
  | 'CREATE_NEWS'
  | 'KYC_UPLOAD'
  | 'ACCOUNT_GET_BY_ID'
  | 'CREATE_NEW_SUB_ACCOUNT'
  | 'UPDATE_ACCOUNT_INFO_BY_ID'
  | 'DELETE_ACCOUNT_BY_ID'
  | 'TRANSFER_OWNER'
  | 'PROJECT_LIST'
  | 'CREATE_PROJECT'
  | 'GET_PROJECT_BY_ID'
  | 'UPDATE_PROJECT_BY_ID'
  | 'PUBLIC_KEY_GET'
  | 'CERTIFICATE_LIST'
  | 'PUSHER'
  | 'ENCRYPT'
  | 'DECRYPT'
  | 'VOUCHER_GET_BY_ID_V2';

export type IHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type IAPIInput = {
  header?: { [key: string]: string };
  body?:
    | { [key: string]: unknown }
    | FormData
    | IVoucher
    | IFinancialReportRequest
    | ICompanyKYCForm
    | string;
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
