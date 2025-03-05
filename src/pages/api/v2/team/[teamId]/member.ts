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
import { addMembersToTeam } from '@/lib/utils/repo/team.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ITeamMember[]> | null = null;

  await checkSessionUser(session, APIName.LIST_MEMBER_BY_TEAM_ID, req);
  await checkUserAuthorization(APIName.LIST_MEMBER_BY_TEAM_ID, req, session);

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

  await checkSessionUser(session, APIName.ADD_MEMBER_TO_TEAM, req);
  await checkUserAuthorization(APIName.ADD_MEMBER_TO_TEAM, req, session);

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

  // Info: (20250304 - Tzuhan) 邀請成員加入團隊
  const addedReuslt = await addMembersToTeam(teamId, body);

  statusMessage = STATUS_MESSAGE.SUCCESS;

  // Info: (20250226 - Tzuhan) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.ADD_MEMBER_TO_TEAM,
    addedReuslt
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
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case 'PUT':
        ({ httpCode, result } = await handlePutRequest(req));
        break;
      default:
        ({ httpCode, result } = formatApiResponse<null>(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
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
