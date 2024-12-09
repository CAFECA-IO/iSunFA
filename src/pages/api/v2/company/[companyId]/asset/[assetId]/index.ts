import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAssetDetails, mockAssetDetails } from '@/interfaces/asset';
import { IAssetDetailsValidator } from '@/lib/utils/zod_schema/asset';
import { z } from 'zod';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { getLegitAssetById, getVouchersByAssetId } from '@/lib/utils/repo/asset.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { AssetDepreciationMethod } from '@/constants/asset';

interface IHandlerResult {
  statusMessage: string;
}

interface IHandlePostRequestResult extends IHandlerResult {
  // TODO: (20241204 - Shirley) add more options to payload
  payload: z.infer<typeof IAssetDetailsValidator>;
}

type IHandlerResultPayload = IHandlePostRequestResult['payload'] | null;

interface IHandlerResponse extends IHandlerResult {
  payload: IHandlerResultPayload;
}

export const handleGetRequest: IHandleRequest<APIName.ASSET_GET_BY_ID_V2, IAssetDetails> = async ({
  query,
}) => {
  const { assetId, companyId } = query;
  let payload: IAssetDetails | null = null;

  const asset = await getLegitAssetById(assetId);
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
      remainingLife,
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
  }

  return { statusMessage: STATUS_MESSAGE.SUCCESS_GET, payload };
};

export async function handlePutRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  // ToDo: (20240927 - Shirley) 從請求中獲取assetId和更新的資產數據
  // const { assetId } = req.query;
  const updatedAssetData = req.body;

  // ToDo: (20240927 - Shirley) 驗證更新的資產數據
  // ToDo: (20240927 - Shirley) 在資料庫中更新資產數據
  // ToDo: (20240927 - Shirley) 獲取並格式化更新後的資產數據

  // 暫時返回模擬數據
  payload = { ...mockAssetDetails, ...updatedAssetData, updatedAt: getTimestampNow() };
  statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;

  return { statusMessage, payload };
}

// ToDo: (20241204 - Luphia) prepare to done
export async function handleDeleteRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  // ToDo: (20240927 - Shirley) 從請求中獲取assetId
  // const { assetId } = req.query;

  // ToDo: (20240927 - Shirley) 在資料庫中軟刪除資產
  // ToDo: (20240927 - Shirley) 獲取並格式化被刪除的資產數據

  const now = getTimestampNow();

  // 暫時返回模擬數據
  payload = { ...mockAssetDetails, deletedAt: now, updatedAt: now };
  statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IHandlerResponse>;
} = {
  GET: (req, res) => withRequestValidation(APIName.ASSET_GET_BY_ID_V2, req, res, handleGetRequest),
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
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
