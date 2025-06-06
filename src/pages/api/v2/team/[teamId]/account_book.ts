import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import { listAccountBooksByTeamId } from '@/lib/utils/repo/account_book.repo';
import { IAccountBookInfoWithTeamEntity } from '@/lib/utils/zod_schema/account_book';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedOptions<IAccountBookInfoWithTeamEntity[]> | null = null;

  // Info: (20250226 - Tzuhan) 驗證使用者是否登入
  await checkSessionUser(session, APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID, req);
  // Info: (20250226 - Tzuhan)驗證使用者是否有權限查詢該團隊
  await checkUserAuthorization(APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID, req, session);

  // Info: (20250226 - Tzuhan)驗證請求資料
  const { query } = checkRequestData(APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID, req, session);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250226 - Tzuhan)取得該團隊的帳本列表
  const accountBooks = await listAccountBooksByTeamId(userId, query);

  statusMessage = STATUS_MESSAGE.SUCCESS;
  // Info: (20250226 - Tzuhan)驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID,
    accountBooks
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID, req, statusMessage);
  res.status(httpCode).json(result);
}
