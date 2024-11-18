/**
 * Info: (20241106 - Murky)
 * @description 這個api是用來取得某個account 可以revert的 line_item
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
import { ILineItemEntity, IReverseItem } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IPaginatedData } from '@/interfaces/pagination';
import { lineItemGetByAccountAPIUtils as getUtils } from '@/pages/api/v2/company/[companyId]/account/[accountId]/route_utils';

type ILineItemWithAccountAndVoucher = ILineItemEntity & {
  account: IAccountEntity;
  voucher: IVoucherEntity;
};
type GetVoucherByAccountResponse = IPaginatedData<ILineItemWithAccountAndVoucher[]>;

const handleGetRequest: IHandleRequest<
  APIName.REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2,
  GetVoucherByAccountResponse
> = async ({ query, session }) => {
  const { pageSize, startDate, endDate, page, accountId, sortOption, searchQuery } = query;
  const { userId, companyId } = session;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: GetVoucherByAccountResponse | null = null;

  const logger = loggerError(userId, 'GET', 'Get reverse line item by account');

  try {
    const paginatedLineItemsFromDB = await getUtils.getLineItemsByAccountIdFromPrisma({
      accountId,
      companyId,
      startDate,
      endDate,
      page,
      pageSize,
      sortOption,
      searchQuery,
    });

    const { data: lineItemsFromDB } = paginatedLineItemsFromDB;

    const lineItemsStillCanReverse = lineItemsFromDB.filter(
      getUtils.isLineItemCanBeReversedAndStillReversible
    );

    const lineItemEntities = lineItemsStillCanReverse.map(getUtils.initLineItemEntity);

    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = {
      page,
      totalPages: paginatedLineItemsFromDB.totalPages,
      totalCount: paginatedLineItemsFromDB.totalCount,
      pageSize,
      hasNextPage: paginatedLineItemsFromDB.hasNextPage,
      hasPreviousPage: paginatedLineItemsFromDB.hasPreviousPage,
      sort: sortOption,
      data: lineItemEntities,
    };
  } catch (_error) {
    const error = _error as Error;
    logger.error(error);
    statusMessage = error.message;
  }

  return {
    statusMessage,
    payload,
  };
};

type APIResponse = IPaginatedData<IReverseItem[]> | null;

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
    withRequestValidation(APIName.REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2, req, res, handleGetRequest),
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
