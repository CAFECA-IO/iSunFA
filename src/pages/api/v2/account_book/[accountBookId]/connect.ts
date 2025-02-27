import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import {
  IConnectAccountBookQueryParams,
  IConnectAccountBookResponse,
} from '@/lib/utils/zod_schema/account_book';

/**
 * 處理 GET 請求的函數
 * 連接帳本的邏輯
 */
const handleGetRequest: IHandleRequest<
  APIName.CONNECT_ACCOUNT_BOOK_BY_ID,
  IConnectAccountBookResponse | null
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IConnectAccountBookResponse | null = null;

  const { accountBookId } = query as IConnectAccountBookQueryParams;

  loggerBack.info(`Connect to account book by id: ${accountBookId}`);

  // 模擬連接帳本的邏輯
  // 在實際應用中，這裡會有更複雜的邏輯，例如檢查帳本是否存在、用戶是否有權限等
  if (accountBookId === 404) {
    // 模擬帳本不存在的情況
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    return { statusMessage, payload: null };
  }

  // 模擬成功連接帳本
  const response: IConnectAccountBookResponse = {
    accountBookId,
    status: 'connected',
  };

  // 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.CONNECT_ACCOUNT_BOOK_BY_ID,
    response
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = outputData;
  }

  return { statusMessage, payload };
};

/**
 * API 處理函數
 * 處理連接帳本的請求
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IConnectAccountBookResponse | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IConnectAccountBookResponse | null = null;

  try {
    if (req.method === 'GET') {
      const result = await withRequestValidation(
        APIName.CONNECT_ACCOUNT_BOOK_BY_ID,
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
    const { httpCode, result } = formatApiResponse<IConnectAccountBookResponse | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
