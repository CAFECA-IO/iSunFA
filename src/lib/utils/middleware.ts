import { STATUS_MESSAGE } from '@/constants/status_code';
import { ZOD_SCHEMA_API } from '@/constants/zod_schema';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { loggerError } from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { output, validateOutputData, validateRequestData } from '@/lib/utils/validator';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { APIPath } from '@/constants/api_connection';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { ISessionData } from '@/interfaces/session_data';
import { AUTH_CHECK } from '@/constants/auth';

async function checkSessionUser(session: ISessionData) {
  let isLogin = true;
  if (!session.userId) {
    isLogin = false;
    loggerError(0, 'Unauthorized Access', 'User ID is missing in session');
  }
  return isLogin;
}

async function checkUserAuthorization<T extends keyof typeof AUTH_CHECK>(
  apiName: T,
  req: NextApiRequest,
  session: ISessionData
) {
  const isAuth = await checkAuthorization(apiName, req, session);
  if (!isAuth) {
    loggerError(
      session.userId,
      `Forbidden Access for ${apiName} in middleware.ts`,
      'User is not authorized'
    );
  }
  return isAuth;
}

function checkRequestData<T extends keyof typeof ZOD_SCHEMA_API>(apiName: T, req: NextApiRequest) {
  const { query, body } = validateRequestData(apiName, req);

  if (query === null && body === null) {
    loggerError(0, `Invalid Input Parameter for ${apiName} in middleware.ts`, req.body);
  }

  return { query, body };
}

async function logUserAction<T extends keyof typeof ZOD_SCHEMA_API>(
  session: ISessionData,
  apiName: T,
  req: NextApiRequest,
  statusMessage: string
) {
  await createUserActionLog({
    sessionId: session.id,
    userId: session.userId || 555,
    actionType: UserActionLogActionType.API,
    actionDescription: apiName,
    ipAddress: req.headers['x-forwarded-for'] as string,
    userAgent: req.headers['user-agent'] as string,
    apiEndpoint: APIPath[apiName],
    httpMethod: req.method || '',
    requestPayload: req.body,
    statusMessage,
  });
}

export async function withRequestValidation<T extends keyof typeof ZOD_SCHEMA_API, U>(
  apiName: T,
  req: NextApiRequest,
  res: NextApiResponse,
  handler: IHandleRequest<T, U>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: output<T> | null = null;

  const session = await getSession(req, res);
  const isLogin = await checkSessionUser(session);
  if (!isLogin) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const { query, body } = checkRequestData(apiName, req);
    if (query !== null && body !== null) {
      const isAuth = await checkUserAuthorization(apiName, req, session);
      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        try {
          const { statusMessage: handlerStatusMessage, payload: handlerOutput } = await handler({
            query,
            body,
            session,
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
          loggerError(
            session.userId,
            `Handler Request Error for ${apiName} in middleware.ts`,
            handlerError as Error
          );
        }
      }
    } else {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    }
  }

  await logUserAction(session, apiName, req, statusMessage);

  return { statusMessage, payload };
}
