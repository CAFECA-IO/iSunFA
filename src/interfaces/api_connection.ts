import { IFinancialReportRequest } from '@/interfaces/report';
import { IVoucher } from '@/interfaces/voucher';
import { ICompanyKYCForm } from './company_kyc';
import { ICertificate } from './certificate';

export type IAPIName =
  | 'AGREE_TO_TERMS'
  | 'CREATE_CHALLENGE'
  | 'SIGN_UP'
  | 'SIGN_IN'
  | 'SIGN_OUT'
  | 'EMAIL'
  | 'USER_GET_BY_ID'
  | 'USER_UPDATE'
  | 'USER_PENDING_TASK_GET'
  | 'USER_SETTING_GET'
  | 'USER_SETTING_UPDATE'
  | 'USER_ACTION_LOG_LIST'
  | 'COMPANY_PENDING_TASK_GET'
  | 'COMPANY_LIST'
  | 'COMPANY_ADD'
  | 'COMPANY_ADD_BY_INVITATION_CODE'
  | 'COMPANY_SELECT'
  | 'COMPANY_SETTING_GET'
  | 'COMPANY_SETTING_UPDATE'
  | 'COUNTERPARTY_LIST'
  | 'COUNTERPARTY_ADD'
  | 'COUNTERPARTY_GET_BY_ID'
  | 'COUNTERPARTY_UPDATE'
  | 'COUNTERPARTY_DELETE'
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
  | 'ASK_AI_STATUS'
  | 'ASK_AI_RESULT'
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
  | 'USER_ROLE_LIST'
  | 'CREATE_ROLE'
  | 'ROLE_SELECT'
  | 'ROLE_GET_BY_ID'
  | 'ROLE_DELETE'
  | 'ROLE_UPDATE'
  | 'NEWS_LIST'
  | 'CREATE_NEWS'
  | 'NEWS_GET_BY_ID'
  | 'KYC_UPLOAD'
  | 'ACCOUNT_GET_BY_ID'
  | 'CREATE_NEW_SUB_ACCOUNT'
  | 'UPDATE_ACCOUNT_INFO_BY_ID'
  | 'DELETE_ACCOUNT_BY_ID'
  | 'TRANSFER_OWNER'
  | 'TODO_LIST'
  | 'CREATE_TODO'
  | 'PROJECT_LIST'
  | 'CREATE_PROJECT'
  | 'GET_PROJECT_BY_ID'
  | 'UPDATE_PROJECT_BY_ID'
  | 'PUBLIC_KEY_GET'
  | 'CERTIFICATE_LIST'
  | 'PUSHER'
  | 'ENCRYPT'
  | 'DECRYPT'
  | 'VOUCHER_GET_BY_ID_V2'
  | 'ASSET_GET_BY_ID_V2'
  | 'VOUCHER_LIST_V2'
  | 'ASK_AI_V2'
  | 'ASK_AI_RESULT_V2'
  | 'VOUCHER_LIST_V2'
  | 'GET_ACCOUNTING_SETTING'
  | 'UPDATE_ACCOUNTING_SETTING'
  | 'ASSET_LIST_V2'
  | 'VOUCHER_LIST_V2'
  | 'CERTIFICATE_LIST_V2'
  | 'CERTIFICATE_GET_V2'
  | 'CERTIFICATE_POST_V2'
  | 'CERTIFICATE_PUT_V2'
  | 'CERTIFICATE_DELETE_V2'
  | 'ACCOUNTING_SETTING_GET'
  | 'ACCOUNTING_SETTING_UPDATE';

export type IHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type IAPIInput = {
  header?: { [key: string]: string };
  body?:
    | { [key: string]: unknown }
    | FormData
    | IVoucher
    | IFinancialReportRequest
    | ICompanyKYCForm
    | ICertificate
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
