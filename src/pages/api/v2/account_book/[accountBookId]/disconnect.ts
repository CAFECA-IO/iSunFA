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
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession, setSession } from '@/lib/utils/session';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { IGetAccountBookQueryParams } from '@/lib/utils/zod_schema/account_book';
import { DefaultValue } from '@/constants/default_value';
import { ISessionData } from '@/interfaces/session';
import { validateOutputData } from '@/lib/utils/validator';

interface IResponse {
  statusMessage: string;
  payload: { success: boolean } | null;
}

/**
 * Info: (20250418 - Shirley) 處理 GET 請求，中斷帳本連接
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. 檢查用戶登錄狀態 -> UNAUTHORIZED_ACCESS
 * 2. 驗證請求數據 -> INVALID_INPUT_PARAMETER
 * 3. 檢查用戶授權 -> FORBIDDEN
 * 4. 中斷帳本連接
 * 5. 驗證輸出數據 -> INVALID_OUTPUT_DATA
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.DISCONNECT_ACCOUNT_BOOK;

  // Info: (20250418 - Shirley) 獲取用戶會話
  const session = await getSession(req);

  // Info: (20250418 - Shirley) 檢查用戶登錄狀態，如果未登錄則拋出 UNAUTHORIZED_ACCESS 錯誤
  await checkSessionUser(session, apiName, req);

  // Info: (20250418 - Shirley) 驗證請求數據，如果無效則拋出 INVALID_INPUT_PARAMETER 錯誤
  const { query } = checkRequestData(apiName, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250418 - Shirley) 檢查用戶授權，如果未授權則拋出 FORBIDDEN 錯誤
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250418 - Shirley) 處理中斷帳本連接
  const { userId } = session;
  const { accountBookId } = query as IGetAccountBookQueryParams;
  const currentCompanyId = session?.accountBookId;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { success: boolean } | null = null;

  try {
    // Info: (20250418 - Shirley) 檢查用戶是否已連接帳本
    if (!currentCompanyId) {
      loggerBack.info(`用戶 ${userId} 嘗試斷開連接，但目前未連接任何帳本`);
      statusMessage = STATUS_MESSAGE.SUCCESS;
      payload = { success: true };
      return { statusMessage, payload, session };
    }

    // Info: (20250418 - Shirley) 檢查要斷開的帳本ID與當前連接的帳本ID是否一致
    if (currentCompanyId !== accountBookId) {
      loggerBack.info(
        `用戶 ${userId} 嘗試斷開連接帳本 ${accountBookId}，但當前連接的是帳本 ${currentCompanyId}`
      );
      statusMessage = STATUS_MESSAGE.CONFLICT;
      payload = null;
      return { statusMessage, payload, session };
    }

    await setSession(session, { accountBookId: undefined });

    // Info: (20250418 - Shirley) 驗證斷開連接是否成功
    const newSession = await getSession(req);
    loggerBack.info(
      `AfterDisconnect, 用戶 ${userId} 的 session data: ${JSON.stringify(newSession)}`
    );

    // Info: (20250418 - Shirley) 檢查 companyId 是否已被移除
    if (newSession?.accountBookId === undefined) {
      loggerBack.info(`用戶 ${userId} 已成功斷開與帳本 ${currentCompanyId} 的連接`);
      statusMessage = STATUS_MESSAGE.SUCCESS;
      payload = { success: true };
    } else {
      loggerBack.error(`用戶 ${userId} 斷開與帳本 ${currentCompanyId} 的連接失敗`);

      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      payload = { success: false };
    }
  } catch (error) {
    // Info: (20250418 - Shirley) 記錄錯誤
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    payload = null;

    loggerError({
      userId: userId || DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });
  }

  // Info: (20250418 - Shirley) 驗證輸出數據
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
  const apiName: APIName = APIName.DISCONNECT_ACCOUNT_BOOK;

  try {
    if (req.method === HttpMethod.GET) {
      const getResult = await handleGetRequest(req);
      statusMessage = getResult.statusMessage;
      payload = getResult.payload;
      session = getResult.session;
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  // Info: (20250418 - Shirley) 記錄用戶操作
  if (session) {
    await logUserAction(session, apiName, req, statusMessage);
  }

  // Info: (20250418 - Shirley) 返回響應
  const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
  res.status(httpCode).json(result);
}
