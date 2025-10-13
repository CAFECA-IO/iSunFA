import { STATUS_MESSAGE } from '@/constants/status_code';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { NextApiRequest } from 'next';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { output, validateOutputData, validateRequestData } from '@/lib/utils/validator';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { APIName, APIPath } from '@/constants/api_connection';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { ISessionData } from '@/interfaces/session';
import { checkAuthorizationNew, isWhitelisted } from '@/lib/utils/auth_check_v2';
import { DefaultValue } from '@/constants/default_value';

export async function checkSessionUser(
  session: ISessionData,
  apiName: APIName,
  req: NextApiRequest
) {
  let isLogin = true;

  if (isWhitelisted(apiName, req)) {
    return true;
  }

  // Info: (20241128 - Luphia) If there is no user_id, it will be considered as a guest
  if (!session.userId || session.userId === DefaultValue.USER_ID.GUEST) {
    isLogin = false;
  }
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }

  return isLogin;
}

export async function checkUserAuthorization<T extends APIName>(
  apiName: T,
  req: NextApiRequest,
  session: ISessionData
) {
  if (isWhitelisted(apiName, req)) {
    return true;
  }

  const isAuth = await checkAuthorizationNew(apiName, req, session);
  if (!isAuth) {
    loggerError({
      userId: session.userId,
      errorType: `Forbidden Access for ${apiName} in middleware.ts`,
      errorMessage: 'User is not authorized',
    });
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  loggerBack.info(`User authorization check for ${apiName}: ${isAuth}`);
  return isAuth;
}

export function checkRequestData<T extends APIName>(
  apiName: T,
  req: NextApiRequest,
  session: ISessionData
) {
  const { query, body } = validateRequestData(apiName, req);
  // Info: (20240909 - Murky) If both query and body are null, it means validation failed
  if (query === null && body === null) {
    loggerError({
      userId: session.userId || DefaultValue.USER_ID.GUEST,
      errorType: `Invalid Input Parameter for ${apiName} in middleware.ts`,
      errorMessage: `req.body: ${JSON.stringify(req.body)}, req.query: ${JSON.stringify(req.query)}`,
    });
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  return { query, body };
}

export async function logUserAction<T extends APIName>(
  session: ISessionData,
  apiName: T,
  req: NextApiRequest,
  statusMessage: string
) {
  const userId = session.userId || DefaultValue.USER_ID.GUEST;
  const sessionId = session.isunfa;

  // Info: (20250108 - Luphia) Sometimes the user action log is not necessary
  if (userId === DefaultValue.USER_ID.GUEST && apiName !== APIName.SIGN_IN) {
    // Info: (20250108 - Luphia) Skip logging user action for guest user
    return;
  }

  try {
    const userActionLog = {
      sessionId,
      userId,
      actionType: UserActionLogActionType.API,
      actionDescription: apiName,
      ipAddress: (req.headers['x-forwarded-for'] as string) || '',
      userAgent: (req.headers['user-agent'] as string) || '',
      apiEndpoint: APIPath[apiName as keyof typeof APIPath],
      httpMethod: req.method || '',
      requestPayload: req.body || '',
      statusMessage,
    };
    await createUserActionLog(userActionLog);
  } catch (error) {
    loggerError({
      userId,
      errorType: `Failed to log user action for ${apiName} in middleware.ts`,
      errorMessage: error as Error,
    });
  }
}

/**
 * Info: (20250310 - Shirley) 驗證輸出數據是否有效
 * 如果無效，拋出 INVALID_OUTPUT_DATA 錯誤
 */
export function checkOutputDataValid<T extends APIName>(apiName: T, data: unknown) {
  const { isOutputDataValid, outputData } = validateOutputData(apiName, data);
  if (!isOutputDataValid) {
    throw new Error(STATUS_MESSAGE.INVALID_OUTPUT_DATA);
  }
  return outputData;
}

// TODO: (20241111 - Shirley) separate middleware according to different functionality
export async function withRequestValidation<T extends APIName, U>(
  apiName: T,
  req: NextApiRequest,
  handler: IHandleRequest<T, U>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: output<T> | null = null;

  const session = await getSession(req);
  const isLogin = await checkSessionUser(session, apiName, req);
  if (!isLogin) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    // Info: (20241204 - Luphia) zod validation for input data
    const { query, body } = checkRequestData(apiName, req, session);
    if (query !== null && body !== null) {
      const isAuth = await checkUserAuthorization(apiName, req, session);
      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        try {
          // Todo: (20241113 - Jacky) req in handler is for parse formdata, should be removed after refactor
          const { statusMessage: handlerStatusMessage, payload: handlerOutput } = await handler({
            query,
            body,
            session,
            req,
          });
          statusMessage = handlerStatusMessage;
          // Info: (20241204 - Luphia) zod validation for output data
          const { isOutputDataValid, outputData } = validateOutputData(apiName, handlerOutput);
          if (!isOutputDataValid) {
            statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
          } else {
            payload = outputData;
          }
        } catch (handlerError) {
          // Info: (20250115 - Shirley) 如果 API handler function 拋出錯誤，則將錯誤訊息設置為錯誤訊息，否則設置為內部服務錯誤
          if (handlerError instanceof Error) {
            statusMessage = handlerError.message;
          } else {
            statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
          }
          loggerError({
            userId: session.userId ?? DefaultValue.USER_ID.GUEST,
            errorType: `Handler Request Error for ${apiName} in middleware.ts`,
            errorMessage: handlerError as Error,
          });
        }
      }
    } else {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    }
  }
  await logUserAction(session, apiName, req, statusMessage);

  return { statusMessage, payload };
}
