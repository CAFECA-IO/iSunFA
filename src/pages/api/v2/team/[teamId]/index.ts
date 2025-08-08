import { APIName, HttpMethod } from '@/constants/api_connection';
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
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import { getTeamByTeamId, updateTeamById } from '@/lib/utils/repo/team.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';

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
const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUpdateTeamResponse | null = null;

  await checkSessionUser(session, APIName.UPDATE_TEAM_BY_ID, req);
  await checkUserAuthorization(APIName.UPDATE_TEAM_BY_ID, req, session);

  const { query, body } = checkRequestData(APIName.UPDATE_TEAM_BY_ID, req, session);
  if (query === null || body === null || query.teamId === undefined) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const teamIdNumber = Number(query.teamId);
  const updateData = body as IUpdateTeamBody;

  try {
    // Info: (20250328 - Shirley) 從 session 取得用戶在團隊中的角色
    const teamInfo = teams?.find((team) => team.id === teamIdNumber);

    // Info: (20250328 - Shirley) 檢查用戶是否在團隊中
    if (!teamInfo) {
      loggerBack.warn(`User ${userId} is not in team ${teamIdNumber}`);
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    const userRole = teamInfo.role as TeamRole;

    // Info: (20250409 - Shirley) 檢查用戶是否有修改團隊資訊的權限
    let permissionDenied = false;

    // Info: (20250409 - Shirley) 檢查基本更新權限
    if (updateData.name) {
      const canModifyNameResult = convertTeamRoleCanDo({
        teamRole: userRole,
        canDo: TeamPermissionAction.MODIFY_NAME,
      });

      if (!canModifyNameResult.can) {
        loggerBack.warn(
          `User ${userId} with role ${userRole} doesn't have permission to modify team name`
        );
        permissionDenied = true;
      }
    }

    if (updateData.about) {
      const canModifyAboutResult = convertTeamRoleCanDo({
        teamRole: userRole,
        canDo: TeamPermissionAction.MODIFY_ABOUT,
      });

      if (!canModifyAboutResult.can) {
        loggerBack.warn(
          `User ${userId} with role ${userRole} doesn't have permission to modify team about`
        );
        permissionDenied = true;
      }
    }

    if (updateData.profile) {
      const canModifyProfileResult = convertTeamRoleCanDo({
        teamRole: userRole,
        canDo: TeamPermissionAction.MODIFY_PROFILE,
      });

      if (!canModifyProfileResult.can) {
        loggerBack.warn(
          `User ${userId} with role ${userRole} doesn't have permission to modify team profile`
        );
        permissionDenied = true;
      }
    }

    // Info: (20250409 - Shirley) 如果嘗試更新銀行帳號，檢查是否有銀行帳號修改權限
    if (updateData.bankInfo) {
      const canModifyBankAccountResult = convertTeamRoleCanDo({
        teamRole: userRole,
        canDo: TeamPermissionAction.MODIFY_BANK_ACCOUNT,
      });

      if (!canModifyBankAccountResult.can) {
        loggerBack.warn(
          `User ${userId} with role ${userRole} doesn't have permission to modify bank account`
        );
        permissionDenied = true;
      }
    }

    if (permissionDenied) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250325 - Shirley) 更新團隊資訊
    const updatedTeam = await updateTeamById(teamIdNumber, updateData);

    if (!updatedTeam) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    loggerBack.info(
      `User ${userId} with role ${userRole} successfully updated team ${teamIdNumber}`
    );

    // Info: (20250325 - Shirley) 確保 bankInfo 不為 null，符合 IUpdateTeamResponse 類型
    const responseData: IUpdateTeamResponse = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      about: updatedTeam.about,
      profile: updatedTeam.profile,
      bankInfo: updatedTeam.bankInfo || { code: '', account: '' },
    };

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = responseData;

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.UPDATE_TEAM_BY_ID,
      payload
    );

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      payload = null;
    } else {
      payload = outputData;
    }
  } catch (error) {
    const err = error as Error;
    if (err.message === 'TEAM_NOT_FOUND') {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    } else {
      loggerBack.error(`Error updating team ${query.teamId} by user ${userId}:`);
      loggerBack.error(error);
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  return { response: formatApiResponse(statusMessage, payload), statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.GET_TEAM_BY_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.GET_TEAM_BY_ID;
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case HttpMethod.PUT:
        apiName = APIName.UPDATE_TEAM_BY_ID;
        ({
          response: { httpCode, result },
          statusMessage,
        } = await handlePutRequest(req));
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
