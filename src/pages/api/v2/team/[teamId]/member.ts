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
import { FAKE_TEAM_MEMBER_LIST } from '@/constants/team';
import { IInviteMemberResponse, ITeamMember } from '@/interfaces/team';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ITeamMember[]> | null = null;

  // Info: (20250226 - Tzuhan) 驗證使用者是否登入
  const isLogin = await checkSessionUser(session, APIName.LIST_MEMBER_BY_TEAM_ID, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }

  // Info: (20250226 - Tzuhan) 驗證使用者是否有權限查詢該團隊
  const isAuth = await checkUserAuthorization(APIName.LIST_MEMBER_BY_TEAM_ID, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250226 - Tzuhan) 驗證請求資料
  const { query } = checkRequestData(APIName.LIST_MEMBER_BY_TEAM_ID, req, session);
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

  // Info: (20250226 - Tzuhan) 取得該團隊的成員列表
  const accountBooks = FAKE_TEAM_MEMBER_LIST || [];

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<ITeamMember[]> = {
    data: accountBooks,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 10,
  };

  // Info: (20250226 - Tzuhan) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_MEMBER_BY_TEAM_ID,
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

const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IInviteMemberResponse | null = null;

  // Info: (20250226 - Tzuhan) 驗證使用者是否登入
  const isLogin = await checkSessionUser(session, APIName.ADD_MEMBER_TO_TEAM, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }

  // Info: (20250226 - Tzuhan) 驗證使用者是否有權限查詢該團隊
  const isAuth = await checkUserAuthorization(APIName.ADD_MEMBER_TO_TEAM, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250226 - Tzuhan) 驗證請求資料
  const { query, body } = checkRequestData(APIName.ADD_MEMBER_TO_TEAM, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const { teamId } = query;
  if (!teamId || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(
    `User: ${userId} add member to team teamId: ${teamId} with query: ${JSON.stringify(query)}`
  );

  // Info: (20250226 - Tzuhan) Todo: 新增成員

  statusMessage = STATUS_MESSAGE.SUCCESS;

  // Info: (20250226 - Tzuhan) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(APIName.ADD_MEMBER_TO_TEAM, {
    invitedCount: body.length,
    failedEmails: [],
  });

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
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case 'PUT':
        ({ httpCode, result } = await handlePutRequest(req));
        break;
      default:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
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
