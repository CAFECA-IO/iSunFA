import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountBook, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import {
  checkOutputDataValid,
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { DefaultValue } from '@/constants/default_value';
import { getSession } from '@/lib/utils/session';
import { loggerError } from '@/lib/utils/logger_back';
import { ISessionData } from '@/interfaces/session';

/**
 * Info: (20250310 - Shirley) Handle PUT request
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. Check if user is logged in -> UNAUTHORIZED_ACCESS
 * 2. Check if request data is valid -> INVALID_INPUT_PARAMETER
 * 3. Check user authorization -> FORBIDDEN
 * 4. Process account book update based on action type
 *    - UPDATE_TAG: Update account book tag
 *    - SET_TO_TOP: Set account book to top
 *    - UPDATE_VISIBILITY: Update account book visibility
 * 5. Validate output data -> INVALID_OUTPUT_DATA
 */
const handlePutRequest = async (req: NextApiRequest) => {
  const apiName = APIName.UPDATE_ACCOUNT_BOOK;

  // Info: (20250310 - Shirley) Get user session
  const session = await getSession(req);

  // Info: (20250310 - Shirley) Check if user is logged in, will throw UNAUTHORIZED_ACCESS error if not logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250310 - Shirley) Validate request data, will throw INVALID_INPUT_PARAMETER error if invalid
  const { query, body } = checkRequestData(apiName, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250310 - Shirley) Check user authorization, will throw FORBIDDEN error if not authorized
  await checkUserAuthorization(apiName, req, session);

  // TODO: (20250310 - Shirley) Process account book update based on action type
  // const { userId, teamRole, teamId } = session;
  const { userId } = session;
  const companyId = Number(req.query.accountBookId);
  const { action, tag } = body;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  switch (action) {
    // Info: (20250310 - Shirley) Update account book tag
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_TAG: {
      const admin = await getAdminByCompanyIdAndUserId(userId, companyId);
      if (admin && tag) {
        const updatedCompanyAndRole = await updateCompanyTagById(admin.id, tag);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = {
          ...updatedCompanyAndRole,
          teamId: updatedCompanyAndRole.company.teamId,
        };
      }
      break;
    }
    // Info: (20250310 - Shirley) Set account book to top
    case ACCOUNT_BOOK_UPDATE_ACTION.SET_TO_TOP: {
      const updatedCompanyAndRole = await setCompanyToTop(userId, companyId);
      if (updatedCompanyAndRole) {
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = {
          ...updatedCompanyAndRole,
          teamId: updatedCompanyAndRole.company.teamId,
        };
      }
      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  // Info: (20250310 - Shirley) Validate output data, will throw INVALID_OUTPUT_DATA error if invalid
  const validatedPayload = payload ? checkOutputDataValid(apiName, payload) : null;

  return {
    statusMessage,
    payload: validatedPayload,
    session,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBook | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;
  let session: ISessionData | null = null;
  const apiName = APIName.UPDATE_ACCOUNT_BOOK;

  try {
    // Info: (20250310 - Shirley) Check request method
    if (req.method !== 'PUT') {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    } else {
      // Info: (20250310 - Shirley) Call handlePutRequest to process PUT request
      const result = await handlePutRequest(req);
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
    const { httpCode, result } = formatApiResponse<IAccountBook | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
