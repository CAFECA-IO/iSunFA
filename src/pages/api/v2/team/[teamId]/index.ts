import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IUpdateTeamBody, IUpdateTeamResponse } from '@/lib/utils/zod_schema/team';
import { ITeam, TeamRole } from '@/interfaces/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
  withRequestValidation,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import { getTeamByTeamId, updateTeamById } from '@/lib/utils/repo/team.repo';
import { getUserRoleInTeam } from '@/lib/utils/repo/team_member.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeam | null = null;
  await checkSessionUser(session, APIName.GET_TEAM_BY_ID, req);
  await checkUserAuthorization(APIName.GET_TEAM_BY_ID, req, session);

  const { query } = checkRequestData(APIName.GET_TEAM_BY_ID, req, session);
  if (query === null || query.teamId === undefined) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { teamId } = query;

  statusMessage = STATUS_MESSAGE.SUCCESS;

  loggerBack.info(
    `user ${userId} get Team by teamId: ${teamId} with query: ${JSON.stringify(query)}`
  );

  const team = await getTeamByTeamId(teamId, userId);
  const { isOutputDataValid, outputData } = validateOutputData(APIName.GET_TEAM_BY_ID, team);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, APIName.GET_TEAM_BY_ID, req, statusMessage);
  return result;
};

/**
 * Info: (20250325 - Shirley) 處理 PUT 請求，更新團隊資訊
 * 權限要求：
 * 1. 只有 team 的 owner 和 admin 可以執行 updateTeamByTeamId API
 * 2. 只有 owner 可以編輯銀行帳號
 */
const handlePutRequest: IHandleRequest<APIName.UPDATE_TEAM_BY_ID, IUpdateTeamResponse> = async ({
  query,
  body,
  session,
}) => {
  const { userId } = session;
  const teamIdNumber = Number(query.teamId);
  const updateData = body as IUpdateTeamBody;

  try {
    // Info: (20250325 - Shirley) 獲取用戶在團隊中的角色
    // TODO: (20250325 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
    // TODO: (20250325 - Shirley) 用 src/lib/shared/permission.ts 來判斷團隊角色權限
    const userRole = await getUserRoleInTeam(userId, teamIdNumber);

    // Info: (20250325 - Shirley) 檢查用戶是否在團隊中且為 OWNER 或 ADMIN
    if (!userRole) {
      loggerBack.warn(`User ${userId} is not in team ${teamIdNumber}`);
      return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
    }

    if (userRole !== TeamRole.OWNER && userRole !== TeamRole.ADMIN) {
      loggerBack.warn(
        `User ${userId} with role ${userRole} attempted to update team ${teamIdNumber} but only OWNER and ADMIN are allowed`
      );
      return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
    }

    // Info: (20250325 - Shirley) 如果嘗試更新銀行帳號，但用戶不是 OWNER
    if (updateData.bankInfo && userRole !== TeamRole.OWNER) {
      loggerBack.warn(
        `User ${userId} with role ${userRole} attempted to update bank info for team ${teamIdNumber} but only OWNER is allowed`
      );
      return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
    }

    // Info: (20250325 - Shirley) 更新團隊資訊
    const updatedTeam = await updateTeamById(teamIdNumber, updateData);

    if (!updatedTeam) {
      return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
    }

    loggerBack.info(
      `User ${userId} with role ${userRole} successfully updated team ${teamIdNumber}`
    );

    // Info: (20250325 - Shirley) 確保 bankInfo 不為 null，符合 IUpdateTeamResponse 類型
    const response: IUpdateTeamResponse = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      about: updatedTeam.about,
      profile: updatedTeam.profile,
      bankInfo: updatedTeam.bankInfo || { code: '', account: '' },
    };

    return {
      statusMessage: STATUS_MESSAGE.SUCCESS_UPDATE,
      payload: response,
    };
  } catch (error) {
    const err = error as Error;
    if (err.message === 'TEAM_NOT_FOUND') {
      return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
    }
    loggerBack.error(`Error updating team ${teamIdNumber} by user ${userId}: ${err.message}`);
    return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
  }
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
      case 'PUT': {
        const { statusMessage, payload } = await withRequestValidation(
          APIName.UPDATE_TEAM_BY_ID,
          req,
          handlePutRequest
        );
        ({ httpCode, result } = formatApiResponse<IUpdateTeamResponse | null>(
          statusMessage,
          payload
        ));
        break;
      }
      default:
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
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
