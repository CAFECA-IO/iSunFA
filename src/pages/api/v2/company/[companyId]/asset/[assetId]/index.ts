import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IDetailedAssetV2, mockDetailedAssetV2 } from '@/interfaces/asset';

interface IResponse {
  statusMessage: string;
  payload: IDetailedAssetV2 | null;
}

export async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IDetailedAssetV2 | null = null;

  // ToDo: 從請求中獲取assetId
  // const { assetId } = req.query;

  // ToDo: 從資料庫獲取指定資產的詳細信息
  // ToDo: 格式化資產數據

  // 暫時返回模擬數據
  payload = mockDetailedAssetV2;
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;

  return { statusMessage, payload };
}

export async function handlePutRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IDetailedAssetV2 | null = null;

  // ToDo: 從請求中獲取assetId和更新的資產數據
  // const { assetId } = req.query;
  // const updatedAssetData = req.body;

  // ToDo: 驗證更新的資產數據
  // ToDo: 在資料庫中更新資產數據
  // ToDo: 獲取並格式化更新後的資產數據

  // 暫時返回模擬數據
  payload = { ...mockDetailedAssetV2, note: 'Updated: Main office computer' };
  statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;

  return { statusMessage, payload };
}

export async function handleDeleteRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IDetailedAssetV2 | null = null;

  // ToDo: 從請求中獲取assetId
  // const { assetId } = req.query;

  // ToDo: 在資料庫中軟刪除資產
  // ToDo: 獲取並格式化被刪除的資產數據

  // 暫時返回模擬數據
  payload = { ...mockDetailedAssetV2, deletedAt: 2233448564 };
  statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (req: NextApiRequest) => Promise<IResponse>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IDetailedAssetV2 | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IDetailedAssetV2 | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IDetailedAssetV2 | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
