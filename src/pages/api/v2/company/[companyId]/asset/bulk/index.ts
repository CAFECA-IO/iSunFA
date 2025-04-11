import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  ICreateAssetWithVouchersRepoInput,
  ICreateAssetInput,
  IAssetBulkPostRepoOutput,
} from '@/interfaces/asset';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { createManyAssets } from '@/lib/utils/repo/asset.repo';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { z } from 'zod';
import { IAssetBulkPostOutputValidator } from '@/lib/utils/zod_schema/asset';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

interface IHandlerResult {
  statusMessage: string;
}

interface IHandlePostRequestResult extends IHandlerResult {
  payload: z.infer<typeof IAssetBulkPostOutputValidator>;
}

type IHandlerResultPayload = IHandlePostRequestResult['payload'] | null;

interface IHandlerResponse extends IHandlerResult {
  payload: IHandlerResultPayload;
}

export const handlePostRequest: IHandleRequest<
  APIName.CREATE_ASSET_BULK,
  IAssetBulkPostRepoOutput
> = async ({ query, body, session }) => {
  const { companyId } = query;
  const { userId, teams } = session;
  const {
    assetName,
    assetType,
    assetNumber, // Info: (20241204 - Luphia) assetNumber is the unique identifier for the asset
    acquisitionDate,
    purchasePrice,
    depreciationStart,
    depreciationMethod,
    residualValue,
    usefulLife,
    amount,
    note = '',
  } = body as ICreateAssetInput;

  // Info: (20241204 - Luphia) collect the new asset data with db schema
  const newAsset: ICreateAssetWithVouchersRepoInput = {
    companyId,
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
    canDo: TeamPermissionAction.BOOKKEEPING,
  });

  if ('yesOrNo' in assertResult && !assertResult.yesOrNo) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20241204 - Luphia) Insert the new asset and vouchers to the database and get the new asset id
  const rs = await createManyAssets(newAsset, amount, userId);

  const statusMessage = STATUS_MESSAGE.CREATED;

  // // Info: (20240927 - Shirley) 獲取並格式化創建後的資產數據
  const result: IHandlePostRequestResult = { statusMessage, payload: rs };

  return result;
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IHandlerResponse>;
} = {
  POST: (req) => withRequestValidation(APIName.CREATE_ASSET_BULK, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IHandlerResultPayload>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IHandlerResultPayload = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    // ToDo: (20241204 - Shirley) Use logger to log the error
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IHandlerResultPayload>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
