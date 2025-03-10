import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import {
  checkOutputDataValid,
  checkRequestDataValid,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { IPaymentPlanSchema } from '@/lib/utils/zod_schema/payment_plan';
import { ISessionData } from '@/interfaces/session';
import { listTeamPlan } from '@/lib/utils/repo/team_plan.repo';

/**
 * Info: (20250310 - Shirley) Handle GET request
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. Check if user is logged in -> UNAUTHORIZED_ACCESS
 * 2. Check if request data is valid -> INVALID_INPUT_PARAMETER
 * 3. Check user authorization -> FORBIDDEN
 * 4. Get payment plan data
 * 5. Validate output data -> INVALID_OUTPUT_DATA
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.LIST_PAYMENT_PLAN;

  // Info: (20250310 - Shirley) Get user session
  const session = await getSession(req);

  // Info: (20250310 - Shirley) Check if user is logged in, will throw UNAUTHORIZED_ACCESS error if not logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250310 - Shirley) Validate request data, will throw INVALID_INPUT_PARAMETER error if invalid
  checkRequestDataValid(apiName, req);

  // Info: (20250310 - Shirley) Check user authorization, will throw FORBIDDEN error if not authorized
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250310 - Shirley) Get payment plans from database using repository function
  const paymentPlans = await listTeamPlan();

  // Info: (20250310 - Shirley) Validate output data, will throw INVALID_OUTPUT_DATA error if invalid
  const validatedPayload = checkOutputDataValid(apiName, paymentPlans);

  return {
    statusMessage: STATUS_MESSAGE.SUCCESS_GET,
    payload: validatedPayload,
    session,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaymentPlanSchema[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaymentPlanSchema[] | null = null;
  let session: ISessionData | null = null;
  const apiName = APIName.LIST_PAYMENT_PLAN;

  try {
    // Info: (20250310 - Shirley) Check request method
    if (req.method !== 'GET') {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    } else {
      // Info: (20250310 - Shirley) Call handleGetRequest to process GET request
      const result = await handleGetRequest(req);
      statusMessage = result.statusMessage;
      payload = result.payload;
      session = result.session;
    }
  } catch (error) {
    // Info: (20250310 - Shirley) Handle errors
    if (error instanceof Error) {
      statusMessage = error.message;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }

    // Info: (20250310 - Shirley) Log error
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });

    // Info: (20250310 - Shirley) Try to get session to log user action
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
    // Info: (20250310 - Shirley) Log user action (only for logged-in users)
    if (session) {
      const userId = session.userId || DefaultValue.USER_ID.GUEST;

      // Info: (20250310 - Shirley) Only log actions for logged-in users, not for guest users
      // Info: (20250310 - Shirley) Reference implementation in middleware.ts logUserAction
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

    // Info: (20250310 - Shirley) Format API response and return
    const { httpCode, result } = formatApiResponse<IPaymentPlanSchema[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
