import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';
import { ITeamWithImage, TeamRole } from '@/interfaces/team';
import { putTeamIcon } from '@/lib/utils/repo/team.repo';
import { TeamPermissionAction, TeamRoleCanDoKey } from '@/interfaces/permissions';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';

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

const handlePutRequest: IHandleRequest<APIName.PUT_TEAM_ICON, ITeamWithImage> = async ({
  query,
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeamWithImage | null = null;

  const { teamId } = query;
  const { fileId } = body;
  const { userId, teams } = session;

  try {
    const userTeam = teams?.find((team) => team.id === teamId);
    if (!userTeam) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }
    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam?.role as TeamRole,
      canDo: TeamPermissionAction.MODIFY_IMAGE,
    });

    if (TeamRoleCanDoKey.YES_OR_NO in assertResult && !assertResult.yesOrNo) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
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
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ITeamWithImage | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.PUT_TEAM_ICON, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ITeamWithImage | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeamWithImage | null = null;

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
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<ITeamWithImage | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
