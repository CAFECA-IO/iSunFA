import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountBook, WORK_TAG } from '@/interfaces/account_book';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { loggerError } from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { DefaultValue } from '@/constants/default_value';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import { ISessionData } from '@/interfaces/session';
import { createAccountBook, checkTeamAccountBookLimit } from '@/lib/utils/repo/account_book.repo';

/**
 * Info: (20250328 - Shirley) 處理 POST 請求，建立帳本
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. 檢查用戶登錄狀態 -> UNAUTHORIZED_ACCESS
 * 2. 驗證請求數據 -> INVALID_INPUT_PARAMETER
 * 3. 檢查用戶授權 -> FORBIDDEN
 * 4. 建立帳本（包含多個步驟）
 * 5. 驗證輸出數據 -> INVALID_OUTPUT_DATA
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const apiName = APIName.ACCOUNT_BOOK_CREATE;

  // Info: (20250328 - Shirley) 獲取用戶會話
  const session = await getSession(req);

  // Info: (20250328 - Shirley) 檢查用戶登錄狀態，如果未登錄則拋出 UNAUTHORIZED_ACCESS 錯誤
  await checkSessionUser(session, apiName, req);

  // Info: (20250328 - Shirley) 驗證請求數據，如果無效則拋出 INVALID_INPUT_PARAMETER 錯誤
  const { body } = checkRequestData(apiName, req, session);
  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250328 - Shirley) 檢查用戶授權，如果未授權則拋出 FORBIDDEN 錯誤
  await checkUserAuthorization(apiName, req, session);

  const { teamId, name, taxId, tag } = body;
  const { userId } = session;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  try {
    // Info: (20250328 - Shirley) Step 1. 檢查用戶在團隊中的權限
    const teamInfo = session.teams?.find((team) => team.id === teamId);

    if (!teamInfo) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { statusMessage, payload, session };
    }

    const checkResult = convertTeamRoleCanDo({
      teamRole: teamInfo.role as TeamRole,
      canDo: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
    });

    if (!('yesOrNo' in checkResult) || !checkResult.yesOrNo) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { statusMessage, payload, session };
    }

    // Info: (20250328 - Shirley) Step 2. 檢查團隊訂閱方案的帳本數量限制
    const isExceedLimit = await checkTeamAccountBookLimit(teamId);
    if (isExceedLimit) {
      statusMessage = STATUS_MESSAGE.EXCEED_PLAN_LIMIT;
      return { statusMessage, payload, session };
    }

    // Info: (20250328 - Shirley) Step 3. 使用 createAccountBook 函數創建帳本
    try {
      payload = await createAccountBook(userId, {
        name,
        taxId,
        tag: tag as WORK_TAG,
        teamId,
      });

      statusMessage = STATUS_MESSAGE.CREATED;
    } catch (error) {
      if ((error as Error).message === 'DUPLICATE_ACCOUNT_BOOK') {
        statusMessage = STATUS_MESSAGE.DUPLICATE_ACCOUNT_BOOK;
      } else if ((error as Error).message === 'ACCOUNT_BOOK_LIMIT_REACHED') {
        statusMessage = STATUS_MESSAGE.ACCOUNT_BOOK_LIMIT_REACHED;
      } else {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
      return { statusMessage, payload: null, session };
    }

    // Info: (20250328 - Shirley) 驗證輸出數據
    const validatedData = validateOutputData(apiName, payload);
    if (!validatedData.isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      payload = null;
    } else {
      payload = validatedData.outputData;
      statusMessage = STATUS_MESSAGE.CREATED;
    }
  } catch (error) {
    // Info: (20250328 - Shirley) 處理錯誤
    loggerError({
      userId: userId || DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    payload = null;
  }

  return { statusMessage, payload, session };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBook | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;
  let session: ISessionData | null = null;
  const apiName: APIName = APIName.ACCOUNT_BOOK_CREATE;

  // Info: (20250328 - Shirley) 宣告變數以避免在 case 區塊中宣告
  let postResult: {
    statusMessage: string;
    payload: IAccountBook | null;
    session: ISessionData | null;
  };

  try {
    // Info: (20250328 - Shirley) 檢查請求方法
    switch (req.method) {
      case 'POST':
        postResult = await handlePostRequest(req);
        statusMessage = postResult.statusMessage;
        payload = postResult.payload;
        session = postResult.session;
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (error) {
    // Info: (20250328 - Shirley) 處理錯誤
    if (error instanceof Error) {
      statusMessage = error.message;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }

    // Info: (20250328 - Shirley) 記錄錯誤
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });

    // Info: (20250328 - Shirley) 嘗試獲取會話以記錄用戶操作
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
    // Info: (20250328 - Shirley) 記錄用戶操作（僅針對已登錄用戶）
    if (session) {
      const userId = session.userId || DefaultValue.USER_ID.GUEST;

      // Info: (20250328 - Shirley) 僅記錄已登錄用戶的操作，不記錄訪客用戶的操作
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

    // Info: (20250328 - Shirley) 格式化 API 響應並返回
    const { httpCode, result } = formatApiResponse<IAccountBook | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
