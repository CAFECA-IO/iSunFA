import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { createAccountBook, listAccountBookByUserId } from '@/lib/utils/repo/account_book.repo';
import { IAccountBook, IAccountBookWithTeam } from '@/interfaces/account_book';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { createCompanySetting } from '@/lib/utils/repo/company_setting.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IAccountBookWithTeam[]> | null = null;

  await checkSessionUser(session, APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req);
  await checkUserAuthorization(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req, session);

  const { query } = checkRequestData(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req, session);
  loggerBack.info(`List accountBook by userId: ${userId} with query: ${JSON.stringify(query)}`);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  let hasAnyTeamViewPermission = false;

  if (teams && teams.length > 0) {
    hasAnyTeamViewPermission = teams.some((team) => {
      const teamRole = team.role as TeamRole;
      const canViewPublicAccountBookResult = convertTeamRoleCanDo({
        teamRole,
        canDo: TeamPermissionAction.VIEW_PUBLIC_ACCOUNT_BOOK,
      });

      if (canViewPublicAccountBookResult.can) {
        loggerBack.info(
          `User ${userId} has permission to view public account books in team ${team.id} with role ${teamRole}`
        );
        return true;
      }
      return false;
    });
  }

  if (!hasAnyTeamViewPermission) {
    loggerBack.warn(`User ${userId} doesn't have permission to view account books in any teams`);
    return {
      response: formatApiResponse(STATUS_MESSAGE.FORBIDDEN, null),
      statusMessage: STATUS_MESSAGE.FORBIDDEN,
    };
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<IAccountBookWithTeam[]> = await listAccountBookByUserId(
    userId,
    query
  );

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
    toPaginatedData(options)
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
    loggerBack.info(
      `Successfully retrieved ${payload?.data?.length || 0} account books for user ${userId}`
    );
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;
  await checkSessionUser(session, APIName.CREATE_ACCOUNT_BOOK, req);
  await checkUserAuthorization(APIName.CREATE_ACCOUNT_BOOK, req, session);

  const { query, body } = checkRequestData(APIName.CREATE_ACCOUNT_BOOK, req, session);
  loggerBack.info(
    `Create accountBook by userId: ${userId} with query: ${JSON.stringify(query)} & body: ${JSON.stringify(body)}`
  );

  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  if (query.userId !== userId) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const accountBook = await createAccountBook(userId, body);

  if (accountBook && accountBook.id) {
    loggerBack.info(`Creating company setting for account book ${accountBook.id}`);
    const companySetting = await createCompanySetting(accountBook.id);

    if (!companySetting) {
      loggerBack.warn(`Failed to create company setting for account book ${accountBook.id}`);
    } else {
      loggerBack.info(`Successfully created company setting for account book ${accountBook.id}`);
    }
  }

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.CREATE_ACCOUNT_BOOK,
    accountBook
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.LIST_ACCOUNT_BOOK_BY_USER_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.LIST_ACCOUNT_BOOK_BY_USER_ID;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.POST:
        apiName = APIName.CREATE_ACCOUNT_BOOK;
        ({ response, statusMessage } = await handlePostRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
