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

export const handleGetRequest: IHandleRequest<
  APIName.ASSET_GET_BY_ID_V2,
  IGetResult['payload']
> = async ({ query }) => {
  const { assetId, companyId } = query;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  const asset = await getLegitAssetById(assetId, companyId);
  if (!asset) {
    payload = null;
  } else {
    const vouchers = await getVouchersByAssetId(assetId);
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);
    const now = getTimestampNow();
    const { usefulLife, depreciationMethod } = asset;
    // Info: (20241209 - Shirley) 計算剩餘年限
    const calRemainingLife =
      depreciationMethod === AssetDepreciationMethod.NONE
        ? usefulLife
        : usefulLife - (now - asset.acquisitionDate);
    const remainingLife = calRemainingLife < 0 ? 0 : calRemainingLife;

    const sortedAsset: IAssetDetails = {
      id: asset.id,
      currencyAlias: accountingSetting?.currency || 'TWD',
      acquisitionDate: asset.acquisitionDate,
      assetType: asset.type,
      assetNumber: asset.number,
      assetName: asset.name,
      purchasePrice: asset.purchasePrice,
      accumulatedDepreciation: asset.accumulatedDepreciation, // TODO: (20241209 - Shirley) 計算累計折舊
      residualValue: asset.residualValue, // TODO: (20241209 - Shirley) 計算 purchasePrice-accumulatedDepreciation
      remainingLife, // Info: (20241209 - Shirley) 即時計算剩餘年限
      assetStatus: asset.status,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      deletedAt: asset.deletedAt,
      depreciationStart: asset.depreciationStart,
      depreciationMethod: asset.depreciationMethod,
      usefulLife: asset.usefulLife,
      relatedVouchers: vouchers,
      note: asset.note,
    };

    payload = sortedAsset;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  }

  return { statusMessage, payload };
};

// TODO: (20241211 - Shirley) 使用 body.updateDate 更新資產相關的 voucher
export const handlePutRequest: IHandleRequest<
  APIName.UPDATE_ASSET_V2,
  IPutResult['payload']
> = async ({ query, body }) => {
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
      accumulatedDepreciation: updatedAsset.accumulatedDepreciation, // TODO: (20241209 - Shirley) 計算累計折舊
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

export const handleDeleteRequest: IHandleRequest<
  APIName.DELETE_ASSET_V2,
  IDeleteResult['payload']
> = async ({ query }) => {
  const { assetId, companyId } = query;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  const asset = await getLegitAssetById(assetId, companyId);

  if (!asset) {
    payload = null;
  } else {
    // TODO: (20241209 - Shirley) 確認 delete asset API 回傳資料是否需要 vouchers 跟 currencyAlias，若不需要就改 API 文件然後刪除getAccountingSettingByCompanyId, getVouchersByAssetId
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);
    const vouchers = await getVouchersByAssetId(assetId);
    const sortedAsset = {
      id: asset.id,
      currencyAlias: accountingSetting?.currency || 'TWD',
      acquisitionDate: asset.acquisitionDate,
      assetType: asset.type,
      assetNumber: asset.number,
      assetName: asset.name,
      purchasePrice: asset.purchasePrice,
      accumulatedDepreciation: 0, // Info: (20241209 - Shirley) 此為即時計算的欄位
      residualValue: 0, // Info: (20241209 - Shirley) 此為即時計算的欄位
      remainingLife: 0, // Info: (20241209 - Shirley) 此為即時計算的欄位
      assetStatus: asset.status,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      depreciationStart: asset.depreciationStart,
      depreciationMethod: asset.depreciationMethod,
      usefulLife: asset.usefulLife,
      relatedVouchers: vouchers,
      note: asset.note,
      deletedAt: asset.deletedAt,
    };
    const deletedAsset = await deleteAsset(assetId);

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
  GET: (req, res) => withRequestValidation(APIName.ASSET_GET_BY_ID_V2, req, res, handleGetRequest),
  PUT: (req, res) => withRequestValidation(APIName.UPDATE_ASSET_V2, req, res, handlePutRequest),
  DELETE: (req, res) =>
    withRequestValidation(APIName.DELETE_ASSET_V2, req, res, handleDeleteRequest),
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
