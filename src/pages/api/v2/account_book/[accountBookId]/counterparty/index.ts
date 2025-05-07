import { NextApiRequest, NextApiResponse } from 'next';
import { ICounterparty, ICounterPartyEntity } from '@/interfaces/counterparty';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import {
  createCounterparty,
  getCounterpartyByName,
  getCounterpartyByTaxId,
  listCounterparty,
} from '@/lib/utils/repo/counterparty.repo';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { getSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';

/**
 * Info: (20250502 - Shirley) Handle GET request for counterparty list
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Perform team permission check
 * 5. Fetch data from repository
 * 6. Validate output data
 * 7. Return formatted response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ICounterparty[]> | null = null;

  await checkSessionUser(session, APIName.COUNTERPARTY_LIST, req);
  await checkUserAuthorization(APIName.COUNTERPARTY_LIST, req, session);

  // Info: (20250502 - Shirley) 驗證請求資料
  const { query } = checkRequestData(APIName.COUNTERPARTY_LIST, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId, page, pageSize, type, searchQuery } = query;

  // Info: (20250502 - Shirley) 添加團隊權限檢查
  const { teams } = session;

  // Info: (20250502 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
  const accountBook = await getCompanyById(accountBookId);
  if (!accountBook) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const { teamId: companyTeamId } = accountBook;
  if (!companyTeamId) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const userTeam = teams?.find((team) => team.id === companyTeamId);
  if (!userTeam) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const assertResult = convertTeamRoleCanDo({
    teamRole: userTeam?.role as TeamRole,
    canDo: TeamPermissionAction.VIEW_COUNTERPARTY,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250502 - Shirley) 取得交易對手列表
  const counterpartyList: IPaginatedData<ICounterPartyEntity[]> = await listCounterparty(
    accountBookId,
    page,
    pageSize,
    type,
    searchQuery
  );

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  // Info: (20250502 - Shirley) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.COUNTERPARTY_LIST,
    counterpartyList
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250502 - Shirley) Handle POST request for creating a new counterparty
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Perform team permission check
 * 5. Check for duplicate counterparty
 * 6. Create new counterparty if no duplicates
 * 7. Validate output data
 * 8. Return formatted response
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterPartyEntity | null = null;

  await checkSessionUser(session, APIName.COUNTERPARTY_ADD, req);
  await checkUserAuthorization(APIName.COUNTERPARTY_ADD, req, session);

  // Info: (20250502 - Shirley) 驗證請求資料
  const { query, body } = checkRequestData(APIName.COUNTERPARTY_ADD, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId } = query;
  const { name, taxId, type, note } = body;

  // Info: (20250502 - Shirley) 添加團隊權限檢查
  const { teams } = session;

  // Info: (20250502 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
  const accountBook = await getCompanyById(accountBookId);
  if (!accountBook) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const { teamId: companyTeamId } = accountBook;
  if (!companyTeamId) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const userTeam = teams?.find((team) => team.id === companyTeamId);
  if (!userTeam) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const assertResult = convertTeamRoleCanDo({
    teamRole: userTeam?.role as TeamRole,
    canDo: TeamPermissionAction.CREATE_COUNTERPARTY,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250502 - Shirley) 檢查是否有重複的交易對手
  const originClientByName = await getCounterpartyByName({ name, companyId: accountBookId });
  const originClientByTaxId = await getCounterpartyByTaxId({ taxId, companyId: accountBookId });

  if (originClientByName) {
    statusMessage = STATUS_MESSAGE.DUPLICATE_COUNTERPARTY_NAME;
    payload = parsePrismaCounterPartyToCounterPartyEntity(originClientByName);
  } else if (originClientByTaxId) {
    statusMessage = STATUS_MESSAGE.DUPLICATE_COUNTERPARTY_TAX_ID;
    payload = parsePrismaCounterPartyToCounterPartyEntity(originClientByTaxId);
  } else {
    // Info: (20250502 - Shirley) 創建新的交易對手
    const newClient = await createCounterparty(accountBookId, name, taxId, type, note);
    if (newClient) {
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = parsePrismaCounterPartyToCounterPartyEntity(newClient);
    }
  }

  // Info: (20250502 - Shirley) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(APIName.COUNTERPARTY_ADD, payload);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData as ICounterPartyEntity;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250502 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 * 4. Log user action
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICounterparty | IPaginatedData<ICounterparty[]> | null>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.COUNTERPARTY_LIST;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.COUNTERPARTY_LIST;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.POST:
        apiName = APIName.COUNTERPARTY_ADD;
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
