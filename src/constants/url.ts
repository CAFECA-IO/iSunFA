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
  // Info: (20241015 - Liz) Beta routes
  CREATE_ROLE: '/users/create_role',
  SELECT_ROLE: '/users/select_role',
  DASHBOARD: '/users/dashboard',
  MY_COMPANY_LIST_PAGE: '/users/my_company_list_page',
  TODO_LIST_PAGE: '/users/todo_list_page',
  LATEST_NEWS_PAGE: '/users/news_page',
  FINANCIAL_NEWS_PAGE: '/users/news_page/financial_news_page',
  SYSTEM_NEWS_PAGE: '/users/news_page/system_news_page',
  MATCH_NEWS_PAGE: '/users/news_page/match_news_page',
  BETA_VOUCHER_LIST: '/users/accounting/voucher_list',
  GENERAL_SETTING: '/users/setting/general',
  BALANCE_SHEET: '/users/reports/financials/balance_sheet',
  INCOME_STATEMENT: '/users/reports/financials/income_statement',
  CASH_FLOW: '/users/reports/financials/cash_flow',
  BUSINESS_TAX: '/users/reports/tax/business_tax',
  LEDGER: '/users/accounting/ledger',
  TRIAL_BALANCE: '/users/accounting/trial_balance',
  COUNTERPARTY: '/users/setting/counterparty',
  SUBSCRIPTIONS: '/users/subscriptions',

  KYC: '/users/kyc',
  SALARY: '/users/salary',
  SALARY_BOOKKEEPING: '/users/salary/bookkeeping',
  ACCOUNTING: '/users/accounting',
  ADD_NEW_VOUCHER: '/users/accounting/add_new_voucher',
  VOUCHER_LIST: '/users/accounting/voucher_list',
  PAYABLE_RECEIVABLE_LIST: '/users/accounting/payable_receivable_list',
  CERTIFICATE_LIST: '/users/accounting/certificate_list',
  ASSET_LIST: '/users/asset',

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

  ACCOUNTING_SETTING: '/users/setting/accounting_setting',
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
