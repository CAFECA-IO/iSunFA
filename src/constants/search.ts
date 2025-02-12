import { ISearchKeyword } from '@/interfaces/search';
import { ISUNFA_ROUTE } from '@/constants/url';

export const SEARCH_KEYWORDS: ISearchKeyword[] = [
  {
    label: 'My Company List',
    path: ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE,
  },
  {
    label: '公司清單',
    path: ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE,
  },
  {
    label: '建立公司',
    path: ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE,
  },
  {
    label: 'Event Planner',
    path: ISUNFA_ROUTE.TODO_LIST_PAGE,
  },
  {
    label: '待辦事項',
    path: ISUNFA_ROUTE.TODO_LIST_PAGE,
  },
  {
    label: '建立事件',
    path: ISUNFA_ROUTE.TODO_LIST_PAGE,
  },
  {
    label: 'Latest News',
    path: ISUNFA_ROUTE.LATEST_NEWS_PAGE,
  },
  {
    label: '最新消息',
    path: ISUNFA_ROUTE.LATEST_NEWS_PAGE,
  },
  {
    label: '系統訊息',
    path: ISUNFA_ROUTE.LATEST_NEWS_PAGE,
  },
  {
    label: '財經新聞',
    path: ISUNFA_ROUTE.LATEST_NEWS_PAGE,
  },
  {
    label: 'Add New Voucher',
    path: ISUNFA_ROUTE.ADD_NEW_VOUCHER,
    needToVerifyCompany: true,
  },
  {
    label: '新增傳票',
    path: ISUNFA_ROUTE.ADD_NEW_VOUCHER,
    needToVerifyCompany: true,
  },
  {
    label: 'Voucher List',
    path: ISUNFA_ROUTE.VOUCHER_LIST,
    needToVerifyCompany: true,
  },
  {
    label: '傳票清單',
    path: ISUNFA_ROUTE.VOUCHER_LIST,
    needToVerifyCompany: true,
  },
  {
    label: 'Payable/Receivable List',
    path: ISUNFA_ROUTE.PAYABLE_RECEIVABLE_LIST,
    needToVerifyCompany: true,
  },
  {
    label: '應收/應付清單',
    path: ISUNFA_ROUTE.PAYABLE_RECEIVABLE_LIST,
    needToVerifyCompany: true,
  },
  {
    label: 'Certificate List',
    path: ISUNFA_ROUTE.CERTIFICATE_LIST,
    needToVerifyCompany: true,
  },
  {
    label: '憑證清單',
    path: ISUNFA_ROUTE.CERTIFICATE_LIST,
    needToVerifyCompany: true,
  },
  {
    label: 'Upload Certificate',
    path: ISUNFA_ROUTE.CERTIFICATE_LIST,
    needToVerifyCompany: true,
  },
  {
    label: '上傳憑證',
    path: ISUNFA_ROUTE.CERTIFICATE_LIST,
    needToVerifyCompany: true,
  },
  {
    label: 'Asset List',
    path: ISUNFA_ROUTE.ASSET_LIST,
    needToVerifyCompany: true,
  },
  {
    label: '資產清單',
    path: ISUNFA_ROUTE.ASSET_LIST,
    needToVerifyCompany: true,
  },
  {
    label: 'Balance Sheet',
    path: ISUNFA_ROUTE.BALANCE_SHEET,
    needToVerifyCompany: true,
  },
  {
    label: '資產負債表',
    path: ISUNFA_ROUTE.BALANCE_SHEET,
    needToVerifyCompany: true,
  },
  {
    label: 'Comprehensive Income Statement',
    path: ISUNFA_ROUTE.INCOME_STATEMENT,
    needToVerifyCompany: true,
  },
  {
    label: '綜合損益表',
    path: ISUNFA_ROUTE.INCOME_STATEMENT,
    needToVerifyCompany: true,
  },
  {
    label: 'Cash Flow Statement',
    path: ISUNFA_ROUTE.CASH_FLOW,
    needToVerifyCompany: true,
  },
  {
    label: '現金流量表',
    path: ISUNFA_ROUTE.CASH_FLOW,
    needToVerifyCompany: true,
  },
  {
    label: 'Business Tax Return(401)',
    path: ISUNFA_ROUTE.BUSINESS_TAX,
    needToVerifyCompany: true,
  },
  {
    label: '營業人銷售額與稅額申報書(401)',
    path: ISUNFA_ROUTE.BUSINESS_TAX,
    needToVerifyCompany: true,
  },
  {
    label: '營業稅申報表 (401)',
    path: ISUNFA_ROUTE.BUSINESS_TAX,
    needToVerifyCompany: true,
  },
  // ToDo: (20241226 - Liz) Ledger (總帳) 因為跟帳本撞名所以之後可能會變更名稱
  {
    label: 'Ledger',
    path: ISUNFA_ROUTE.LEDGER,
    needToVerifyCompany: true,
  },
  {
    label: '分類帳',
    path: ISUNFA_ROUTE.LEDGER,
    needToVerifyCompany: true,
  },
  {
    label: '總帳',
    path: ISUNFA_ROUTE.LEDGER,
    needToVerifyCompany: true,
  },
  {
    label: 'Trial Balance',
    path: ISUNFA_ROUTE.LEDGER,
    needToVerifyCompany: true,
  },
  {
    label: '試算表',
    path: ISUNFA_ROUTE.TRIAL_BALANCE,
    needToVerifyCompany: true,
  },
  {
    label: 'General Setting',
    path: ISUNFA_ROUTE.GENERAL_SETTINGS,
  },
  {
    label: '一般設定',
    path: ISUNFA_ROUTE.GENERAL_SETTINGS,
  },
  {
    label: 'Accounting Setting',
    path: ISUNFA_ROUTE.ACCOUNTING_SETTINGS,
    needToVerifyCompany: true,
  },
  {
    label: '會計設定',
    path: ISUNFA_ROUTE.ACCOUNTING_SETTINGS,
    needToVerifyCompany: true,
  },
];
