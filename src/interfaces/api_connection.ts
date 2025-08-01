import { IFinancialReportRequest } from '@/interfaces/report';
import { IVoucher } from '@/interfaces/voucher';
import { IAccountBookKYCForm } from '@/interfaces/account_book_kyc';
import { ICertificate } from '@/interfaces/certificate';

export type IAPIName =
  | 'AGREE_TO_TERMS'
  | 'SIGN_IN'
  | 'SIGN_OUT'
  | 'EMAIL'
  | 'USER_LIST'
  | 'USER_GET_BY_ID'
  | 'USER_UPDATE'
  | 'USER_PENDING_TASK_GET'
  | 'USER_SETTING_GET'
  | 'USER_SETTING_UPDATE'
  | 'USER_ACTION_LOG_LIST'
  | 'ACCOUNT_BOOK_PENDING_TASK_GET'
  | 'ACCOUNT_BOOK_SEARCH_BY_NAME_OR_TAX_ID'
  | 'COUNTERPARTY_LIST'
  | 'COUNTERPARTY_ADD'
  | 'COUNTERPARTY_GET_BY_ID'
  | 'COUNTERPARTY_UPDATE'
  | 'COUNTERPARTY_DELETE'
  | 'IMAGE_GET_BY_ID'
  | 'ASK_AI_STATUS'
  | 'JOURNAL_LIST'
  | 'REPORT_LIST'
  | 'REPORT_GET_BY_ID'
  | 'REPORT_GET_V2'
  | 'REPORT_GENERATE'
  | 'ROOM_ADD'
  | 'ROOM_GET_BY_ID'
  | 'ROOM_DELETE'
  | 'ROOM_GET_PUBLIC_KEY_BY_ID'
  | 'STATUS_INFO_GET'
  | 'ACCOUNT_LIST'
  | 'FILE_UPLOAD'
  | 'FILE_DELETE'
  | 'FILE_DELETE_V2'
  | 'FILE_GET'
  | 'FILE_PUT_V2'
  | 'DELETE_ACCOUNT_BOOK'
  | 'USER_ROLE_LIST'
  | 'USER_CREATE_ROLE'
  | 'USER_SELECT_ROLE'
  | 'CREATE_ACCOUNT_BOOK'
  | 'ROLE_LIST'
  | 'NEWS_LIST'
  | 'CREATE_NEWS'
  | 'NEWS_GET_BY_ID'
  | 'KYC_UPLOAD'
  | 'ACCOUNT_GET_BY_ID'
  | 'CREATE_NEW_SUB_ACCOUNT'
  | 'UPDATE_ACCOUNT_INFO_BY_ID'
  | 'DELETE_ACCOUNT_BY_ID'
  | 'TODO_LIST'
  | 'CREATE_TODO'
  | 'TODO_GET_BY_ID'
  | 'UPDATE_TODO'
  | 'DELETE_TODO'
  | 'PUBLIC_KEY_GET'
  | 'CERTIFICATE_LIST'
  | 'ASSET_GET_BY_ID_V2'
  | 'VOUCHER_POST_V2'
  | 'VOUCHER_GET_BY_ID_V2'
  | 'VOUCHER_PUT_V2'
  | 'VOUCHER_DELETE_V2'
  | 'VOUCHER_RESTORE_V2'
  | 'VOUCHER_LIST_V2'
  | 'VOUCHER_LIST_GET_BY_ACCOUNT_V2'
  | 'ASK_AI_V2'
  | 'ASK_AI_RESULT_V2'
  | 'REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2'
  | 'ASSET_LIST_V2'
  | 'LIST_INVOICE_RC2'
  | 'LIST_INVOICE_RC2_INPUT'
  | 'CREATE_INVOICE_RC2_INPUT'
  | 'GET_INVOICE_RC2_INPUT'
  | 'UPDATE_INVOICE_RC2_INPUT'
  | 'DELETE_INVOICE_RC2_INPUT'
  | 'LIST_INVOICE_RC2_OUTPUT'
  | 'CREATE_INVOICE_RC2_OUTPUT'
  | 'GET_INVOICE_RC2_OUTPUT'
  | 'UPDATE_INVOICE_RC2_OUTPUT'
  | 'DELETE_INVOICE_RC2_OUTPUT'
  | 'CERTIFICATE_LIST_V2' // Deprecated: (20250424 - Tzuhan) remove in the future
  | 'CERTIFICATE_GET_V2'
  | 'CERTIFICATE_POST_V2'
  | 'CERTIFICATE_PUT_V2'
  | 'INVOICE_POST_V2'
  | 'INVOICE_PUT_V2'
  | 'CERTIFICATE_DELETE_V2'
  | 'CERTIFICATE_DELETE_MULTIPLE_V2'
  | 'ACCOUNTING_SETTING_GET'
  | 'ACCOUNTING_SETTING_UPDATE'
  | 'CREATE_ASSET_V2'
  | 'DELETE_ASSET_V2'
  | 'UPDATE_ASSET_V2'
  | 'TRIAL_BALANCE_LIST'
  | 'ASSET_LIST_EXPORT'
  | 'FILE_EXPORT'
  | 'LEDGER_LIST'
  | 'PUSHER_AUTH'
  | 'TRIAL_BALANCE_EXPORT'
  | 'CREATE_ASSET_BULK'
  | 'LEDGER_EXPORT'
  | 'LIST_LOGIN_DEVICE'
  | 'REMOVE_LOGIN_DEVICE'
  | 'CREATE_TEAM'
  | 'LIST_TEAM'
  | 'GET_TEAM_BY_ID'
  | 'LIST_ACCOUNT_BOOK_BY_TEAM_ID'
  | 'INVITE_MEMBER_TO_TEAM'
  | 'LEAVE_TEAM'
  | 'REQUEST_TRANSFER_ACCOUNT_BOOK'
  | 'CANCEL_TRANSFER_ACCOUNT_BOOK'
  | 'ACCEPT_TRANSFER_ACCOUNT_BOOK'
  | 'DECLINE_TRANSFER_ACCOUNT_BOOK'
  | 'LIST_TEAM_SUBSCRIPTION'
  | 'GET_SUBSCRIPTION_BY_TEAM_ID'
  | 'UPDATE_SUBSCRIPTION'
  | 'LIST_TEAM_INVOICE'
  | 'GET_SUBSCRIPTION_INVOICE_BY_TEAM_ID'
  | 'GET_CREDIT_CARD_INFO'
  | 'LIST_PAYMENT_PLAN'
  | 'LIST_ACCOUNT_BOOK_BY_USER_ID'
  | 'LIST_SIMPLE_ACCOUNT_BOOK_BY_USER_ID'
  | 'CONNECT_ACCOUNT_BOOK_BY_ID'
  | 'UPDATE_TEAM_BY_ID'
  | 'UPDATE_MEMBER'
  | 'DELETE_MEMBER'
  | 'PUT_TEAM_ICON'
  | 'LIST_MEMBER_BY_TEAM_ID'
  | 'GET_ACCOUNT_BOOK_INFO_BY_ID'
  | 'UPDATE_ACCOUNT_BOOK'
  | 'USER_PAYMENT_METHOD_LIST'
  | 'USER_PAYMENT_METHOD_CHARGE'
  | 'UPDATE_ACCOUNT_BOOK_INFO'
  | 'DISCONNECT_ACCOUNT_BOOK'
  | 'ACCOUNT_BOOK_PUT_ICON'
  | 'SEND_VERIFICATION_EMAIL'
  | 'VERIFY_CODE'
  | 'LIST_NOTIFICATION'
  | 'GET_NOTIFICATION_BY_ID'
  | 'READ_NOTIFICATION'
  | 'GET_ACCOUNT_BOOK_BY_ID'
  | 'ACCEPT_TEAM_INVITATION'
  | 'DECLINE_TEAM_INVITATION'
  | 'LIST_BAIFA_ACCOUNT_BOOK'
  | 'LIST_BAIFA_VOUCHER'
  | 'GET_VACANCY_BY_ID';

export type IHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type IAPIInput = {
  header?: { [key: string]: string };
  body?:
    | { [key: string]: unknown }
    | FormData
    | IVoucher
    | IFinancialReportRequest
    | IAccountBookKYCForm
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
