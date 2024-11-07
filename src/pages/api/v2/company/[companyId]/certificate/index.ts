import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName } from '@/constants/api_connection';

import { loggerError } from '@/lib/utils/logger_back';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { ICertificateEntity } from '@/interfaces/certificate';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IUserEntity } from '@/interfaces/user';
import { CurrencyType } from '@/constants/currency';
import { IPaginatedData } from '@/interfaces/pagination';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CounterpartyType } from '@/constants/counterparty';
import { FileFolder } from '@/constants/file';

type ICertificateListItem = ICertificateEntity & {
  invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
  file: IFileEntity;
  uploader: IUserEntity & { imageFile: IFileEntity };
};

type ICertificateListSummary = {
  totalInvoicePrice: number;
  unRead: {
    withVoucher: number;
    withoutVoucher: number;
  };
  currency: CurrencyType;
  certificates: ICertificateListItem[];
};

type PaginatedCertificateListResponse = IPaginatedData<ICertificateListSummary>;

type ICertificatePostResponse = ICertificateEntity & { file: IFileEntity };

type APIResponse =
  | object
  | {
      data: unknown;
    }
  | null;

export const handleGetRequest: IHandleRequest<APIName.CERTIFICATE_LIST_V2, object> = async ({
  query,
}) => {
  // ToDo: (20241024 - Murky) API接口請符合 FilterSection 公版
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: PaginatedCertificateListResponse | null = null;

  if (query) {
    // ToDo: (20240924 - Murky) Remember to use sortBy, sortOrder, startDate, endDate, searchQuery, hasBeenUsed
    const { page, pageSize, sortOption } = query;
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

    const mockUserFile: IFileEntity = {
      id: 1,
      name: 'murky.jpg',
      size: 1000,
      mimeType: 'image/jpeg',
      type: FileFolder.TMP,
      url: 'https://isunfa.com/elements/avatar_default.svg?w=256&q=75',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    const mockInvoiceFile: IFileEntity = {
      id: 1,
      name: 'murky.jpg',
      size: 1000,
      mimeType: 'image/jpeg',
      type: FileFolder.TMP,
      url: 'https://isunfa.com/elements/avatar_default.svg?w=256&q=75',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    const mockUploader: IUserEntity & { imageFile: IFileEntity } = {
      id: 1,
      name: 'Murky',
      email: 'murky@isunfa.com',
      imageFileId: 1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      imageFile: mockUserFile,
    };

    const mockCounterParty: ICounterPartyEntity = {
      id: 1,
      companyId: 1003,
      name: '原價屋',
      taxId: '27749036',
      type: CounterpartyType.CLIENT,
      note: '買電腦',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    const mockInvoice: IInvoiceEntity & { counterParty: ICounterPartyEntity } = {
      id: 1,
      certificateId: 1,
      counterPartyId: 1,
      inputOrOutput: InvoiceTransactionDirection.INPUT,
      date: 1,
      no: '1001',
      currencyAlias: CurrencyType.TWD,
      priceBeforeTax: 2000,
      taxType: InvoiceTaxType.TAXABLE,
      taxRatio: 5,
      taxPrice: 100,
      totalPrice: 2100,
      type: InvoiceType.SALES_TRIPLICATE_INVOICE,
      deductible: true,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      counterParty: mockCounterParty,
    };

    const mockCertificate: ICertificateListItem = {
      id: 1,
      companyId: 1003,
      voucherNo: '',
      invoice: mockInvoice,
      file: mockInvoiceFile,
      uploader: mockUploader,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      vouchers: [],
    };

    const mockCertificateList: ICertificateListSummary = {
      totalInvoicePrice: 2000,
      unRead: {
        withVoucher: 0,
        withoutVoucher: 0,
      },
      currency: CurrencyType.TWD,
      certificates: [mockCertificate],
    };

    const pagination: PaginatedCertificateListResponse = {
      data: mockCertificateList,
      page,
      totalPages: 3,
      totalCount: 30,
      pageSize,
      hasNextPage: true,
      hasPreviousPage: false,
      sort: sortOption,
    };

    payload = pagination;
  }

  return {
    statusMessage,
    payload,
  };
};

export const handlePostRequest: IHandleRequest<APIName.CERTIFICATE_POST_V2, object> = async ({
  body,
  session,
}) => {
  const statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificatePostResponse | null = null;

  const { fileId } = body;
  const { companyId } = session;

  const mockFile: IFileEntity = {
    id: fileId,
    name: 'murky.jpg',
    size: 1000,
    mimeType: 'image/jpeg',
    type: FileFolder.TMP,
    url: 'https://isunfa.com/elements/avatar_default.svg?w=256&q=75',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  };

  const mockCertificate: ICertificatePostResponse = {
    id: 1,
    companyId,
    voucherNo: null,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    vouchers: [],
    file: mockFile,
  };

  payload = mockCertificate;

  return {
    statusMessage,
    payload,
  };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.CERTIFICATE_LIST_V2, req, res, handleGetRequest),
  POST: (req, res) =>
    withRequestValidation(APIName.CERTIFICATE_POST_V2, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId = -1;
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    const logger = loggerError(userId, error.name, error.message);
    logger.error(error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
