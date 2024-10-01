import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  IAssetDetails,
  IAssetItem,
  mockAssetItem,
  mockAssetDetails,
  ICreateAssetInput,
} from '@/interfaces/asset';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedData } from '@/interfaces/pagination';

interface IAssetListPayload extends IPaginatedData<IAssetItem[]> {}

interface IResponse {
  statusMessage: string;
  payload: IAssetListPayload | IAssetDetails | null;
}

export const MOCK_ASSET_LIST_PAYLOAD: IAssetListPayload = {
  data: [mockAssetItem],
  page: 1,
  totalPages: 1,
  totalCount: 1,
  pageSize: 10,
  hasNextPage: false,
  hasPreviousPage: false,
  sort: [
    {
      sortBy: 'acquisitionDate',
      sortOrder: 'desc',
    },
  ],
};

export async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetListPayload | null = null;

  // ToDo: (20240927 - Shirley) 從請求中獲取查詢參數
  // ToDo: (20240927 - Shirley) 從資料庫獲取資產數據
  // ToDo: (20240927 - Shirley) 將資產數據格式化為資產介面

  payload = MOCK_ASSET_LIST_PAYLOAD;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

export async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  try {
    const {
      assetName,
      assetType,
      assetNumber,
      acquisitionDate,
      purchasePrice,
      currencyAlias,
      // TODO: (20241001 - Shirley) implement API
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      amount,
      depreciationStart,
      depreciationMethod,
      usefulLife,
      note,
    } = req.body as ICreateAssetInput;

    // ToDo: (20240927 - Shirley) 驗證資產數據
    // ToDo: (20240927 - Shirley) 在資料庫中創建資產數據
    // ToDo: (20240927 - Shirley) 獲取並格式化創建後的資產數據
    payload = {
      ...mockAssetDetails,
      assetName,
      assetType,
      assetNumber,
      acquisitionDate,
      purchasePrice,
      currencyAlias,
      depreciationStart: depreciationStart || 0,
      depreciationMethod: depreciationMethod || '',
      usefulLife: usefulLife || 0,
      note,
      createdAt: getTimestampNow(),
      updatedAt: getTimestampNow(),
    };
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

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
  res: NextApiResponse<IResponseData<IAssetListPayload | IAssetDetails | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetListPayload | IAssetDetails | null = null;

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
    const { httpCode, result } = formatApiResponse<IAssetListPayload | IAssetDetails | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
