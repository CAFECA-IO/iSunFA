import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
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
import { getSession } from '@/lib/utils/session';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import { deleteAccountBook, updateAccountBook } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { getUserRoleInTeam } from '@/lib/utils/repo/team_member.repo';
import { ITeamRoleCanDo, TeamPermissionAction } from '@/interfaces/permissions';

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
  const accountBookId = Number(req.query.accountBookId);
  const { action, tag } = body;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;
  const teamRole = await getUserRoleInTeam(userId, query.accountBookId);

  if (!teamRole) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  let canDo = false;

  switch (action) {
    // Info: (20250310 - Shirley) Update account book tag
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_TAG: {
      canDo = (
        convertTeamRoleCanDo({
          teamRole,
          canDo: TeamPermissionAction.MODIFY_TAG,
        }) as ITeamRoleCanDo
      ).yesOrNo;
      payload = await updateAccountBook(userId, accountBookId, { tag });

      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  if (!canDo) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250310 - Shirley) Validate output data, will throw INVALID_OUTPUT_DATA error if invalid
  const validatedPayload = payload ? checkOutputDataValid(apiName, payload) : null;

  const response = formatApiResponse(statusMessage, validatedPayload);
  return { response, statusMessage };
};

const handleDeleteRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  await checkSessionUser(session, APIName.DELETE_ACCOUNT_BOOK, req);
  await checkUserAuthorization(APIName.DELETE_ACCOUNT_BOOK, req, session);
  const { query } = checkRequestData(APIName.DELETE_ACCOUNT_BOOK, req, session);
  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const teamRole = await getUserRoleInTeam(userId, query.accountBookId);

  if (!teamRole) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const canDo = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.DELETE_ACCOUNT_BOOK,
  }) as ITeamRoleCanDo;

  if (!canDo || canDo.yesOrNo === false) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const result = await deleteAccountBook(query.accountBookId);
  const { isOutputDataValid, outputData } = validateOutputData(APIName.DELETE_ACCOUNT_BOOK, result);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let name = APIName.UPDATE_ACCOUNT_BOOK;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);
  try {
    switch (method) {
      case 'PUT':
        name = APIName.UPDATE_ACCOUNT_BOOK;
        ({ response, statusMessage } = await handlePutRequest(req));
        ({ httpCode, result } = response);
        break;
      case 'DELETE':
        name = APIName.DELETE_ACCOUNT_BOOK;
        ({ response, statusMessage } = await handleDeleteRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    loggerBack.info(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE];
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, name, req, statusMessage);

  res.status(httpCode).json(result);
}
