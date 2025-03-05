import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  IConnectAccountBookQueryParams,
  IConnectAccountBookResponse,
} from '@/lib/utils/zod_schema/account_book';
/*
 * TODO: (20250305 - Shirley)
 * 改用 zod_schema/company.ts 替代 zod_schema/account_book.ts
 */
interface IResponse {
  statusMessage: string;
  payload: IConnectAccountBookResponse | null;
}

const handleGetRequest: IHandleRequest<
  APIName.CONNECT_ACCOUNT_BOOK_BY_ID,
  IResponse['payload']
> = async ({ query }) => {
  const { accountBookId } = query as IConnectAccountBookQueryParams;

  /**
   * Info: (20250227 - Shirley) mock 連接帳本的邏輯
   * 在實際應用中，這裡會有更複雜的邏輯，例如檢查帳本是否存在、用戶是否有權限等
   */
  if (accountBookId === 404) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  const payload: IConnectAccountBookResponse = {
    accountBookId,
  };

  return { statusMessage: STATUS_MESSAGE.SUCCESS_GET, payload };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req) => withRequestValidation(APIName.CONNECT_ACCOUNT_BOOK_BY_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IResponse['payload'] = null;

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
  } finally {
    const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
