import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAssetDetails, IAssetPutInputBody } from '@/interfaces/asset';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import {
  deleteAsset,
  getLegitAssetById,
  getVouchersByAssetId,
  updateAsset,
} from '@/lib/utils/repo/asset.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { AssetDepreciationMethod } from '@/constants/asset';
import { calculateRemainingLife } from '@/lib/utils/asset';
import { parsePrismaAssetToAssetEntity } from '@/lib/utils/formatter/asset.formatter';
import { getSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction, TeamRoleCanDoKey } from '@/interfaces/permissions';

interface IHandlerResult {
  statusMessage: string;
}

interface IGetResult extends IHandlerResult {
  payload: IAssetDetails;
}

interface IDeleteResult extends IHandlerResult {
  payload: IAssetDetails;
}

interface IPutResult extends IHandlerResult {
  payload: IAssetDetails;
}

type IHandlerResultPayload =
  | IGetResult['payload']
  | IDeleteResult['payload']
  | IPutResult['payload']
  | null;

interface IHandlerResponse extends IHandlerResult {
  payload: IHandlerResultPayload;
}

const handleGetRequest: IHandleRequest<APIName.ASSET_GET_BY_ID_V2, IGetResult['payload']> = async ({
  query,
  req,
}) => {
  const { assetId, companyId } = query;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  const { teams } = await getSession(req);

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

  if (TeamRoleCanDoKey.YES_OR_NO in assertResult && !assertResult.yesOrNo) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const asset = await getLegitAssetById(assetId, companyId);
  if (!asset) {
    payload = null;
  } else {
    const vouchers = await getVouchersByAssetId(assetId);
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);
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
  }

  return { statusMessage, payload };
};

// TODO: (20241211 - Shirley) 使用 body.updateDate 更新資產相關的 voucher
const handlePutRequest: IHandleRequest<APIName.UPDATE_ASSET_V2, IPutResult['payload']> = async ({
  query,
  body,
  req,
}) => {
  const { assetId, companyId } = query;
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

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  const { teams } = await getSession(req);

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

  if (TeamRoleCanDoKey.YES_OR_NO in assertResult && !assertResult.yesOrNo) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const asset = await getLegitAssetById(assetId, companyId);
  if (!asset) {
    payload = null;
  } else {
    const vouchers = await getVouchersByAssetId(assetId);
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);

    const updatedAsset = await updateAsset(companyId, assetId, {
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
  }

  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<
  APIName.DELETE_ASSET_V2,
  IDeleteResult['payload']
> = async ({ query, req }) => {
  const { assetId, companyId } = query;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  const { teams } = await getSession(req);

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

  if (TeamRoleCanDoKey.YES_OR_NO in assertResult && !assertResult.yesOrNo) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const asset = await getLegitAssetById(assetId, companyId);

  if (!asset) {
    payload = null;
  } else {
    // TODO: (20241209 - Shirley) 確認 delete asset API 回傳資料是否需要 vouchers 跟 currencyAlias，若不需要就改 API 文件然後刪除getAccountingSettingByCompanyId, getVouchersByAssetId
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);
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
    }
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IHandlerResponse>;
} = {
  GET: (req) => withRequestValidation(APIName.ASSET_GET_BY_ID_V2, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.UPDATE_ASSET_V2, req, handlePutRequest),
  DELETE: (req) => withRequestValidation(APIName.DELETE_ASSET_V2, req, handleDeleteRequest),
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
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IHandlerResultPayload>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
