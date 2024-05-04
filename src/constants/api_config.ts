import { HttpMethod } from '@/enums/http_method';
import APIName from '@/enums/api_name';

export type APIData = {
  name: APIName;
  method: HttpMethod;
  path: string;
  params: { [key: string]: string | { [key: string]: string } };
  query?: { [key: string]: string };
  returnType: string;
  useWorker: boolean;
};

export type APIConfig = {
  [key in APIName]: APIData;
};

const API_CONFIG: APIConfig = {
  [APIName.SIGN_UP]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.POST,
    path: '/api/auth/sign-up',
    params: { body: { registration: 'RegistrationEncoded' } },
    returnType: 'IUserAuth',
    useWorker: false,
  },
  [APIName.SIGN_IN]: {
    name: APIName.SIGN_IN,
    method: HttpMethod.POST,
    path: '/api/auth/sign-up',
    params: { body: { registration: 'RegistrationEncoded' } },
    returnType: 'IUserAuth',
    useWorker: false,
  },
  [APIName.SIGN_OUT]: {
    name: APIName.SIGN_OUT,
    method: HttpMethod.POST,
    path: 'api/auth/sign-out',
    params: { body: { credential: 'Credential' } },
    returnType: 'void',
    useWorker: false,
  },
  [APIName.LIST_ALL_PROJECTS]: {
    name: APIName.LIST_ALL_PROJECTS,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {
      companyId: 'string',
    },
    returnType: 'Project[]',
    useWorker: false,
  },
  [APIName.GET_PROJECTS_STATUS]: {
    name: APIName.GET_PROJECTS_STATUS,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects/status',
    params: {},
    returnType: 'IStatus[]',
    useWorker: false,
  },
  [APIName.GET_PROJECTS_VALUE]: {
    name: APIName.GET_PROJECTS_VALUE,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects/value',
    params: { companyId: 'string' },
    returnType: 'IValue[]',
    useWorker: false,
  },
  [APIName.GET_PERIOD_PROFIT]: {
    name: APIName.GET_PERIOD_PROFIT,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects/profit',
    params: { companyId: 'string' },
    returnType: 'IProfit[]',
    useWorker: false,
  },
  [APIName.GET_PROJECT_VOUCHERS]: {
    name: APIName.GET_PROJECT_VOUCHERS,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects/:projectId/vouchers',
    params: { companyId: 'string', projectId: 'string' },
    returnType: '{accountingEvents: AccountingEvent[], pageMeta: PageMeta}',
    useWorker: false,
  },
  [APIName.GET_INVOCIE]: {
    name: APIName.GET_INVOCIE,
    method: HttpMethod.GET,
    path: '/company/:companyId/invoice/:projectId/vouchers',
    params: { companyId: 'string', projectId: 'string' },
    returnType: '',
    useWorker: false,
  },
  [APIName.GET_AUDIT_REPORTS]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.GENERATE_FINANCIAL_REPORT]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.GENERATE_ANALYSIS_REPORT]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.OCR_UPLOAD_INVOICE_PICTURE]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.OCR_CHECK_CURRENT_ANALYZING_PROGRESS_STATUS]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.OCR_GET_ANALYZED_RESULT]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.LIST_ALL_VOUCHERS]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.VOUCHER_GET_BY_ID]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.VOUCHER_UPLOAD_INVOICES]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.VOUCHER_GET_PREVIEW_CREATING_PROCESS_STATE_BY_RESULT_ID]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.VOUCHER_GET_PREVIEW_VOUCHER_BY_RESULT_ID]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.VOUCHER_GENERATE]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.UPLOAD_JOURNAL_DOCUMENT_IMAGE]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.GET_JOURNAL_PROCESSING_STATUS]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
  [APIName.GET_PROCESSED_JOURNAL_DATA]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.GET,
    path: '/company/:companyId/projects',
    params: {},
    returnType: '',
    useWorker: false,
  },
};

export default API_CONFIG;
