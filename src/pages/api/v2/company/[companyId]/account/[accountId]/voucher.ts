/**
 * Info: (20241106 - Murky)
 * @description 這個api是用來取得某個account 的所有voucher
 */
import { APIName } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucherEntity } from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { withRequestValidation } from '@/lib/utils/middleware';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IPaginatedData } from '@/interfaces/pagination';
import { JOURNAL_EVENT } from '@/constants/journal';
import { AccountType, EventType } from '@/constants/account';
import { IUserEntity } from '@/interfaces/user';
import type { IFileEntity } from '@/interfaces/file';
import { FileFolder } from '@/constants/file';

type IVoucherEntityWithLineItems = IVoucherEntity &
  IVoucherEntity & {
    lineItems: (ILineItemEntity & { account: IAccountEntity })[];
    issuer: IUserEntity & { imageFile: IFileEntity };
  };

type GetVoucherByAccountResponse = IPaginatedData<IVoucherEntityWithLineItems[]>;

const handleGetRequest: IHandleRequest<
  APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2,
  GetVoucherByAccountResponse
> = async ({ query }) => {
  // const { pageSize, startDate, endDate, page, accountId, sortOption, searchQuery } = query;
  const { pageSize, page, sortOption } = query;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: GetVoucherByAccountResponse | null = null;

  const mockIssuer: IUserEntity & { imageFile: IFileEntity } = {
    id: 1,
    name: 'Murky',
    email: 'murky@isunfa.com',
    imageFileId: 1,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    imageFile: {
      id: 1,
      name: 'murky.jpg',
      size: 1000,
      mimeType: 'image/jpeg',
      type: FileFolder.TMP,
      url: 'https://isunfa.com/elements/avatar_default.svg?w=256&q=75',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    },
  };

  const mockLineItem: ILineItemEntity & { account: IAccountEntity } = {
    id: 3,
    description: '原價屋',
    amount: 1000,
    debit: false,
    accountId: 1,
    voucherId: 1,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    account: {
      id: 1,
      companyId: 1002,
      system: 'IFRS',
      type: AccountType.ASSET,
      debit: true,
      liquidity: true,
      code: '1172',
      name: '應收帳款',
      forUser: true,
      parentCode: '1170',
      rootCode: '1170',
      level: 3,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    },
  };

  const mockVoucher: IVoucherEntityWithLineItems = {
    id: 1,
    issuerId: 1,
    counterPartyId: 1,
    companyId: 1002,
    status: JOURNAL_EVENT.UPLOADED,
    editable: true,
    no: '1001',
    date: 1,
    type: EventType.INCOME,
    note: 'this is note',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    lineItems: [mockLineItem],
    readByUsers: [],
    originalEvents: [],
    resultEvents: [],
    certificates: [],
    asset: [],
    issuer: mockIssuer,
  };

  const mockPaginatedData: GetVoucherByAccountResponse = {
    page,
    totalPages: 10,
    totalCount: 100,
    pageSize,
    hasNextPage: true,
    hasPreviousPage: false,
    sort: sortOption,
    data: [mockVoucher],
  };

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = mockPaginatedData;
  return {
    statusMessage,
    payload,
  };
};

type APIResponse = object | number | null;

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
    withRequestValidation(APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2, req, res, handleGetRequest),
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
