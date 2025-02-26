import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { IAccountBookForUser } from '@/interfaces/account_book';
import { FAKE_TEMA_ACCOUNT_BOOKS } from '@/constants/team';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IAccountBookForUser[]> | null = null;

  // Info: (20250226 - Tzuhan) 驗證使用者是否登入
  const isLogin = await checkSessionUser(session, APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }

  // Info: (20250226 - Tzuhan)驗證使用者是否有權限查詢該團隊
  const isAuth = await checkUserAuthorization(APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250226 - Tzuhan)驗證請求資料
  const { query } = checkRequestData(APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const { teamId } = query;
  if (!teamId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(
    `User: ${userId} List account books by teamId: ${teamId} with query: ${JSON.stringify(query)}`
  );

  // Info: (20250226 - Tzuhan)取得該團隊的帳本列表
  const accountBooks = FAKE_TEMA_ACCOUNT_BOOKS || [];

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<IAccountBookForUser[]> = {
    data: accountBooks,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 10,
  };

  // Info: (20250226 - Tzuhan)驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID,
    toPaginatedData(options)
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const result = formatApiResponse(statusMessage, payload);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    switch (method) {
      case 'GET':
      default:
        ({ httpCode, result } = await handleGetRequest(req));
    }
  } catch (error) {
    const err = error as Error;
    ({ httpCode, result } = formatApiResponse<null>(
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    ));
  }

  res.status(httpCode).json(result);
}
