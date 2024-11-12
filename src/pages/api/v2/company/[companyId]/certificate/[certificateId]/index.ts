import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { CurrencyType } from '@/constants/currency';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CounterpartyType } from '@/constants/counterparty';
import { FileFolder } from '@/constants/file';
import { IVoucherEntity } from '@/interfaces/voucher';

type ICertificateItem = ICertificateEntity & {
  invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
  file: IFileEntity;
  uploader: IUserEntity;
  userCertificates: IUserCertificateEntity[];
  vouchers: IVoucherEntity[];
};

type APIResponse = ICertificate | null;

export const handleGetRequest: IHandleRequest<
  APIName.CERTIFICATE_GET_V2,
  ICertificateItem
> = async () => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificateItem | null = null;

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

  const mockUploader: IUserEntity = {
    id: 1,
    name: 'Murky',
    email: 'murky@isunfa.com',
    imageFileId: 1,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
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

  const mockCertificate: ICertificateItem = {
    id: 1,
    companyId: 1003,
    // voucherNo: '',
    invoice: mockInvoice,
    file: mockInvoiceFile,
    uploader: mockUploader,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    vouchers: [],
    userCertificates: [
      {
        id: 1,
        userId: 1,
        certificateId: 1,
        isRead: false,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      },
    ],
  };

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = mockCertificate;

  return {
    statusMessage,
    payload,
  };
};

// Deprecated: (20241108 - Murky) 應該移動到 put Invoice
// export async function handlePutRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
//   let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
//   let payload: object | null = null;

//   const session = await getSession(req, res);
//   const { userId } = session;
//   // ToDo: (20240924 - Murky) Remember to check auth
//   //   const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

//   //   if (isAuth) {
//   const { query, body } = validateRequest(APIName.CERTIFICATE_PUT_V2, req, userId);

//   if (query && body) {
//     // Info: (20240924 - Murky) Use certificateId to get id
//     //   const { certificateId } = query;
//     statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
//     [payload] = mockCertificateList;
//   }
//   //   }

//   return {
//     statusMessage,
//     payload,
//   };
// }

// Info: (20241108 - Murky) 應該移動到 delete Multiple Certificates
// export async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
//   let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
//   let payload: object | null = null;

//   const session = await getSession(req, res);
//   const { userId } = session;
//   // ToDo: (20240924 - Murky) Remember to check auth
//   //   const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

//   //   if (isAuth) {
//   const { query, body } = validateRequest(APIName.CERTIFICATE_DELETE_V2, req, userId);

//   if (query && body) {
//     // Info: (20240924 - Murky) Use certificateId to get id
//     //   const { certificateId } = query;
//     statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
//     [payload] = mockCertificateList;
//   }
//   //   }

//   return {
//     statusMessage,
//     payload,
//   };
// }

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.CERTIFICATE_GET_V2, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
