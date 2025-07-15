import { APIName, HttpMethod } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import AccountRetrieverFactory from '@/lib/utils/account/account_retriever_factory';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import loggerBack from '@/lib/utils/logger_back';
import { NextApiRequest, NextApiResponse } from 'next';
import { accountAPIPostUtils as postUtils } from '@/pages/api/v2/company/[companyId]/account/route_utils';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { TeamRole } from '@/interfaces/team';
import { HTTP_STATUS } from '@/constants/http';
import { getSession } from '@/lib/utils/session';
import { validateOutputData } from '@/lib/utils/validator';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';

/**
 * Info: (20250505 - Shirley) Handle GET request for account list
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Perform team permission check
 * 5. Fetch accounts
 * 6. Validate output data
 * 7. Return formatted response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedAccount | null = null;

  await checkSessionUser(session, APIName.ACCOUNT_LIST, req);
  await checkUserAuthorization(APIName.ACCOUNT_LIST, req, session);

  // Info: (20250505 - Shirley) 驗證請求資料
  const { query } = checkRequestData(APIName.ACCOUNT_LIST, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId } = query;
  const companyId = +accountBookId;

  const {
    includeDefaultAccount,
    liquidity,
    type,
    reportType,
    equityType,
    forUser,
    page,
    limit,
    sortBy,
    sortOrder,
    searchKey,
    isDeleted,
  } = query;

  loggerBack.info(
    `User: ${userId} Getting account list for companyId: ${companyId} with query: ${JSON.stringify(query)}`
  );

  // Info: (20250505 - Shirley) 權限檢查：獲取用戶在帳本所屬團隊中的角色並檢查權限
  const { teams } = session;

  // Info: (20250505 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
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
    teamRole: userTeam?.role as TeamRole,
    canDo: TeamPermissionAction.ACCOUNTING_SETTING_GET,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250505 - Shirley) 獲取帳號列表
  const accountRetriever = AccountRetrieverFactory.createRetriever({
    companyId,
    includeDefaultAccount,
    liquidity,
    type,
    reportType,
    equityType,
    forUser,
    page,
    limit,
    sortBy,
    sortOrder,
    searchKey,
    isDeleted,
  });

  const accounts = await accountRetriever.getAccounts();
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  // Info: (20250505 - Shirley) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(APIName.ACCOUNT_LIST, accounts);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250505 - Shirley) Handle POST request for creating new sub-account
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Perform team permission check
 * 5. Create new sub-account
 * 6. Validate output data
 * 7. Return formatted response
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  await checkSessionUser(session, APIName.CREATE_NEW_SUB_ACCOUNT, req);
  await checkUserAuthorization(APIName.CREATE_NEW_SUB_ACCOUNT, req, session);

  // Info: (20250505 - Shirley) 驗證請求資料
  const { query, body } = checkRequestData(APIName.CREATE_NEW_SUB_ACCOUNT, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId } = query;
  const companyId = +accountBookId;

  const { accountId, name, note } = body;

  const nowInSecond = getTimestampNow();

  // Info: (20250505 - Shirley) 權限檢查：獲取用戶在帳本所屬團隊中的角色並檢查權限
  const { teams } = session;

  // Info: (20250505 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
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
    teamRole: userTeam?.role as TeamRole,
    canDo: TeamPermissionAction.ACCOUNTING_SETTING_CREATE,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250505 - Shirley) 創建新的子帳號
  try {
    const parentAccount = await postUtils.getParentAccountFromPrisma({
      accountId,
      companyId,
    });

    const lastSubAccount = await postUtils.getLastSubAccountFromPrisma(parentAccount);
    const newCode = postUtils.getNewCode({
      parentAccount,
      latestSubAccount: lastSubAccount,
    });
    const newName = postUtils.getNewName({
      parentAccount,
      name,
    });

    const newSubAccount = await postUtils.createNewSubAccountInPrisma({
      parentAccount,
      nowInSecond,
      companyId,
      newCode,
      newName,
      note: note ?? '',
    });

    // Info: (20250505 - Shirley) 驗證輸出資料
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.CREATE_NEW_SUB_ACCOUNT,
      newSubAccount
    );

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = outputData;
    }
  } catch (error) {
    loggerBack.error({
      message: 'Error creating new sub-account',
      error,
      companyId,
      accountId,
    });
    throw error;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250505 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 * 4. Log user action
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedAccount | IAccount | null>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.ACCOUNT_LIST;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.ACCOUNT_LIST;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.POST:
        apiName = APIName.CREATE_NEW_SUB_ACCOUNT;
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
    loggerBack.error({
      userId: session.userId || -1,
      errorType: err.name,
      errorMessage: err.message,
    });
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
