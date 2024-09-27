import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  IDetailedAssetV2,
  IBriefAssetV2,
  mockBriefAssetV2,
  mockDetailedAssetV2,
} from '@/interfaces/asset';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedData } from '@/interfaces/pagination';

interface IAssetListPayload extends IPaginatedData<IBriefAssetV2[]> {}

interface IResponse {
  statusMessage: string;
  payload: IAssetListPayload | IDetailedAssetV2 | null;
}

export const MOCK_ASSET_LIST_PAYLOAD: IAssetListPayload = {
  data: [mockBriefAssetV2],
  page: 1,
  totalPages: 1,
  totalCount: 1,
  pageSize: 10,
  hasNextPage: false,
  hasPreviousPage: false,
  sort: [
    {
      sortBy: 'acquireDate',
      sortOrder: 'desc',
    },
  ],
};

// ToDo: (20240927 - Shirley) 從資料庫獲取試算表資料的邏輯
export async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetListPayload | null = null;

  // ToDo: (20240927 - Shirley) 從請求中獲取session資料
  // ToDo: (20240927 - Shirley) 檢查用戶是否有權訪問此API
  // ToDo: (20240927 - Shirley) 從資料庫獲取試算表資料的邏輯
  // ToDo: (20240927 - Shirley) 將試算表資料格式化為TrialBalanceItem介面

  // Deprecated: (20241010 - Shirley) 連接的模擬資料
  payload = MOCK_ASSET_LIST_PAYLOAD;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

export async function handlePostRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IDetailedAssetV2 | null = null;

  // ToDo: (20241010 - Shirley) 從請求中獲取資產數據
  // ToDo: (20241010 - Shirley) 驗證資產數據
  // ToDo: (20241010 - Shirley) 在資料庫中創建資產數據
  // ToDo: (20241010 - Shirley) 獲取並格式化創建後的資產數據

  // Deprecated: (20241010 - Shirley) 連接的模擬資料
  payload = mockDetailedAssetV2;
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAssetListPayload | IDetailedAssetV2 | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetListPayload | IDetailedAssetV2 | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    // ToDo: Use logger to log the error
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IAssetListPayload | IDetailedAssetV2 | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
