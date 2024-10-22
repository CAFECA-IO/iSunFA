import { STATUS_MESSAGE } from '@/constants/status_code';
import { API_ZOD_SCHEMA } from '@/constants/zod_schema';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { loggerError } from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { validateRequest } from '@/lib/utils/validator';

export async function withRequestValidation<T extends keyof typeof API_ZOD_SCHEMA, U>(
  apiName: T,
  req: NextApiRequest,
  res: NextApiResponse,
  handler: IHandleRequest<T, U>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: U | null = null;
  const session = await getSession(req, res);
  const { userId } = session;
  try {
    if (!userId) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      loggerError(
        userId,
        `Unauthorized Access for ${apiName} in middleware.ts`,
        'User ID is missing in session'
      );
    } else {
      // ToDo: (20241015 - Jacky) Add role and company check by roleId for the user
      const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
        loggerError(
          userId,
          `Forbidden Access for ${apiName} in middleware.ts`,
          'User is not authorized'
        );
      } else {
        const { query, body } = validateRequest(apiName, req, userId);
        if (query !== null && body !== null) {
          ({ statusMessage, payload } = await handler({
            query,
            body,
            session,
          }));
        } else {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
          loggerError(
            userId,
            `Validation Error for ${apiName} in middleware.ts`,
            'Query or Body is missing'
          );
        }
      }
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    loggerError(userId, `Handler Request Error for ${apiName} in middleware.ts`, error as Error);
  }
  return { statusMessage, payload };
}
