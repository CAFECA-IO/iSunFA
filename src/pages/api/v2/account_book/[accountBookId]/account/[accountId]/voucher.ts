/**
 * Info: (20241106 - Murky)
 * @description 這個api是用來取得某個account 的所有voucher
 */
import { APIName } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucherEntity, IVoucherForSingleAccount } from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { withRequestValidation } from '@/lib/utils/middleware';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IPaginatedData } from '@/interfaces/pagination';
import { IUserEntity } from '@/interfaces/user';
import type { IFileEntity } from '@/interfaces/file';
import { voucherGetByAccountAPIUtils as getUtils } from '@/pages/api/v2/account_book/[accountBookId]/account/[accountId]/route_utils';

type IVoucherEntityWithLineItems = IVoucherEntity &
  IVoucherEntity & {
    lineItems: (ILineItemEntity & { account: IAccountEntity })[];
    issuer: IUserEntity & { imageFile: IFileEntity };
  };

type GetVoucherByAccountResponse = IPaginatedData<IVoucherEntityWithLineItems[]>;

/**
 * Info: (20241121 - Murky)
 * @description 需要由某個account來搜索出它所有的voucher
 * @todo
 * - 如果是 AP 或是AR 的account，需要額外計算沖帳結果
 * - 只列出未沖帳完的voucher
 */
const handleGetRequest: IHandleRequest<
  APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2,
  GetVoucherByAccountResponse
> = async ({ query, session }) => {
  const { pageSize, startDate, endDate, page, accountId, sortOption, searchQuery } = query;
  const { accountBookId } = session;
  // const { pageSize, page, sortOption } = query;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: GetVoucherByAccountResponse | null = null;

  const accountFromPrisma = await getUtils.getAccountFromPrisma({
    accountBookId,
    accountId,
  });

  if (!accountFromPrisma) {
    getUtils.throwErrorAndLog(loggerBack, {
      errorMessage: `Account not found: ${accountId}`,
      statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
    });
  }

  const accountEntityForSearch = getUtils.initAccountEntity(accountFromPrisma!);
  const isAccountARorAP = getUtils.isAccountARorAP(accountEntityForSearch);

  const paginationVouchersFromPrisma = await getUtils.getVouchersFromPrisma({
    accountBookId,
    accountId,
    startDate,
    endDate,
    sortOption,
    page,
    pageSize,
    searchQuery,
    isDeleted: undefined,
  });

  const { data: vouchersFromPrisma, ...pagination } = paginationVouchersFromPrisma;

  const vouchers = vouchersFromPrisma.reduce(
    (acc: IVoucherEntityWithLineItems[], voucherFromPrisma) => {
      const issuerEntity = getUtils.initIssuerAndFileEntity(voucherFromPrisma);
      const lineItemEntities = getUtils
        .initLineItemAndAccountEntities(voucherFromPrisma)
        .filter(
          (lineItem) => lineItem.account.id === accountId || lineItem.account.parentId === accountId
        );
      const voucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);

      if (!isAccountARorAP) {
        acc.push({
          ...voucherEntity,
          issuer: issuerEntity,
          lineItems: lineItemEntities,
        });
      } else {
        const targetLineItem = lineItemEntities.find(
          (lineItem) => lineItem.accountId === accountId
        );
        if (!(targetLineItem && getUtils.isLineItemWriteOff(targetLineItem))) {
          acc.push({
            ...voucherEntity,
            issuer: issuerEntity,
            lineItems: lineItemEntities,
          });
        }
      }

      return acc;
    },
    [] as IVoucherEntityWithLineItems[]
  );

  const paginatedData: GetVoucherByAccountResponse = {
    page: pagination.page,
    totalPages: pagination.totalPages,
    totalCount: pagination.totalCount,
    pageSize: pagination.pageSize,
    hasNextPage: pagination.hasNextPage,
    hasPreviousPage: pagination.hasPreviousPage,
    sort: sortOption,
    data: vouchers,
  };

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = paginatedData;
  return {
    statusMessage,
    payload,
  };
};

type APIResponse = IPaginatedData<IVoucherForSingleAccount[]> | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req) =>
    withRequestValidation(APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2, req, handleGetRequest),
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
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
