import { FinancialReportTypesKey } from '@/interfaces/report_type';

export const ISUNFA_API = {
  SIGN_UP: '/api/v1/sign_up',
  SIGN_IN: '/api/v1/sign_in',
  SIGN_OUT: '/api/v1/sign_out',
};

export const ISUNFA_ROUTE = {
  LANDING_PAGE: '/',
  ABOUT: '/#about',
  FEATURES: '/#features',
  REPORTS: '/reports',
  CONTACT_US: '/#contact-us',
  TERMS_OF_SERVICE: '/terms-of-service',
  PRIVACY_POLICY: '/privacy-policy',
  LOGIN: '/users/login',
  BETA_LOGIN: '/beta/login', // Info: (20241001 - Liz) Beta login
  EXAMPLE: '/beta/example', // Info: (20241001 - Liz) Beta example page for testing login
  SELECT_ROLE: '/beta/select_role',
  JOB_RECORD: '/beta/job_record',

  DASHBOARD: '/users/dashboard',
  KYC: '/users/kyc',
  SALARY: '/users/salary',
  SALARY_BOOKKEEPING: '/users/salary/bookkeeping',
  ACCOUNTING: '/users/accounting',
  SELECT_COMPANY: '/users/select_company',
  JOURNAL_LIST: '/users/accounting/journal_list',
  USERS_FINANCIAL_REPORTS: '/users/reports/financials',
  USERS_ANALYSES_REPORTS: '/users/reports/analyses',
  USERS_FINANCIAL_REPORTS_VIEW: '/users/reports/financials/view',
  USERS_ANALYSES_REPORTS_VIEW: '/users/reports/analyses/view',
  USERS_MY_REPORTS: '/users/reports/my_reports',
  PROJECT_LIST: '/users/project',
  COMPANY_INFO: '/users/setting/company_info',
  ACCOUNTING_TITLE: '/users/setting/accounting_title',
  USERS_FINANCIAL_REPORTS_BALANCE_SHEET: `/users/reports/financials?report_type=${FinancialReportTypesKey.balance_sheet}`,
  USERS_FINANCIAL_REPORTS_INCOME_STATEMENT: `/users/reports/financials?report_type=${FinancialReportTypesKey.comprehensive_income_statement}`,
  USERS_FINANCIAL_REPORTS_CASH_FLOW: `/users/reports/financials?report_type=${FinancialReportTypesKey.cash_flow_statement}`,
  UPLOAD: `mobile_upload`,
};

export const EXTERNAL_API = {
  CFV_PDF: 'https://cfv.cafeca.io/api/pdf',
};

// Info: (20240805 - Jacky) Test url for OEN
const OEN_BASE_URL = 'https://payment-api.testing.oen.tw';
export const OEN_BASE_ENDPOINT = {
  CHECKOUT_TOKEN: `${OEN_BASE_URL}/checkout-token`,
  TOKEN_TRANSACTION: `${OEN_BASE_URL}/token/transactions`,
  GET_TRANSACTION: (orderId: string) => `${OEN_BASE_URL}/transactions/${orderId}`,
};

export const OEN_MERCHANT_ENDPOINT = {
  GET_TOKEN: (merchantId: string, id: string) =>
    `https://${merchantId}.testing.oen.tw/checkout/subscription/create/${id}`,
};
