import {
  AccountInvoiceData,
  AccountLineItem,
  AccountVoucher,
  AccountVoucherMetaData,
  isAccountInvoiceData,
} from '@/interfaces/account';
import { IAnalysisReportRequest, IFinancialReportRequest } from '@/interfaces/report';
import { HttpMethod } from '@/enums/http_method';
import APIName from '@/enums/api_name';

export type APIData = {
  name: APIName;
  method: HttpMethod;
  pathConstructor: (params: Record<string, string | number> | null | undefined) => string;
  checkParams?: (params: Record<string, string | number> | null | undefined) => void;
  checkBody?: (
    body: Record<string, string | number | Record<string, string | number>> | null | undefined
  ) => void;
  useWorker: boolean;
};

export type APIConfig = {
  [key in APIName]: APIData;
};

const checkBody = (keys: string[], body: Record<string, unknown> | null | undefined) => {
  if (!body) {
    throw new Error('body is missing');
  }
  keys.forEach((key) => {
    if (!(key in body)) {
      throw new Error(`Body is missing key: ${key}`);
    }
  });
};

const API_CONFIG: APIConfig = {
  [APIName.SIGN_UP]: {
    name: APIName.SIGN_UP,
    // TODO: intergrate with exist signUp (20240503 - tzuhan)
    pathConstructor: () => '/api/auth/sign-up',
    method: HttpMethod.POST,
    checkParams: undefined,
    checkBody: (body) => {
      if (!body?.registration) {
        throw new Error('body is missing registration');
      }
    },
    useWorker: false,
  },
  // [APIName.SIGN_IN]: {
  //   name: APIName.SIGN_IN,
  //   pathConstructor: () => '/api/auth/sign-in', // TODO: intergrate with exist signIn (20240503 - tzuhan)
  //   method: HttpMethod.POST,
  //   checkParams: undefined,
  //   checkBody: (body) => {
  //     if (!body?.name || !body?.credentialId) {
  //       throw new Error('body is missing name or credentialId');
  //     }
  //   },
  //   useWorker: false,
  // },
  [APIName.GET_USER_BY_ID]: {
    name: APIName.GET_USER_BY_ID,
    pathConstructor: () => '', // TODO: Add pathConstructor (20240503 - tzuhan)
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.id) {
        throw new Error('params is missing id');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.LIST_ALL_PROJECTS]: {
    name: APIName.LIST_ALL_PROJECTS,
    pathConstructor: (params) => `/company/${params?.companyId}/projects`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROJECTS_STATUS]: {
    name: APIName.GET_PROJECTS_STATUS,
    pathConstructor: (params) => `/company/${params?.companyId}/projects/status`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROJECTS_VALUE]: {
    name: APIName.GET_PROJECTS_VALUE,
    pathConstructor: (params) => `/company/${params?.companyId}/projects/value`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PERIOD_PROFIT]: {
    name: APIName.GET_PERIOD_PROFIT,
    pathConstructor: (params) => `/company/${params?.companyId}/profit`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROJECT_VOUCHERS]: {
    name: APIName.GET_PROJECT_VOUCHERS,
    pathConstructor: (params) =>
      `/company/${params?.companyId}/projects/${params?.projectId}/vouchers`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.projectId) {
        throw new Error('params is missing companyId or projectId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_INVOCIE]: {
    name: APIName.GET_INVOCIE,
    pathConstructor: (params) => `/company/${params?.companyId}/invoice/${params?.id}`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.id) {
        throw new Error('params is missing companyId or id');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.GET_AUDIT_REPORTS]: {
    name: APIName.GET_AUDIT_REPORTS,
    pathConstructor: () => '/audit_reports',
    method: HttpMethod.GET,
    checkParams: undefined,
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GENERATE_FINANCIAL_REPORT]: {
    name: APIName.GENERATE_FINANCIAL_REPORT,
    pathConstructor: (params) => `/company/${params?.companyId}/report/financial`,
    method: HttpMethod.POST,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const instance = {} as IFinancialReportRequest;
      const keysArray = Object.keys(instance) as Array<keyof IFinancialReportRequest>;
      checkBody(keysArray, body);
    },
    useWorker: false,
  },
  [APIName.GENERATE_ANALYSIS_REPORT]: {
    name: APIName.GENERATE_ANALYSIS_REPORT,
    pathConstructor: (params) => `/company/${params?.companyId}/report/analysis`,
    method: HttpMethod.POST,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const instance = {} as IAnalysisReportRequest;
      const keysArray = Object.keys(instance) as Array<keyof IAnalysisReportRequest>;
      checkBody(keysArray, body);
    },
    useWorker: false,
  },
  [APIName.OCR_UPLOAD_INVOICE_PICTURE]: {
    name: APIName.OCR_UPLOAD_INVOICE_PICTURE,
    pathConstructor: (params) => `/company/${params?.companyId}/ocr/upload`,
    method: HttpMethod.POST,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const { formData } = body as unknown as { formData: { invoices: File[] } };
      const { invoices } = formData;
      if (!invoices || !Array.isArray(invoices)) {
        throw new Error('Invalid invoices');
      }
    },
    useWorker: false,
  },
  [APIName.OCR_CHECK_CURRENT_ANALYZING_PROGRESS_STATUS]: {
    name: APIName.OCR_CHECK_CURRENT_ANALYZING_PROGRESS_STATUS,
    pathConstructor: (params) =>
      `/company/${params?.companyId}/ocr/${params?.resultId}/process_statue`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.OCR_GET_ANALYZED_RESULT]: {
    name: APIName.OCR_GET_ANALYZED_RESULT,
    pathConstructor: (params) => `/company/${params?.companyId}/ocr/${params?.resultId}/result`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.LIST_ALL_VOUCHERS]: {
    name: APIName.LIST_ALL_VOUCHERS,
    pathConstructor: (params) => `/company/${params?.companyId}/vouchers`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.VOUCHER_GET_BY_ID]: {
    name: APIName.VOUCHER_GET_BY_ID,
    pathConstructor: (params) => `/company/${params?.companyId}/vouchers/${params?.voucherId}`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.voucherId) {
        throw new Error('params is missing companyId or voucherId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.VOUCHER_UPLOAD_INVOICES]: {
    name: APIName.VOUCHER_UPLOAD_INVOICES,
    pathConstructor: (params) => `/company/${params?.companyId}/voucher/upload_invoice`,
    method: HttpMethod.POST,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const { invoices } = body as unknown as { invoices: AccountInvoiceData[] };
      if (
        !invoices ||
        !Array.isArray(invoices) ||
        invoices.some((invoice) => !isAccountInvoiceData(invoice))
      ) {
        throw new Error('Invalid invoices');
      }
    },
    useWorker: false,
  },
  [APIName.VOUCHER_GET_PREVIEW_CREATING_PROCESS_STATE_BY_RESULT_ID]: {
    name: APIName.VOUCHER_GET_PREVIEW_CREATING_PROCESS_STATE_BY_RESULT_ID,
    pathConstructor: (params) =>
      `/company/${params?.companyId}/voucher/${params?.resultId}/process_statue`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.VOUCHER_GET_PREVIEW_VOUCHER_BY_RESULT_ID]: {
    name: APIName.VOUCHER_GET_PREVIEW_VOUCHER_BY_RESULT_ID,
    pathConstructor: (params) =>
      `/company/${params?.companyId}/voucher/${params?.resultId}/preview`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.VOUCHER_GENERATE]: {
    name: APIName.VOUCHER_GENERATE,
    pathConstructor: (params) => `/company/${params?.companyId}/voucher`,
    method: HttpMethod.POST,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const instance = {} as AccountVoucher;
      const keysArray = Object.keys(instance) as Array<keyof AccountVoucher>;
      checkBody(keysArray, body);
      const { voucher } = body as unknown as { voucher: AccountVoucher };
      const { metadatas, lineItems } = voucher as AccountVoucher;
      metadatas.forEach((metadata) => {
        const metaKeysArray = Object.keys(metadata) as Array<keyof AccountVoucherMetaData>;
        const data = metadata as unknown as Record<string, unknown>;
        checkBody(metaKeysArray, data);
      });
      lineItems.forEach((lineItem) => {
        const lineItemKeysArray = Object.keys(lineItem) as Array<keyof AccountLineItem>;
        const data = lineItem as unknown as Record<string, unknown>;
        checkBody(lineItemKeysArray, data);
      });
    },
    useWorker: false,
  },
  [APIName.UPLOAD_JOURNAL_DOCUMENT_IMAGE]: {
    name: APIName.UPLOAD_JOURNAL_DOCUMENT_IMAGE,
    pathConstructor: (params) => `/company/${params?.companyId}/journals/document/upload`,
    method: HttpMethod.POST,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const { document } = body as unknown as { document: File };
      if (!document) {
        throw new Error('body is missing document');
      }
    },
    useWorker: false,
  },
  [APIName.GET_JOURNAL_PROCESSING_STATUS]: {
    name: APIName.GET_JOURNAL_PROCESSING_STATUS,
    pathConstructor: (params) =>
      `/company/${params?.companyId}/journals/document/process_status/${params?.resultId}`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROCESSED_JOURNAL_DATA]: {
    name: APIName.GET_PROCESSED_JOURNAL_DATA,
    pathConstructor: (params) =>
      `/company/${params?.companyId}/journals/document/result/${params?.resultId}`,
    method: HttpMethod.GET,
    checkParams: (params) => {
      if (!params?.companyId || !params?.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.CREATE_INCOME_EXPENSE_JOURNAL]: {
    name: APIName.CREATE_INCOME_EXPENSE_JOURNAL,
    pathConstructor: (params) => `/company/${params?.companyId}/journals/add`,
    method: HttpMethod.POST,
    checkParams: (params) => {
      if (!params?.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      // TODO: missing interface or interface AccountInvoiceData is differ form doc (20240503 - tzuhan)
      const instance = {} as AccountInvoiceData;
      const keysArray = Object.keys(instance) as Array<keyof AccountInvoiceData>;
      checkBody(keysArray, body);
    },
    useWorker: false,
  },
};

export default API_CONFIG;
