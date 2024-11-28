import { STATUS_MESSAGE } from '@/constants/status_code';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { NextApiRequest, NextApiResponse } from 'next';
import { loggerError } from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { output, validateOutputData, validateRequestData } from '@/lib/utils/validator';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { APIName, APIPath } from '@/constants/api_connection';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { ISessionData } from '@/interfaces/session_data';
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

  if (!session.userId) {
    isLogin = false;
    loggerError({
      userId: 0,
      errorType: 'Unauthorized Access',
      errorMessage: 'User ID is missing in session',
    });
  }
  return isLogin;
}

async function checkUserAuthorization<T extends APIName>(
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
  }
  return isAuth;
}

export function checkRequestData<T extends APIName>(
  apiName: T,
  req: NextApiRequest,
  session: ISessionData
) {
  const { query, body } = validateRequestData(apiName, req);

  if (query === null && body === null) {
    loggerError({
      userId: session.userId || DefaultValue.USER_ID.GUEST,
      errorType: `Invalid Input Parameter for ${apiName} in middleware.ts`,
      errorMessage: req.body,
    });
  }

  return { query, body };
}

export async function logUserAction<T extends APIName>(
  session: ISessionData,
  apiName: T,
  req: NextApiRequest,
  statusMessage: string
) {
  try {
    const userActionLog = {
      sessionId: session.id || '',
      userId: session.userId || DefaultValue.USER_ID.GUEST,
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
      userId: session.userId || DefaultValue.USER_ID.GUEST,
      errorType: `Failed to log user action for ${apiName} in middleware.ts`,
      errorMessage: error as Error,
    });
  }
}

// TODO: (20241111 - Shirley) separate middleware according to different functionality
export async function withRequestValidation<T extends APIName, U>(
  apiName: T,
  req: NextApiRequest,
  res: NextApiResponse,
  handler: IHandleRequest<T, U>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: output<T> | null = null;

  const session = await getSession(req, res);
  const isLogin = await checkSessionUser(session, apiName, req);
  if (!isLogin) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
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
          const { isOutputDataValid, outputData } = validateOutputData(apiName, handlerOutput);
          if (!isOutputDataValid) {
            statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
          } else {
            payload = outputData;
          }
        } catch (handlerError) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
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
