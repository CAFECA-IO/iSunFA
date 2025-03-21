import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { loggerError } from '@/lib/utils/logger_back';
import {
  IAccountBookListQueryParams,
  IAccountBookListResponse,
} from '@/lib/utils/zod_schema/account_book';
import { listAccountBookByUserId } from '@/lib/utils/repo/company.repo';
import { DefaultValue } from '@/constants/default_value';
import { parseSortOption } from '@/lib/utils/sort';
import { DEFAULT_SORT_OPTIONS } from '@/constants/account_book';

const handleGetRequest: IHandleRequest<
  APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
  IAccountBookListResponse
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookListResponse | null = null;

  const { userId, page, pageSize, searchQuery, sortOption } = query as IAccountBookListQueryParams;

  try {
    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    const accountBooksResult = await listAccountBookByUserId(
      userId,
      page,
      pageSize,
      searchQuery,
      parsedSortOption
    );

    const paginatedData = toPaginatedData(accountBooksResult);

    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = paginatedData;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'list account books by user id failed',
      errorMessage: (error as Error).message,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBookListResponse | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookListResponse | null = null;

  try {
    if (req.method === 'GET') {
      const result = await withRequestValidation(
        APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
        req,
        handleGetRequest
      );
      statusMessage = result.statusMessage;
      payload = result.payload;
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IAccountBookListResponse | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
