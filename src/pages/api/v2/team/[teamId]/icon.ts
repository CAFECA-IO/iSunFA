import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { ITeamWithImage, TeamRole } from '@/interfaces/team';
import { putTeamIcon } from '@/lib/utils/repo/team.repo';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';

/** Info: (20250324 - Shirley)
 * 開發步驟：
 * 1. 在 APIName enum 中添加 TEAM_PUT_ICON 類型
 * 2. 在 APIPath enum 中添加 TEAM_PUT_ICON 對應的路徑
 * 3. 在 AUTH_CHECK 中註冊 TEAM_PUT_ICON API 並設定所需的權限檢查
 * 4. 在 ZOD_SCHEMA_API 中註冊 TEAM_PUT_ICON API 的 Schema
 * 5. 創建 ITeamWithImage 介面，用於定義 team 與圖片的關聯
 * 6. 實作 putTeamIcon 函數，用於更新 team 的圖片 ID
 * 7. 使用 withRequestValidation 中間件處理授權檢查
 * 8. 實作 handlePutRequest 函數，處理 PUT 請求
 */

const handlePutRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeamWithImage | null = null;

  const session = await getSession(req);
  const { userId, teams } = session;

  await checkSessionUser(session, APIName.PUT_TEAM_ICON, req);
  await checkUserAuthorization(APIName.PUT_TEAM_ICON, req, session);

  const { query, body } = checkRequestData(APIName.PUT_TEAM_ICON, req, session);
  if (query === null || body === null || !query.teamId || !body.fileId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { teamId } = query;
  const { fileId } = body;

  try {
    const userTeam = teams?.find((team) => team.id === Number(teamId));
    if (!userTeam) {
      loggerBack.warn(`User ${userId} is not in team ${teamId}`);
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam.role as TeamRole,
      canDo: TeamPermissionAction.MODIFY_IMAGE,
    });

    if (!assertResult.can) {
      loggerBack.warn(
        `User ${userId} with role ${userTeam.role} doesn't have permission to modify team icon`
      );
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250324 - Shirley) 使用 putTeamIcon 函數更新團隊圖標
    const updatedTeam = await putTeamIcon({ teamId: Number(teamId), fileId: Number(fileId) });

    // Info: (20250324 - Shirley) 將數據轉換為 ITeamWithImage 格式
    const teamWithImage: ITeamWithImage = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      imageId: updatedTeam.imageFile?.url || '',
      createdAt: updatedTeam.createdAt,
      updatedAt: updatedTeam.updatedAt,
    };

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = teamWithImage;

    const { isOutputDataValid, outputData } = validateOutputData(APIName.PUT_TEAM_ICON, payload);

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      payload = null;
    } else {
      payload = outputData;
    }

    loggerBack.info(`User ${userId} successfully updated team icon for team ${teamId}`);
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    loggerError({
      userId,
      errorType: err.name,
      errorMessage: err.message,
    });
  }

  return { response: formatApiResponse(statusMessage, payload), statusMessage };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ITeamWithImage | null>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.PUT_TEAM_ICON;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.PUT:
        apiName = APIName.PUT_TEAM_ICON;
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
