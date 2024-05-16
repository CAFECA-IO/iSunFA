import { IAPIConfig, IAPIName } from '@/interfaces/api_connection';

const apiVersion = 'v1';
const apiPrefix = `/api/${apiVersion}`;

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
}

export enum APIName {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  EMAIL = 'EMAIL',
  USER_GET_BY_ID = 'USER_GET_BY_ID',
  INVOCIE_GET_BY_ID = 'INVOCIE_GET_BY_ID',
  INVOCIE_UPLOAD = 'INVOCIE_UPLOAD',
  FINANCIAL_REPORT_GENERATE = 'FINANCIAL_REPORT_GENERATE',
  FINANCIAL_REPORT_GET_PROGRESS_STATUS = 'FINANCIAL_REPORT_GET_PROGRESS_STATUS',
  FINANCIAL_REPORT_GET_BY_ID = 'FINANCIAL_REPORT_GET_BY_ID',
  ANALYSIS_REPORT_GENERATE = 'ANALYSIS_REPORT_GENERATE',
  ANALYSIS_REPORT_GET_PROGRESS_STATUS = 'ANALYSIS_REPORT_GET_PROGRESS_STATUS',
  ANALYSIS_REPORT_GET_BY_ID = 'ANALYSIS_REPORT_GET_BY_ID',
  VOUCHER_GENERATE = 'VOUCHER_GENERATE',
  VOUCHER_GET_PROGRESS_STATUS = 'VOUCHER_GET_PROGRESS_STATUS',
  VOUCHER_PREVIEW_GET_BY_ID = 'VOUCHER_PREVIEW_GET_BY_ID',
  VOUCHER_LIST = 'VOUCHER_LIST',
  JOURNAL_GENERATE = 'JOURNAL_GENERATE',
  JOURNAL_GET_PROGRESS_STATUS = 'JOURNAL_GET_PROGRESS_STATUS',
  JOURNAL_LIST = 'JOURNAL_LIST',
  JOURNAL_GET_BY_ID = 'JOURNAL_GET_BY_ID',
}

export enum APIPath {
  SIGN_UP = `${apiPrefix}/sign-up`,
  SIGN_IN = `${apiPrefix}/sign-in`,
  SIGN_OUT = `${apiPrefix}/sign-out`,
  EMAIL = `${apiPrefix}/email`,
  USER_GET_BY_ID = `${apiPrefix}/toBeDefined`,
  INVOCIE_GET_BY_ID = `${apiPrefix}/company/:companyId/invoice/:invoiceId`,
  INVOCIE_UPLOAD = `${apiPrefix}/company/:companyId/invoice`,
  FINANCIAL_REPORT_GENERATE = `${apiPrefix}/company/:companyId/report_financial`,
  FINANCIAL_REPORT_GET_PROGRESS_STATUS = `${apiPrefix}/company/:companyId/report_financial/status`,
  FINANCIAL_REPORT_GET_BY_ID = `${apiPrefix}/company/:companyId/report_financial/:reportId`,
  ANALYSIS_REPORT_GENERATE = `${apiPrefix}/company/:companyId/report_analysis`,
  ANALYSIS_REPORT_GET_PROGRESS_STATUS = `${apiPrefix}/company/:companyId/report_analysis/status`,
  ANALYSIS_REPORT_GET_BY_ID = `${apiPrefix}/company/:companyId/report_analysis/:reportId`,
  VOUCHER_GENERATE = `${apiPrefix}/company/:companyId/voucher`,
  VOUCHER_GET_PROGRESS_STATUS = `${apiPrefix}/company/:companyId/voucher/:voucherId/status`,
  VOUCHER_PREVIEW_GET_BY_ID = `${apiPrefix}/company/:companyId/voucher/:voucherId`,
  VOUCHER_LIST = `${apiPrefix}/company/:companyId/voucher`,
  JOURNAL_GENERATE = `${apiPrefix}/company/:companyId/journal`,
  JOURNAL_GET_PROGRESS_STATUS = `${apiPrefix}/company/:companyId/journal/:journalId/status`,
  JOURNAL_LIST = `${apiPrefix}/company/:companyId/journal`,
  JOURNAL_GET_BY_ID = `${apiPrefix}/company/:companyId/journal/:journalId`,
}

export const APIConfig: Record<IAPIName, IAPIConfig> = {
  [APIName.SIGN_UP]: {
    name: APIName.SIGN_UP,
    method: HttpMethod.POST,
    path: APIPath.SIGN_UP,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false,
  },
  [APIName.SIGN_IN]: {
    name: APIName.SIGN_IN,
    method: HttpMethod.POST,
    path: APIPath.SIGN_IN,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false,
  },
  [APIName.SIGN_OUT]: {
    name: APIName.SIGN_OUT,
    method: HttpMethod.POST,
    path: APIPath.SIGN_OUT,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false,
  },
  [APIName.EMAIL]: {
    name: APIName.EMAIL,
    method: HttpMethod.POST,
    path: APIPath.EMAIL,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false,
  },
  [APIName.USER_GET_BY_ID]: {
    name: APIName.USER_GET_BY_ID,
    method: HttpMethod.GET,
    path: APIPath.USER_GET_BY_ID,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.INVOCIE_GET_BY_ID]: {
    name: APIName.INVOCIE_GET_BY_ID,
    method: HttpMethod.GET,
    path: APIPath.INVOCIE_GET_BY_ID,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.INVOCIE_UPLOAD]: {
    name: APIName.INVOCIE_UPLOAD,
    method: HttpMethod.POST,
    path: APIPath.INVOCIE_UPLOAD,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.FINANCIAL_REPORT_GENERATE]: {
    name: APIName.FINANCIAL_REPORT_GENERATE,
    method: HttpMethod.POST,
    path: APIPath.FINANCIAL_REPORT_GENERATE,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.FINANCIAL_REPORT_GET_PROGRESS_STATUS]: {
    name: APIName.FINANCIAL_REPORT_GET_PROGRESS_STATUS,
    method: HttpMethod.GET,
    path: APIPath.FINANCIAL_REPORT_GET_PROGRESS_STATUS,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.FINANCIAL_REPORT_GET_BY_ID]: {
    name: APIName.FINANCIAL_REPORT_GET_BY_ID,
    method: HttpMethod.GET,
    path: APIPath.FINANCIAL_REPORT_GET_BY_ID,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.ANALYSIS_REPORT_GENERATE]: {
    name: APIName.ANALYSIS_REPORT_GENERATE,
    method: HttpMethod.POST,
    path: APIPath.ANALYSIS_REPORT_GENERATE,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.ANALYSIS_REPORT_GET_PROGRESS_STATUS]: {
    name: APIName.ANALYSIS_REPORT_GET_PROGRESS_STATUS,
    method: HttpMethod.GET,
    path: APIPath.ANALYSIS_REPORT_GET_PROGRESS_STATUS,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.ANALYSIS_REPORT_GET_BY_ID]: {
    name: APIName.ANALYSIS_REPORT_GET_BY_ID,
    method: HttpMethod.GET,
    path: APIPath.ANALYSIS_REPORT_GET_BY_ID,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.VOUCHER_GENERATE]: {
    name: APIName.VOUCHER_GENERATE,
    method: HttpMethod.POST,
    path: APIPath.VOUCHER_GENERATE,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.VOUCHER_GET_PROGRESS_STATUS]: {
    name: APIName.VOUCHER_GET_PROGRESS_STATUS,
    method: HttpMethod.GET,
    path: APIPath.VOUCHER_GET_PROGRESS_STATUS,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.VOUCHER_PREVIEW_GET_BY_ID]: {
    name: APIName.VOUCHER_PREVIEW_GET_BY_ID,
    method: HttpMethod.GET,
    path: APIPath.VOUCHER_PREVIEW_GET_BY_ID,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.VOUCHER_LIST]: {
    name: APIName.VOUCHER_LIST,
    method: HttpMethod.GET,
    path: APIPath.VOUCHER_LIST,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.JOURNAL_GENERATE]: {
    name: APIName.JOURNAL_GENERATE,
    method: HttpMethod.POST,
    path: APIPath.JOURNAL_GENERATE,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.JOURNAL_GET_PROGRESS_STATUS]: {
    name: APIName.JOURNAL_GET_PROGRESS_STATUS,
    method: HttpMethod.GET,
    path: APIPath.JOURNAL_GET_PROGRESS_STATUS,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.JOURNAL_LIST]: {
    name: APIName.JOURNAL_LIST,
    method: HttpMethod.GET,
    path: APIPath.JOURNAL_LIST,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  },
  [APIName.JOURNAL_GET_BY_ID]: {
    name: APIName.JOURNAL_GET_BY_ID,
    method: HttpMethod.GET,
    path: APIPath.JOURNAL_GET_BY_ID,
    input: {
      header: {},
      body: {},
      params: {},
      query: {},
    },
    output: {},
    useWorker: false
  }
};
