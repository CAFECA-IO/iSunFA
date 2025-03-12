import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  IDeleteMemberResponse,
  IUpdateMemberBody,
  IUpdateMemberResponse,
} from '@/lib/utils/zod_schema/team';
import { getSession } from '@/lib/utils/session';
import { TeamRole } from '@/interfaces/team';
import { updateMemberById, deleteMemberById } from '@/lib/utils/repo/team.repo';
import loggerBack from '@/lib/utils/logger_back';

interface IResponse {
  statusMessage: string;
  payload: IUpdateMemberResponse | IDeleteMemberResponse | null;
}

/**
 * Info: (20250312 - Shirley) 處理 PUT 請求，更新團隊成員角色
 * 1. 檢查用戶登錄狀態
 * 2. 驗證請求數據
 * 3. 檢查用戶授權
 * 4. 更新成員角色
 * 5. 驗證輸出數據
 */
const handlePutRequest: IHandleRequest<APIName.UPDATE_MEMBER_BY_ID, IResponse['payload']> = async ({
  query,
  body,
  req,
}) => {
  try {
    // Info: (20250312 - Shirley) 1. 檢查用戶登錄狀態
    const session = await getSession(req);
    if (!session || !session.userId) {
      return { statusMessage: STATUS_MESSAGE.UNAUTHORIZED_ACCESS, payload: null };
    }

    // Info: (20250312 - Shirley) 2. 驗證請求數據
    const { teamId, memberId } = query;
    const updateData = body as IUpdateMemberBody;

    if (!teamId || !memberId || !updateData.role) {
      return { statusMessage: STATUS_MESSAGE.BAD_REQUEST, payload: null };
    }

    // Info: (20250312 - Shirley) 3. 檢查用戶授權（從 session 中獲取 teamRole）
    const teamRole = (session.teamRole as TeamRole) || TeamRole.VIEWER;

    if (teamRole !== TeamRole.OWNER && teamRole !== TeamRole.ADMIN) {
      return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
    }

    // Info: (20250312 - Shirley) 4. 更新成員角色
    const payload = await updateMemberById(
      Number(teamId),
      Number(memberId),
      updateData.role,
      teamRole
    );

    // Info: (20250312 - Shirley) 5. 驗證輸出數據
    return { statusMessage: STATUS_MESSAGE.SUCCESS_UPDATE, payload };
  } catch (error) {
    loggerBack.error(`Error updating team member: ${String(error)}`);

    if (error instanceof Error) {
      // Info: (20250312 - Shirley) 處理特定錯誤
      switch (error.message) {
        case 'PERMISSION_DENIED':
          return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
        case 'MEMBER_NOT_FOUND':
          return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
        case 'CANNOT_UPDATE_TO_OWNER':
        case 'CANNOT_UPDATE_OWNER_ROLE':
        case 'ADMIN_CANNOT_UPDATE_ADMIN_OR_OWNER':
          return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
        default:
          return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
      }
    }

    return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
  }
};

/**
 * Info: (20250312 - Shirley) 處理 DELETE 請求，刪除團隊成員（軟刪除）
 * 1. 檢查用戶登錄狀態
 * 2. 驗證請求數據
 * 3. 檢查用戶授權
 * 4. 刪除成員（軟刪除）
 * 5. 驗證輸出數據
 */
const handleDeleteRequest: IHandleRequest<
  APIName.DELETE_MEMBER_BY_ID,
  IResponse['payload']
> = async ({ query, req }) => {
  try {
    // Info: (20250312 - Shirley) 1. 檢查用戶登錄狀態
    const session = await getSession(req);
    if (!session || !session.userId) {
      return { statusMessage: STATUS_MESSAGE.UNAUTHORIZED_ACCESS, payload: null };
    }

    // Info: (20250312 - Shirley) 2. 驗證請求數據
    const { teamId, memberId } = query;

    if (!teamId || !memberId) {
      return { statusMessage: STATUS_MESSAGE.BAD_REQUEST, payload: null };
    }

    // Info: (20250312 - Shirley) 3. 檢查用戶授權（從 session 中獲取 teamRole）
    const teamRole = (session.teamRole as TeamRole) || TeamRole.VIEWER;

    if (teamRole !== TeamRole.OWNER && teamRole !== TeamRole.ADMIN) {
      return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
    }

    // Info: (20250312 - Shirley) 4. 刪除成員（軟刪除）
    const payload = await deleteMemberById(Number(teamId), Number(memberId), teamRole);

    // Info: (20250312 - Shirley) 5. 驗證輸出數據
    return { statusMessage: STATUS_MESSAGE.SUCCESS_DELETE, payload };
  } catch (error) {
    loggerBack.error(`Error deleting team member: ${String(error)}`);

    if (error instanceof Error) {
      // Info: (20250312 - Shirley) 處理特定錯誤
      switch (error.message) {
        case 'PERMISSION_DENIED':
          return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
        case 'MEMBER_NOT_FOUND':
          return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
        case 'CANNOT_DELETE_OWNER':
        case 'ADMIN_CANNOT_DELETE_ADMIN':
          return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
        default:
          return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
      }
    }

    return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
  }
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  PUT: (req) => withRequestValidation(APIName.UPDATE_MEMBER_BY_ID, req, handlePutRequest),
  DELETE: (req) => withRequestValidation(APIName.DELETE_MEMBER_BY_ID, req, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IResponse['payload'] = null;

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
    loggerBack.error(`Error in team member API: ${String(error)}`);
  } finally {
    const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
