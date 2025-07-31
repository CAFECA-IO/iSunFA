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
import {
  createAccountBook,
  listAccountBookByUserId,
  listSimpleAccountBookByUserId,
} from '@/lib/utils/repo/account_book.repo';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { IAccountBookEntity } from '@/lib/utils/zod_schema/account_book';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IAccountBookEntity[] | IAccountBookWithTeam[]> | null = null;

  await checkSessionUser(session, APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req);
  await checkUserAuthorization(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req, session);

  const { query } = checkRequestData(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req, session);
  loggerBack.info(`List accountBook by userId: ${userId} with query: ${JSON.stringify(query)}`);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { simple } = query;

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

  let options: IPaginatedOptions<IAccountBookEntity[] | IAccountBookWithTeam[]> | null = null;

  if (simple) {
    options = await listSimpleAccountBookByUserId(userId, query);
    loggerBack.info(
      `List simple account book by userId: ${userId} with query: ${JSON.stringify(query)}, options: ${JSON.stringify(options)}`
    );
  } else {
    options = await listAccountBookByUserId(userId, query);
  }

  // Info: (20250515 - Shirley) 根據 simple 參數選擇不同的 API 名稱來驗證輸出數據
  const apiNameForValidation = simple
    ? APIName.LIST_SIMPLE_ACCOUNT_BOOK_BY_USER_ID
    : APIName.LIST_ACCOUNT_BOOK_BY_USER_ID;

  const { isOutputDataValid, outputData } = validateOutputData(
    apiNameForValidation,
    toPaginatedData(options)
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
    loggerBack.info(
      `Successfully retrieved ${payload?.data?.length || 0} account books for user ${userId} with format: ${simple ? 'simple' : 'detailed'}`
    );
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookEntity | null = null;
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

  // Info: (20250516 - Shirley) 從請求體中提取所有必要欄位
  const {
    name,
    taxId,
    tag,
    teamId,
    fileId: fileIdFromBody,
    businessLocation, // Info: (20250606 - Shirley) 國家
    accountingCurrency, // Info: (20250606 - Shirley) 會計幣別
    representativeName,
    taxSerialNumber,
    contactPerson,
    phoneNumber,
    city,
    district,
    enteredAddress,
    filingFrequency,
    filingMethod,
    declarantFilingMethod,
    declarantName,
    declarantPersonalId,
    declarantPhoneNumber,
    agentFilingRole,
    licenseId,
  } = body;

  // Info: (20250516 - Shirley) 將所有欄位傳遞給 createAccountBook 函數
  const accountBook = await createAccountBook(userId, {
    name,
    taxId,
    tag,
    teamId,
    fileId: fileIdFromBody,
    businessLocation, // Info: (20250606 - Shirley) 國家
    accountingCurrency, // Info: (20250606 - Shirley) 會計幣別
    representativeName,
    taxSerialNumber,
    contactPerson,
    phoneNumber,
    city,
    district,
    enteredAddress,
    filingFrequency,
    filingMethod,
    declarantFilingMethod,
    declarantName,
    declarantPersonalId,
    declarantPhoneNumber,
    agentFilingRole,
    licenseId,
  });

  loggerBack.info(`Created accountBook: ${JSON.stringify(accountBook)}`);

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
    loggerBack.error(`Error in ${apiName}: ${err.message}`);
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
