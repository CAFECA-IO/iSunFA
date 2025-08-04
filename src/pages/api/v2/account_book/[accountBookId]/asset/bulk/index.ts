import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  ICreateAssetWithVouchersRepoInput,
  ICreateAssetInput,
  IAssetBulkPostRepoOutput,
} from '@/interfaces/asset';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { createManyAssets } from '@/lib/utils/repo/asset.repo';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { getSession } from '@/lib/utils/session';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';

/**
 * Info: (20250423 - Shirley) Handle POST request for bulk creating assets
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Process and validate input data
 * 7. Create assets in bulk
 * 8. Validate output data
 * 9. Log user action and return response
 */
export const handlePostRequest = async (req: NextApiRequest) => {
  const apiName = APIName.CREATE_ASSET_BULK;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetBulkPostRepoOutput | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !query.accountBookId || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId } = query;
  const {
    assetName,
    assetType,
    assetNumber,
    acquisitionDate,
    purchasePrice,
    depreciationStart,
    depreciationMethod,
    residualValue,
    usefulLife,
    amount,
    note = '',
  } = body as ICreateAssetInput;

  loggerBack.info(
    `User ${userId} creating ${amount} assets in bulk for accountBookId: ${accountBookId}`
  );

  // Info: (20241204 - Luphia) collect the new asset data with db schema
  const newAsset: ICreateAssetWithVouchersRepoInput = {
    accountBookId,
    name: assetName,
    type: assetType,
    number: assetNumber,
    acquisitionDate,
    purchasePrice,
    accumulatedDepreciation: 0,
    residualValue,
    depreciationStart,
    depreciationMethod,
    usefulLife,
    note,
  };

  // Info: (20250411 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
  const company = await getCompanyById(accountBookId);
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
    canDo: TeamPermissionAction.BOOKKEEPING,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to create assets in bulk for accountBookId ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20241204 - Luphia) Insert the new asset and vouchers to the database and get the new asset id
  const rs = await createManyAssets(newAsset, amount, userId);

  // Info: (20250423 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, rs);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    statusMessage = STATUS_MESSAGE.CREATED;
    payload = rs;
    loggerBack.info(
      `Successfully created ${amount} assets in bulk for accountBookId ${accountBookId}`
    );
  }

  // Info: (20250423 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
};

/**
 * Info: (20250423 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAssetBulkPostRepoOutput | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<IAssetBulkPostRepoOutput | null>;

  try {
    // Info: (20250423 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.POST:
        ({ httpCode, result } = await handlePostRequest(req));
        break;
      default:
        // Info: (20250423 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250423 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    loggerBack.error(`Error processing asset bulk creation: ${statusMessage}`);
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250423 - Shirley) Send response
  res.status(httpCode).json(result);
}
