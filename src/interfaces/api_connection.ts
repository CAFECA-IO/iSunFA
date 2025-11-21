import { IFinancialReportRequest } from '@/interfaces/report';
import { IVoucher } from '@/interfaces/voucher';
import { IAccountBookKYCForm } from '@/interfaces/account_book_kyc';
import { ICertificate } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';

export type IAPIName = APIName;

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
