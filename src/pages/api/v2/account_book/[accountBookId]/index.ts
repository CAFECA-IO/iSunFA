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
import {
  deleteAccountBook,
  updateAccountBook,
  getAccountBookTeamId,
} from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';

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

  const { userId, teams } = session;
  const accountBookId = Number(req.query.accountBookId);
  const { action, tag } = body;

  // Info: (20250718 - Shirley) 獲取帳本所屬的團隊ID
  const teamId = await getAccountBookTeamId(accountBookId);

  if (!teamId) {
    loggerBack.warn(`Account book ${accountBookId} not found or doesn't belong to any team`);
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  // Info: (20250718 - Shirley) 從 session 中獲取用戶在團隊中的角色
  const teamInfo = teams?.find((team) => team.id === teamId);

  if (!teamInfo) {
    loggerBack.warn(
      `User ${userId} is not in the team ${teamId} that owns account book ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const teamRole = teamInfo.role as TeamRole;
  loggerBack.info(`User ${userId} with role ${teamRole} is updating account book ${accountBookId}`);

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;
  let canDo = false;

  switch (action) {
    // Info: (20250310 - Shirley) Update account book tag
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_TAG: {
      canDo = convertTeamRoleCanDo({
        teamRole,
        canDo: TeamPermissionAction.MODIFY_TAG,
      }).can;

      if (!canDo) {
        loggerBack.warn(
          `User ${userId} with role ${teamRole} doesn't have permission to update tag of account book ${accountBookId}`
        );
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }

      payload = await updateAccountBook(userId, accountBookId, { tag });
      statusMessage = STATUS_MESSAGE.SUCCESS;
      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  // Info: (20250310 - Shirley) Validate output data, will throw INVALID_OUTPUT_DATA error if invalid
  const validatedPayload = payload ? checkOutputDataValid(apiName, payload) : null;

  const response = formatApiResponse(statusMessage, validatedPayload);
  return { response, statusMessage };
};

const handleDeleteRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  await checkSessionUser(session, APIName.DELETE_ACCOUNT_BOOK, req);
  await checkUserAuthorization(APIName.DELETE_ACCOUNT_BOOK, req, session);
  const { query } = checkRequestData(APIName.DELETE_ACCOUNT_BOOK, req, session);
  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250409 - Shirley) 獲取帳本所屬的團隊ID
  const accountBookId = Number(query.accountBookId);
  const teamId = await getAccountBookTeamId(accountBookId);

  if (!teamId) {
    loggerBack.warn(`Account book ${accountBookId} not found or doesn't belong to any team`);
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  // Info: (20250409 - Shirley) 從 session 中獲取用戶在團隊中的角色
  const teamInfo = teams?.find((team) => team.id === teamId);

  if (!teamInfo) {
    loggerBack.warn(
      `User ${userId} is not in the team ${teamId} that owns account book ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const teamRole = teamInfo.role as TeamRole;

  // Info: (20250409 - Shirley) 檢查用戶是否有刪除帳本的權限
  const canDeleteResult = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.DELETE_ACCOUNT_BOOK,
  });

  loggerBack.info(`canDeleteResult: ${JSON.stringify(canDeleteResult)}`);

  if (!canDeleteResult.can) {
    loggerBack.warn(
      `User ${userId} with role ${teamRole} doesn't have permission to delete account book ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250409 - Shirley) 執行刪除帳本操作
  loggerBack.info(`User ${userId} is deleting account book ${accountBookId}`);
  const result = await deleteAccountBook(accountBookId);

  // Info: (20250409 - Shirley) 驗證刪除結果
  const { isOutputDataValid, outputData } = validateOutputData(APIName.DELETE_ACCOUNT_BOOK, result);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS;
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
