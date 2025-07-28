import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric } from '@/lib/utils/common';
import { formatAccount } from '@/lib/utils/formatter/account.formatter';
import {
  findFirstAccountInPrisma,
  updateAccountInPrisma,
  softDeleteAccountInPrisma,
} from '@/lib/utils/repo/account.repo';
import { getSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';
import { APIName, HttpMethod } from '@/constants/api_connection';

function formatParams(companyId: unknown, accountId: string | string[] | undefined) {
  const isCompanyIdValid = !Number.isNaN(Number(companyId));
  const isAccountIdValid = isParamNumeric(accountId);

  if (!(isCompanyIdValid && isAccountIdValid)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const companyIdNumber = Number(companyId);
  const accountIdNumber = Number(accountId);
  return {
    companyIdNumber,
    accountIdNumber,
  };
}

/**
 * Info: (20250425 - Shirley) Handle GET request for account details
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Get account details
 * 7. Validate output data
 * 8. Log user action and return response
 */
async function handleGetRequest(req: NextApiRequest) {
  const apiName = APIName.ACCOUNT_GET_BY_ID;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  // Info: (20250425 - Shirley) Get user session
  const session = await getSession(req);
  const { teams } = session;

  // Info: (20250425 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250425 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250425 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.accountId || !query.accountBookId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountId, accountBookId } = query;

  // Info: (20250425 - Shirley) Format and validate parameters
  const { accountIdNumber, companyIdNumber: accountBookIdNumber } = formatParams(
    accountBookId,
    accountId?.toString()
  );

  // Info: (20250425 - Shirley) Check company and team permissions
  const accountBook = await getCompanyById(accountBookIdNumber);
  if (!accountBook) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const { teamId: accountBookTeamId } = accountBook;
  if (!accountBookTeamId) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const userTeam = teams?.find((team) => team.id === accountBookTeamId);
  if (!userTeam) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const assertResult = convertTeamRoleCanDo({
    teamRole: userTeam.role as TeamRole,
    canDo: TeamPermissionAction.ACCOUNTING_SETTING_GET,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250425 - Shirley) Get account details
  const accountFromDb = await findFirstAccountInPrisma(accountIdNumber, accountBookIdNumber);
  if (!accountFromDb) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const account = formatAccount(accountFromDb);
  statusMessage = STATUS_MESSAGE.SUCCESS;
  payload = account;

  // Info: (20250425 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  }

  // Info: (20250425 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
}

/**
 * Info: (20250425 - Shirley) Handle PUT request for updating account
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Update account
 * 7. Validate output data
 * 8. Log user action and return response
 */
async function handlePutRequest(req: NextApiRequest) {
  const apiName = APIName.UPDATE_ACCOUNT_INFO_BY_ID;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  // Info: (20250425 - Shirley) Get user session
  const session = await getSession(req);
  const { teams } = session;

  // Info: (20250425 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250425 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250425 - Shirley) Validate request data
  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !query.accountId || !query.accountBookId || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountId, accountBookId: companyId } = query;
  const { name, note } = body;

  // Info: (20250425 - Shirley) Format and validate parameters
  const { accountIdNumber, companyIdNumber } = formatParams(companyId, accountId?.toString());

  // Info: (20250425 - Shirley) Check company and team permissions
  const company = await getCompanyById(companyIdNumber);
  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const { teamId: companyTeamId } = company;
  if (!companyTeamId) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const userTeam = teams?.find((team) => team.id === companyTeamId);
  if (!userTeam) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250425 - Shirley) 檢查用戶是否有 ACCOUNTING_SETTING 權限
  const permissionResult = convertTeamRoleCanDo({
    teamRole: userTeam.role as TeamRole,
    canDo: TeamPermissionAction.ACCOUNTING_SETTING_UPDATE,
  });

  if (!permissionResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250425 - Shirley) Update account
  const currentAccount = await findFirstAccountInPrisma(accountIdNumber, companyIdNumber);
  if (!currentAccount) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const updatedAccount = await updateAccountInPrisma(
    accountIdNumber,
    companyIdNumber,
    name !== undefined ? name : currentAccount.name,
    note || ''
  );

  if (!updatedAccount) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  const account = formatAccount(updatedAccount);
  statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  payload = account;

  // Info: (20250425 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  }

  // Info: (20250425 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
}

/**
 * Info: (20250425 - Shirley) Handle DELETE request for account
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Delete account
 * 7. Validate output data
 * 8. Log user action and return response
 */
async function handleDeleteRequest(req: NextApiRequest) {
  const apiName = APIName.DELETE_ACCOUNT_BY_ID;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  // Info: (20250425 - Shirley) Get user session
  const session = await getSession(req);
  const { teams } = session;

  // Info: (20250425 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250425 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250425 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.accountId || !query.accountBookId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountId, accountBookId } = query;

  // Info: (20250425 - Shirley) Format and validate parameters
  const { accountIdNumber, companyIdNumber } = formatParams(accountBookId, accountId?.toString());

  // Info: (20250425 - Shirley) Check company and team permissions
  const company = await getCompanyById(companyIdNumber);
  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const { teamId: companyTeamId } = company;
  if (!companyTeamId) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const userTeam = teams?.find((team) => team.id === companyTeamId);
  if (!userTeam) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250425 - Shirley) 檢查用戶是否有 ACCOUNTING_SETTING 權限
  const permissionResult = convertTeamRoleCanDo({
    teamRole: userTeam.role as TeamRole,
    canDo: TeamPermissionAction.ACCOUNTING_SETTING_DELETE,
  });

  if (!permissionResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250425 - Shirley) Delete account
  const deletedAccount = await softDeleteAccountInPrisma(accountIdNumber, companyIdNumber);

  if (!deletedAccount) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  const account = formatAccount(deletedAccount);
  statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
  payload = account;

  // Info: (20250425 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  }

  // Info: (20250425 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
}

/**
 * Info: (20250425 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<IAccount | null>;

  try {
    // Info: (20250425 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case HttpMethod.PUT:
        ({ httpCode, result } = await handlePutRequest(req));
        break;
      case HttpMethod.DELETE:
        ({ httpCode, result } = await handleDeleteRequest(req));
        break;
      default:
        // Info: (20250425 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250425 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    loggerBack.error(`Error handling account operation: ${statusMessage}`);
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250425 - Shirley) Send response
  res.status(httpCode).json(result);
}
