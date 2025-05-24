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
import { IPaginatedData } from '@/interfaces/pagination';
import { getSession, updateTeamMemberSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { IInviteMemberResponse, ITeamMember, TeamRole } from '@/interfaces/team';
import {
  addMembersToTeam,
  listTeamMemberByTeamId,
  getExistingUsersInTeam,
} from '@/lib/utils/repo/team_member.repo';

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
    `User: ${userId} List members by teamId: ${teamId} with query: ${JSON.stringify(query)}`
  );

  // Info: (20250226 - Tzuhan) 取得該團隊的成員列表
  const paginatedTeamMembers = await listTeamMemberByTeamId(userId, teamId, query);

  statusMessage = STATUS_MESSAGE.SUCCESS;

  // Info: (20250226 - Tzuhan) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_MEMBER_BY_TEAM_ID,
    paginatedTeamMembers
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IInviteMemberResponse | null = null;

  await checkSessionUser(session, APIName.INVITE_MEMBER_TO_TEAM, req);
  await checkUserAuthorization(APIName.INVITE_MEMBER_TO_TEAM, req, session);

  // Info: (20250226 - Tzuhan) 驗證請求資料
  const { query, body } = checkRequestData(APIName.INVITE_MEMBER_TO_TEAM, req, session);
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
  const addedResult = await addMembersToTeam(userId, teamId, body.emails);

  // Info: (20250408 - Shirley) 更新用戶的 session 資料，添加新的團隊
  try {
    // Info: (20250531 - Shirley) 使用 repo 函數獲取已存在且被加入團隊的用戶
    const existingUserIds = await getExistingUsersInTeam(teamId, body.emails);

    await Promise.all(
      existingUserIds.map(async (userIdToUpdate) => {
        loggerBack.info({
          message: 'Updating user session after adding to team',
          userId: userIdToUpdate,
          teamId,
        });

        await updateTeamMemberSession(userIdToUpdate, teamId, TeamRole.EDITOR);

        loggerBack.info({
          message: 'Successfully updated user session after adding to team',
          userId: userIdToUpdate,
          teamId,
        });
      })
    );
  } catch (error) {
    loggerBack.warn({
      message: 'Failed to update user sessions after adding to team',
      error,
      teamId,
      emails: body.emails,
    });
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;

  // Info: (20250226 - Tzuhan) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.INVITE_MEMBER_TO_TEAM,
    addedResult
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
  let apiName: APIName = APIName.LIST_MEMBER_BY_TEAM_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.LIST_MEMBER_BY_TEAM_ID;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.PUT:
        apiName = APIName.INVITE_MEMBER_TO_TEAM;
        ({ response, statusMessage } = await handlePutRequest(req));
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
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
