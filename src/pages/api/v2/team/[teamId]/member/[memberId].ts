import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import {
  IDeleteMemberResponse,
  IUpdateMemberBody,
  IUpdateMemberResponse,
} from '@/lib/utils/zod_schema/team';
import { getSession } from '@/lib/utils/session';
import { TeamRole } from '@/interfaces/team';
import { updateMemberById, deleteMemberById } from '@/lib/utils/repo/team.repo';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { ISessionData } from '@/interfaces/session';
import { validateOutputData } from '@/lib/utils/validator';

interface IResponse {
  statusMessage: string;
  payload: IUpdateMemberResponse | IDeleteMemberResponse | null;
}

/**
 * Info: (20250312 - Shirley) 處理 PUT 請求，更新團隊成員角色
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. 檢查用戶登錄狀態 -> UNAUTHORIZED_ACCESS
 * 2. 驗證請求數據 -> INVALID_INPUT_PARAMETER
 * 3. 檢查用戶授權 -> FORBIDDEN
 * 4. 更新成員角色
 * 5. 驗證輸出數據 -> INVALID_OUTPUT_DATA
 */
const handlePutRequest = async (req: NextApiRequest) => {
  const apiName = APIName.UPDATE_MEMBER;

  // Info: (20250312 - Shirley) 獲取用戶會話
  const session = await getSession(req);

  // Info: (20250312 - Shirley) 檢查用戶登錄狀態，如果未登錄則拋出 UNAUTHORIZED_ACCESS 錯誤
  await checkSessionUser(session, apiName, req);

  // Info: (20250312 - Shirley) 驗證請求數據，如果無效則拋出 INVALID_INPUT_PARAMETER 錯誤
  const { query, body } = checkRequestData(apiName, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250312 - Shirley) 檢查用戶授權，如果未授權則拋出 FORBIDDEN 錯誤
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250312 - Shirley) 處理更新成員角色
  const { userId } = session;
  const { teamId, memberId } = query;
  const updateData = body as IUpdateMemberBody;

  if (!teamId || !memberId || !updateData.role) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250312 - Shirley) 從 session 中獲取 teamRole
  const teamRole = (session.teamRole as TeamRole) || TeamRole.VIEWER;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUpdateMemberResponse | null = null;

  try {
    // Info: (20250312 - Shirley) 更新成員角色
    const updatedMember = await updateMemberById(teamId, memberId, updateData.role, teamRole);

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedMember;
  } catch (error) {
    if (error instanceof Error) {
      // Info: (20250312 - Shirley) 處理特定錯誤
      switch (error.message) {
        case 'PERMISSION_DENIED':
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
          break;
        case 'MEMBER_NOT_FOUND':
          statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
          break;
        case 'CANNOT_UPDATE_TO_OWNER':
        case 'CANNOT_UPDATE_OWNER_ROLE':
        case 'ADMIN_CANNOT_UPDATE_ADMIN_OR_OWNER':
        case 'ADMIN_CANNOT_PROMOTE_TO_ADMIN':
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
          break;
        default:
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
          break;
      }
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }

    // Info: (20250312 - Shirley) 記錄錯誤
    loggerError({
      userId: userId || DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });
  }

  // Info: (20250312 - Shirley) 驗證輸出數據
  const validatedPayload = payload ? validateOutputData(apiName, payload).outputData : null;

  return {
    statusMessage,
    payload: validatedPayload,
    session,
  };
};

/**
 * Info: (20250312 - Shirley) 處理 DELETE 請求，刪除團隊成員（軟刪除）
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. 檢查用戶登錄狀態 -> UNAUTHORIZED_ACCESS
 * 2. 驗證請求數據 -> INVALID_INPUT_PARAMETER
 * 3. 檢查用戶授權 -> FORBIDDEN
 * 4. 刪除成員（軟刪除）
 * 5. 驗證輸出數據 -> INVALID_OUTPUT_DATA
 */
const handleDeleteRequest = async (req: NextApiRequest) => {
  const apiName = APIName.DELETE_MEMBER;

  // Info: (20250312 - Shirley) 獲取用戶會話
  const session = await getSession(req);

  // Info: (20250312 - Shirley) 檢查用戶登錄狀態，如果未登錄則拋出 UNAUTHORIZED_ACCESS 錯誤
  await checkSessionUser(session, apiName, req);

  // Info: (20250312 - Shirley) 驗證請求數據，如果無效則拋出 INVALID_INPUT_PARAMETER 錯誤
  const { query } = checkRequestData(apiName, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250312 - Shirley) 檢查用戶授權，如果未授權則拋出 FORBIDDEN 錯誤
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250312 - Shirley) 處理刪除成員
  const { userId } = session;
  const { teamId, memberId } = query;

  if (!teamId || !memberId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250312 - Shirley) 從 session 中獲取 teamRole
  const teamRole = (session.teamRole as TeamRole) || TeamRole.VIEWER;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IDeleteMemberResponse | null = null;

  try {
    // Info: (20250312 - Shirley) 刪除成員（軟刪除）
    const deletedMember = await deleteMemberById(teamId, memberId, teamRole);

    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = deletedMember;
  } catch (error) {
    if (error instanceof Error) {
      // Info: (20250312 - Shirley) 處理特定錯誤
      switch (error.message) {
        case 'PERMISSION_DENIED':
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
          break;
        case 'MEMBER_NOT_FOUND':
          statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
          break;
        case 'CANNOT_DELETE_OWNER':
        case 'ADMIN_CANNOT_DELETE_ADMIN':
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
          break;
        default:
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
          break;
      }
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }

    // Info: (20250312 - Shirley) 記錄錯誤
    loggerError({
      userId: userId || DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });
  }

  // Info: (20250312 - Shirley) 驗證輸出數據
  const validatedPayload = payload ? validateOutputData(apiName, payload).outputData : null;

  return {
    statusMessage,
    payload: validatedPayload,
    session,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IResponse['payload'] = null;
  let session: ISessionData | null = null;
  let apiName: APIName = APIName.UPDATE_MEMBER;

  // Info: (20250312 - Shirley) 宣告變數以避免在 case 區塊中宣告
  let putResult: {
    statusMessage: string;
    payload: IResponse['payload'];
    session: ISessionData | null;
  };
  let deleteResult: {
    statusMessage: string;
    payload: IResponse['payload'];
    session: ISessionData | null;
  };

  try {
    // Info: (20250312 - Shirley) 檢查請求方法
    switch (req.method) {
      case 'PUT':
        apiName = APIName.UPDATE_MEMBER;
        putResult = await handlePutRequest(req);
        statusMessage = putResult.statusMessage;
        payload = putResult.payload;
        session = putResult.session;
        break;
      case 'DELETE':
        apiName = APIName.DELETE_MEMBER;
        deleteResult = await handleDeleteRequest(req);
        statusMessage = deleteResult.statusMessage;
        payload = deleteResult.payload;
        session = deleteResult.session;
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (error) {
    // Info: (20250312 - Shirley) 處理錯誤
    if (error instanceof Error) {
      statusMessage = error.message;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }

    // Info: (20250312 - Shirley) 記錄錯誤
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });

    // Info: (20250312 - Shirley) 嘗試獲取會話以記錄用戶操作
    if (!session) {
      try {
        session = await getSession(req);
      } catch (sessionError) {
        loggerError({
          userId: DefaultValue.USER_ID.GUEST,
          errorType: `Failed to get session in ${apiName}`,
          errorMessage: sessionError as Error,
        });
      }
    }
  } finally {
    // Info: (20250312 - Shirley) 記錄用戶操作（僅針對已登錄用戶）
    if (session) {
      const userId = session.userId || DefaultValue.USER_ID.GUEST;

      // Info: (20250312 - Shirley) 僅記錄已登錄用戶的操作，不記錄訪客用戶的操作
      if (userId !== DefaultValue.USER_ID.GUEST) {
        try {
          await logUserAction(session, apiName, req, statusMessage);
        } catch (logError) {
          loggerError({
            userId,
            errorType: `Failed to log user action in ${apiName}`,
            errorMessage: logError as Error,
          });
        }
      }
    }

    // Info: (20250312 - Shirley) 格式化 API 響應並返回
    const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
