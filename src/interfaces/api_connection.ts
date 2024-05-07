export type IAPIName =
  | 'SIGN_UP'
  | 'SIGN_IN'
  | 'SIGN_OUT'
  | 'EMAIL'
  | 'LIST_AUDIT_REPORTS'
  | 'LIST_ALL_PROJECTS'
  | 'GET_PROJECTS_STATUS'
  | 'GET_PROJECTS_VALUE'
  | 'GET_PERIOD_PROFIT'
  | 'GET_PROJECT_VOUCHERS'
  | 'GET_INVOCIE'
  | 'UPLOAD_INVOCIE'
  | 'GET_AUDIT_REPORTS'
  | 'GENERATE_FINANCIAL_REPORT'
  | 'GENERATE_ANALYSIS_REPORT'
  | 'OCR_UPLOAD_INVOICE_PICTURE'
  | 'OCR_CHECK_CURRENT_ANALYZING_PROGRESS_STATUS'
  | 'OCR_GET_ANALYZED_RESULT'
  | 'LIST_ALL_VOUCHERS'
  | 'VOUCHER_GET_BY_ID'
  | 'VOUCHER_UPLOAD_INVOICES'
  | 'VOUCHER_GET_PREVIEW_CREATING_PROCESS_STATE_BY_RESULT_ID'
  | 'VOUCHER_GET_PREVIEW_VOUCHER_BY_RESULT_ID'
  | 'VOUCHER_GENERATE'
  | 'UPLOAD_JOURNAL_DOCUMENT_IMAGE'
  | 'GET_JOURNAL_PROCESSING_STATUS'
  | 'GET_PROCESSED_JOURNAL_DATA';

export type IHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type IAPIInput = {
  header?: { [key: string]: string };
  body?: { [key: string]: unknown };
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
  trigger: () => void;
  isLoading: boolean | undefined;
  data: Data | undefined;
  error: Error | null;
};
