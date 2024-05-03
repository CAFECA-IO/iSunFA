import {
  AccountInvoiceData,
  AccountLineItem,
  AccountVoucher,
  AccountVoucherMetaData,
  isAccountInvoiceData,
} from '@/interfaces/account';
import { IAnalysisReportRequest, IFinancialReportRequest } from '@/interfaces/report';
import APIName from '../enums/api_name';

type APIConfig = {
  [key in APIName]: {
    path: (...arg: string[]) => string;
    method: string;
    checkParams?: (params: Record<string, unknown>) => void;
    checkBody?: (body: Record<string, unknown>) => void;
    useWorker: boolean;
  };
};

const checkBody = (keys: string[], body: Record<string, unknown>) => {
  keys.forEach((key) => {
    if (!(key in body)) {
      throw new Error(`Body is missing key: ${key}`);
    }
  });
};

const API_CONFIG: APIConfig = {
  [APIName.SIGN_UP]: {
    // TODO: intergrate with exist signUp (20240503 - tzuhan)
    path: () => '',
    method: 'POST',
    checkParams: undefined,
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.LOG_IN]: {
    path: () => '/login', // TODO: intergrate with exist signIn (20240503 - tzuhan)
    method: 'POST',
    checkParams: undefined,
    checkBody: (body) => {
      if (!body.name || !body.credentialId) {
        throw new Error('body is missing name or credentialId');
      }
    },
    useWorker: false,
  },
  [APIName.GET_USER_BY_ID]: {
    path: () => '', // TODO: Add path (20240503 - tzuhan)
    method: 'GET',
    checkParams: (params) => {
      if (!params.id) {
        throw new Error('params is missing id');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.LIST_ALL_PROJECTS]: {
    path: (companyId: string) => `/company/${companyId}/projects`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROJECTS_STATUS]: {
    path: (companyId: string) => `/company/${companyId}/projects/status`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROJECTS_VALUE]: {
    path: (companyId: string) => `/company/${companyId}/projects/value`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PERIOD_PROFIT]: {
    path: (companyId: string) => `/company/${companyId}/profit`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROJECT_VOUCHERS]: {
    path: (companyId: string, projectId: string) =>
      `/company/${companyId}/projects/${projectId}/vouchers`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.projectId) {
        throw new Error('params is missing companyId or projectId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_INVOCIE]: {
    path: (companyId: string, id: string) => `/company/${companyId}/invoice/${id}`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.id) {
        throw new Error('params is missing companyId or id');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.GET_AUDIT_REPORTS]: {
    path: () => '/audit_reports',
    method: 'GET',
    checkParams: undefined,
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GENERATE_FINANCIAL_REPORT]: {
    path: (companyId: string) => `/company/${companyId}/report/financial`,
    method: 'POST',
    checkParams: (params) => {
      if (!params.companyId) {
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
    path: (companyId: string) => `/company/${companyId}/report/analysis`,
    method: 'POST',
    checkParams: (params) => {
      if (!params.companyId) {
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
    path: (companyId: string) => `/company/${companyId}/ocr/upload`,
    method: 'POST',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const { formData } = body;
      const { invoices } = formData as { invoices: File[] };
      if (!invoices || !Array.isArray(invoices)) {
        throw new Error('Invalid invoices');
      }
    },
    useWorker: false,
  },
  [APIName.OCR_CHECK_CURRENT_ANALYZING_PROGRESS_STATUS]: {
    path: (companyId: string, resultId: string) =>
      `/company/${companyId}/ocr/${resultId}/process_statue`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.OCR_GET_ANALYZED_RESULT]: {
    path: (companyId: string, resultId: string) => `/company/${companyId}/ocr/${resultId}/result`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.LIST_ALL_VOUCHERS]: {
    path: (companyId: string) => `/company/${companyId}/vouchers`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.VOUCHER_GET_BY_ID]: {
    path: (companyId: string, voucherId: string) => `/company/${companyId}/vouchers/${voucherId}`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.voucherId) {
        throw new Error('params is missing companyId or voucherId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.VOUCHER_UPLOAD_INVOICES]: {
    path: (companyId: string) => `/company/${companyId}/voucher/upload_invoice`,
    method: 'POST',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const { invoices } = body;
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
    path: (companyId: string, resultId: string) =>
      `/company/${companyId}/voucher/${resultId}/process_statue`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: false,
  },
  [APIName.VOUCHER_GET_PREVIEW_VOUCHER_BY_RESULT_ID]: {
    path: (companyId: string, resultId: string) =>
      `/company/${companyId}/voucher/${resultId}/preview`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.VOUCHER_GENERATE]: {
    path: (companyId: string) => `/company/${companyId}/voucher`,
    method: 'POST',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const instance = {} as AccountVoucher;
      const keysArray = Object.keys(instance) as Array<keyof AccountVoucher>;
      checkBody(keysArray, body);
      const { voucher } = body;
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
    path: (companyId: string) => `/company/${companyId}/journals/document/upload`,
    method: 'POST',
    checkParams: (params) => {
      if (!params.companyId) {
        throw new Error('params is missing companyId');
      }
    },
    checkBody: (body) => {
      const { document } = body as { document: File };
      if (!document) {
        throw new Error('body is missing document');
      }
    },
    useWorker: false,
  },
  [APIName.GET_JOURNAL_PROCESSING_STATUS]: {
    path: (companyId: string, resultId: string) =>
      `/company/${companyId}/journals/document/process_status/${resultId}`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.GET_PROCESSED_JOURNAL_DATA]: {
    path: (companyId: string, resultId: string) =>
      `/company/${companyId}/journals/document/result/${resultId}`,
    method: 'GET',
    checkParams: (params) => {
      if (!params.companyId || !params.resultId) {
        throw new Error('params is missing companyId or resultId');
      }
    },
    checkBody: undefined,
    useWorker: true,
  },
  [APIName.CREATE_INCOME_EXPENSE_JOURNAL]: {
    path: (companyId: string) => `/company/${companyId}/journals/add`,
    method: 'POST',
    checkParams: (params) => {
      if (!params.companyId) {
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
