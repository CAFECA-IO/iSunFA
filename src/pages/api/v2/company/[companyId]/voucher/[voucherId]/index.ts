import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IEventEntity } from '@/interfaces/event';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import {
  IGetOneVoucherResponse,
  IVoucherDetailForFrontend,
  IVoucherEntity,
} from '@/interfaces/voucher';
import { IAssetEntity } from '@/interfaces/asset';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IFileEntity } from '@/interfaces/file';
import { ICertificateEntity } from '@/interfaces/certificate';
import { voucherAPIGetOneUtils as getUtils } from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import type { AccountingSetting as PrismaAccountingSetting } from '@prisma/client';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';

type GetOneVoucherResponse = IVoucherEntity & {
  issuer: IUserEntity;
  accountSetting: PrismaAccountingSetting; // ToDo: (20241105 - Murky)  換成entity
  counterParty: ICounterPartyEntity;
  originalEvents: IEventEntity[];
  resultEvents: IEventEntity[];
  asset: IAssetEntity[];
  certificates: (ICertificateEntity & {
    invoice: IInvoiceEntity;
    file: IFileEntity;
    userCertificates: IUserCertificateEntity[];
  })[];
  lineItems: (ILineItemEntity & { account: IAccountEntity })[];
  payableInfo?: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
  receivingInfo?: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
};

export const handleGetRequest: IHandleRequest<
  APIName.VOUCHER_GET_BY_ID_V2,
  GetOneVoucherResponse
> = async ({ query, session }) => {
  /**
   * Info: (20241112 - Murky)
   * @todo
   * - Get voucher with all needed in GetOneVoucherResponse
   * - Init every part of GetOneVoucherResponse
   * - Calculate payableInfo and receivingInfo
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: GetOneVoucherResponse | null = null;

  const { userId } = session;
  const accountSettingCompanyId = 1001;
  try {
    const { voucherId } = query;
    const voucherFromPrisma: IGetOneVoucherResponse =
      await getUtils.getVoucherFromPrisma(voucherId);

    const voucher: IVoucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);
    const lineItems: (ILineItemEntity & { account: IAccountEntity })[] =
      getUtils.initLineItemEntities(voucherFromPrisma);
    const accountSetting: PrismaAccountingSetting =
      await getUtils.getAccountingSettingFromPrisma(accountSettingCompanyId);
    const issuer: IUserEntity = getUtils.initIssuerEntity(voucherFromPrisma);
    const counterParty: ICounterPartyEntity = getUtils.initCounterPartyEntity(voucherFromPrisma);
    const originalEvents: IEventEntity[] = getUtils.initOriginalEventEntities(voucherFromPrisma);
    const resultEvents: IEventEntity[] = getUtils.initResultEventEntities(voucherFromPrisma);
    const asset: IAssetEntity[] = getUtils.initAssetEntities(voucherFromPrisma);
    const certificates = getUtils.initCertificateEntities(voucherFromPrisma);

    // ToDo: (20241112 - Murky) 剩下下面這兩個
    const { payableInfo, receivingInfo } =
      getUtils.getPayableReceivableInfoFromVoucher(originalEvents);
    const mockVoucher: GetOneVoucherResponse = {
      ...voucher,
      issuer,
      accountSetting,
      counterParty,
      originalEvents,
      resultEvents,
      asset,
      certificates,
      lineItems,
      payableInfo,
      receivingInfo,
    };
    payload = mockVoucher;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    loggerError(userId, 'Voucher Get One handleGetRequest', error.message).error(error);
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

export const handlePutRequest: IHandleRequest<APIName.VOUCHER_PUT_V2, number> = async ({
  query,
  body,
  session,
}) => {
  /**
   * Info: (20240927 - Murky)
   * Put is not actually put, but add an reverse voucher and link to current voucher
   * maybe non lineItem put can just put original voucher?? => flow chart is needed
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId } = session;
  const mockPutVoucherId = 1000;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query && body) {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = mockPutVoucherId;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

export const handleDeleteRequest: IHandleRequest<APIName.VOUCHER_DELETE_V2, number> = async ({
  query,
  session,
}) => {
  /**
   * Info: (20240927 - Murky)
   * Delete is not actually put, but add an reverse voucher and link to current voucher
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId } = session;
  const mockDeleteVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = mockDeleteVoucherId;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

type APIResponse = IVoucherDetailForFrontend | object | number | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.VOUCHER_GET_BY_ID_V2, req, res, handleGetRequest),
  PUT: (req, res) => withRequestValidation(APIName.VOUCHER_PUT_V2, req, res, handlePutRequest),
  DELETE: (req, res) =>
    withRequestValidation(APIName.VOUCHER_DELETE_V2, req, res, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId: number = -1;

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
