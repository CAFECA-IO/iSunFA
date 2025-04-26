import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import {
  createAccountingSetting,
  getAccountingSettingByCompanyId,
  updateAccountingSettingById,
} from '@/lib/utils/repo/accounting_setting.repo';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { formatAccountingSetting } from '@/lib/utils/formatter/accounting_setting.formatter';
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
import { getSession } from '@/lib/utils/session';
import { validateOutputData } from '@/lib/utils/validator';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';

/**
 * Info: (20250424 - Shirley) Handle GET request for accounting settings
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Get accounting settings
 * 7. Validate output data
 * 8. Log user action and return response
 */
async function handleGetRequest(req: NextApiRequest) {
  const apiName = APIName.ACCOUNTING_SETTING_GET;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

  // Info: (20250424 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250424 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250424 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250424 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.companyId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { companyId } = query;

  loggerBack.info(`User ${userId} requesting accounting settings for companyId: ${companyId}`);

  // Info: (20250424 - Shirley) Check company and team permissions
  const company = await getCompanyById(companyId);
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

  const assertResult = convertTeamRoleCanDo({
    teamRole: userTeam.role as TeamRole,
    canDo: TeamPermissionAction.ACCOUNTING_SETTING,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to view accounting settings for company ${companyId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250424 - Shirley) Get accounting settings
  const accountingSetting = await getAccountingSettingByCompanyId(companyId);
  if (accountingSetting) {
    payload = formatAccountingSetting(accountingSetting);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } else {
    const createdAccountingSetting = await createAccountingSetting(companyId);
    if (createdAccountingSetting) {
      payload = formatAccountingSetting(createdAccountingSetting);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  loggerBack.info(`Successfully retrieved accounting settings for company ${companyId}`);

  // Info: (20250424 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  }

  // Info: (20250424 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
}

/**
 * Info: (20250424 - Shirley) Handle PUT request for updating accounting settings
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Update accounting settings
 * 7. Validate output data
 * 8. Log user action and return response
 */
async function handlePutRequest(req: NextApiRequest) {
  const apiName = APIName.ACCOUNTING_SETTING_UPDATE;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

  // Info: (20250424 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250424 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250424 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250424 - Shirley) Validate request data
  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !query.companyId || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { companyId } = query;
  const accountingSetting = body;

  loggerBack.info(`User ${userId} updating accounting settings for companyId: ${companyId}`, {
    accountingSettingId: accountingSetting.id,
  });

  // Info: (20250424 - Shirley) Check company and team permissions
  const company = await getCompanyById(companyId);
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

  const assertResult = convertTeamRoleCanDo({
    teamRole: userTeam.role as TeamRole,
    canDo: TeamPermissionAction.ACCOUNTING_SETTING,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to update accounting settings for company ${companyId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250424 - Shirley) First check if the accounting setting exists
  try {
    // Info: (20250424 - Shirley) Check if the accounting setting exists before updating
    const existingAccountingSetting = await getAccountingSettingByCompanyId(companyId);

    if (!existingAccountingSetting) {
      loggerBack.error(`Accounting setting not found for company ${companyId}`);
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    loggerBack.info(`Found existing accounting setting for company ${companyId}`, {
      existingId: existingAccountingSetting.id,
      requestedId: accountingSetting.id,
      deletedAt: existingAccountingSetting.deletedAt,
    });

    // Info: (20250424 - Shirley) Make sure we're using the correct ID from the database
    if (existingAccountingSetting.id !== accountingSetting.id) {
      loggerBack.warn(
        `ID mismatch: database has ${existingAccountingSetting.id} but request has ${accountingSetting.id}. Using database ID.`
      );
      accountingSetting.id = existingAccountingSetting.id;
    }

    // Info: (20250424 - Shirley) Update accounting settings
    const updatedAccountingSetting = await updateAccountingSettingById(
      companyId,
      accountingSetting
    );

    if (updatedAccountingSetting) {
      payload = formatAccountingSetting(updatedAccountingSetting);
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      loggerBack.info(`Successfully updated accounting settings for company ${companyId}`);

      // Info: (20250424 - Shirley) Only validate output data when we have valid payload
      const { isOutputDataValid } = validateOutputData(apiName, payload);
      if (!isOutputDataValid) {
        loggerBack.error(`Invalid output data format for company ${companyId}`, { payload });
        statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
        payload = null;
      }
    } else {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      loggerBack.error(
        `Failed to update accounting settings - resource not found for company ${companyId}`
      );
    }
  } catch (error) {
    loggerBack.error(`Failed to update accounting settings for company ${companyId}`, {
      error,
      errorMessage: (error as Error).message,
      accountingSettingId: accountingSetting.id,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  // Info: (20250424 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
}

/**
 * Info: (20250424 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountingSetting | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<IAccountingSetting | null>;

  try {
    // Info: (20250424 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case HttpMethod.PUT:
        ({ httpCode, result } = await handlePutRequest(req));
        break;
      default:
        // Info: (20250424 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250424 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    loggerBack.error(`Error handling accounting settings operation: ${statusMessage}`);
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250424 - Shirley) Send response
  res.status(httpCode).json(result);
}
