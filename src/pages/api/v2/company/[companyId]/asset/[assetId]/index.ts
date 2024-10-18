import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAssetDetails, mockAssetDetails } from '@/interfaces/asset';

interface IResponse {
  statusMessage: string;
  payload: IAssetDetails | null;
}

export async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  // ToDo: (20240927 - Shirley) 從請求中獲取assetId
  // const { assetId } = req.query;

  // ToDo: (20240927 - Shirley) 從資料庫獲取指定資產的詳細信息
  // ToDo: (20240927 - Shirley) 格式化資產數據

  // 暫時返回模擬數據
  payload = mockAssetDetails;
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;

  return { statusMessage, payload };
}

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
  [key: string]: (req: NextApiRequest) => Promise<IResponse>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAssetDetails | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

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
    const { httpCode, result } = formatApiResponse<IAssetDetails | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
