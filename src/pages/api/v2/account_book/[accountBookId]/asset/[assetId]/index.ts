import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAssetDetails, IAssetPutInputBody } from '@/interfaces/asset';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  deleteAsset,
  getLegitAssetById,
  getVouchersByAssetId,
  updateAsset,
} from '@/lib/utils/repo/asset.repo';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { AssetDepreciationMethod } from '@/constants/asset';
import { calculateRemainingLife } from '@/lib/utils/asset';
import { parsePrismaAssetToAssetEntity } from '@/lib/utils/formatter/asset.formatter';
import { getSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
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

/**
 * Info: (20250423 - Shirley) Handle GET request for asset details
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Get asset details
 * 7. Validate output data
 * 8. Log user action and return response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.ASSET_GET_BY_ID_V2;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.assetId || !query.accountBookId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { assetId, accountBookId } = query;

  loggerBack.info(
    `User ${userId} requesting asset details for assetId: ${assetId}, accountBookId: ${accountBookId}`
  );

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
    canDo: TeamPermissionAction.VIEW_ASSET,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to view asset ${assetId} for company ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const asset = await getLegitAssetById(assetId, accountBookId);
  if (!asset) {
    payload = null;
  } else {
    const vouchers = await getVouchersByAssetId(assetId);
    const accountingSetting = await getAccountingSettingByCompanyId(accountBookId);
    const { usefulLife, depreciationMethod } = asset;
    const initAsset = parsePrismaAssetToAssetEntity(asset);
    const convertedUsefulLife =
      depreciationMethod === AssetDepreciationMethod.NONE ? Number.POSITIVE_INFINITY : usefulLife;
    // Info: (20241209 - Shirley) 計算剩餘年限
    const calRemainingLife = calculateRemainingLife(
      initAsset,
      usefulLife,
      initAsset.depreciationMethod
    );
    const remainingLife = calRemainingLife < 0 ? 0 : calRemainingLife;

    const sortedAsset: IAssetDetails = {
      id: asset.id,
      currencyAlias: accountingSetting?.currency || 'TWD',
      acquisitionDate: asset.acquisitionDate,
      assetType: asset.type,
      assetNumber: asset.number,
      assetName: asset.name,
      purchasePrice: asset.purchasePrice,
      accumulatedDepreciation: 0, // TODO: (20241209 - Shirley) 計算累計折舊
      residualValue: asset.residualValue, // TODO: (20241209 - Shirley) 計算 purchasePrice-accumulatedDepreciation
      remainingLife, // Info: (20241209 - Shirley) 即時計算剩餘年限
      assetStatus: asset.status,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      deletedAt: asset.deletedAt,
      depreciationStart: asset.depreciationStart,
      depreciationMethod: asset.depreciationMethod,
      usefulLife: convertedUsefulLife,
      relatedVouchers: vouchers,
      note: asset.note,
    };

    payload = sortedAsset;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    loggerBack.info(`Successfully retrieved asset ${assetId} for company ${accountBookId}`);
  }

  // Info: (20250423 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  }

  // Info: (20250423 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
};

/**
 * Info: (20250423 - Shirley) Handle PUT request for updating asset
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Update asset
 * 7. Validate output data
 * 8. Log user action and return response
 */
const handlePutRequest = async (req: NextApiRequest) => {
  const apiName = APIName.UPDATE_ASSET_V2;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !query.assetId || !query.accountBookId || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { assetId, accountBookId } = query;
  const {
    assetName,
    acquisitionDate,
    purchasePrice,
    depreciationStart,
    depreciationMethod,
    usefulLife,
    residualValue,
    note,
  } = body as IAssetPutInputBody;

  loggerBack.info(`User ${userId} updating asset ${assetId} for company ${accountBookId}`);

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
    canDo: TeamPermissionAction.UPDATE_ASSET,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to update asset ${assetId} for company ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const asset = await getLegitAssetById(assetId, accountBookId);
  if (!asset) {
    payload = null;
  } else {
    const vouchers = await getVouchersByAssetId(assetId);
    const accountingSetting = await getAccountingSettingByCompanyId(accountBookId);

    const updatedAsset = await updateAsset(accountBookId, assetId, {
      assetName,
      acquisitionDate,
      purchasePrice,
      depreciationStart,
      depreciationMethod,
      usefulLife,
      residualValue,
      note,
    });
    // Info: (20241211 - Shirley) 計算更新後的資產的剩餘年限
    const now = getTimestampNow();
    const { usefulLife: newUsefulLife, depreciationMethod: newDepreciationMethod } = updatedAsset;
    // Info: (20241209 - Shirley) 計算剩餘年限
    const calRemainingLife =
      newDepreciationMethod === AssetDepreciationMethod.NONE
        ? newUsefulLife
        : newUsefulLife - (now - asset.acquisitionDate);
    const remainingLife = calRemainingLife < 0 ? 0 : calRemainingLife;

    const sortedAsset: IAssetDetails = {
      id: updatedAsset.id,
      currencyAlias: accountingSetting?.currency || 'TWD',
      acquisitionDate: updatedAsset.acquisitionDate,
      assetType: updatedAsset.type,
      assetNumber: updatedAsset.number,
      assetName: updatedAsset.name,
      purchasePrice: updatedAsset.purchasePrice,
      accumulatedDepreciation: 0, // TODO: (20241209 - Shirley) 計算累計折舊
      residualValue: updatedAsset.residualValue, // TODO: (20241209 - Shirley) 計算 purchasePrice-accumulatedDepreciation
      remainingLife, // Info: (20241209 - Shirley) 即時計算剩餘年限
      assetStatus: updatedAsset.status,
      createdAt: updatedAsset.createdAt,
      updatedAt: updatedAsset.updatedAt,
      deletedAt: updatedAsset.deletedAt,
      depreciationStart: updatedAsset.depreciationStart,
      depreciationMethod: updatedAsset.depreciationMethod,
      usefulLife: updatedAsset.usefulLife,
      relatedVouchers: vouchers,
      note: updatedAsset.note,
    };

    payload = sortedAsset;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    loggerBack.info(`Successfully updated asset ${assetId} for company ${accountBookId}`);
  }

  // Info: (20250423 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  }

  // Info: (20250423 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
};

/**
 * Info: (20250423 - Shirley) Handle DELETE request for asset
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Delete asset
 * 7. Validate output data
 * 8. Log user action and return response
 */
const handleDeleteRequest = async (req: NextApiRequest) => {
  const apiName = APIName.DELETE_ASSET_V2;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.assetId || !query.accountBookId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { assetId, accountBookId } = query;

  loggerBack.info(`User ${userId} deleting asset ${assetId} for company ${accountBookId}`);

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
    canDo: TeamPermissionAction.DELETE_ASSET,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to delete asset ${assetId} for company ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const asset = await getLegitAssetById(assetId, accountBookId);

  if (!asset) {
    payload = null;
  } else {
    // TODO: (20241209 - Shirley) 確認 delete asset API 回傳資料是否需要 vouchers 跟 currencyAlias，若不需要就改 API 文件然後刪除getAccountingSettingByCompanyId, getVouchersByAssetId
    const accountingSetting = await getAccountingSettingByCompanyId(accountBookId);
    const vouchers = await getVouchersByAssetId(assetId);
    const deletedAsset = await deleteAsset(assetId);

    const sortedAsset = {
      id: deletedAsset.id,
      currencyAlias: accountingSetting?.currency || 'TWD',
      acquisitionDate: deletedAsset.acquisitionDate,
      assetType: deletedAsset.type,
      assetNumber: deletedAsset.number,
      assetName: deletedAsset.name,
      purchasePrice: deletedAsset.purchasePrice,
      accumulatedDepreciation: 0, // Info: (20241209 - Shirley) 此為即時計算的欄位
      residualValue: 0, // Info: (20241209 - Shirley) 此為即時計算的欄位
      remainingLife: 0, // Info: (20241209 - Shirley) 此為即時計算的欄位
      assetStatus: deletedAsset.status,
      createdAt: deletedAsset.createdAt,
      updatedAt: deletedAsset.updatedAt,
      depreciationStart: deletedAsset.depreciationStart,
      depreciationMethod: deletedAsset.depreciationMethod,
      usefulLife: deletedAsset.usefulLife,
      relatedVouchers: vouchers,
      note: deletedAsset.note,
      deletedAt: deletedAsset.deletedAt,
    };

    if (!deletedAsset) {
      payload = null;
    } else {
      payload = sortedAsset;
      statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
      loggerBack.info(`Successfully deleted asset ${assetId} for company ${accountBookId}`);
    }
  }

  // Info: (20250423 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
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
  res: NextApiResponse<IResponseData<IAssetDetails | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<IAssetDetails | null>;

  try {
    // Info: (20250423 - Shirley) Handle different HTTP methods
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
        // Info: (20250423 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250423 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    loggerBack.error(`Error handling asset operation: ${statusMessage}`);
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250423 - Shirley) Send response
  res.status(httpCode).json(result);
}
