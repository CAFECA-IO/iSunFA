import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  IAssetDetails,
  IAssetItem,
  mockAssetItem,
  ICreateAssetInput,
} from '@/interfaces/asset';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';

interface IAssetListPayload extends IPaginatedData<IAssetItem[]> {}

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

/* ToDo: (20241204 - Luphia) prepare to done
 * 1. Check the User Permission (middleware)
 * 2. Check the User Input (middleware)
 * 3. Create the Asset
 * 4. Create the future Vouchers for asset
 * 5. Format the result (middleware)
 * 6. Return the result (middleware)
 * ps1. register the zod schema for the input and output (/lib/utils/zod_schema/asset.ts)
 * ps2. register the zod schema in methodHandlers
 */

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
      // Deprecated: (20241015 - Shirley) remove after API implementation
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

    // Info: (20241204 - Luphia) Verify Input payload with zod schema
    const newAsset: ICreateAssetInput = {
      assetName,
      assetType,
      assetNumber,
      acquisitionDate,
      purchasePrice,
      currencyAlias,
      amount,
      depreciationStart,
      depreciationMethod,
      usefulLife,
      note,
    };

    // Info: (20241204 - Luphia) Insert the new asset to the database and get the new asset id
    const newAssetId = await prisma.asset.create({
      data: newAsset,
    });

    // ToDo: (20241204 - Luphia) Create the future Vouchers for asset by Murky's function

    // return the new asset details
    payload = {
      id: newAssetId.id,
      ...newAsset,
    };

    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  // ToDo: (20241204 - Luphia) Create the future Vouchers for asset by Murky's function

  return { statusMessage, payload };
}

interface IPostRespnse {
  statusMessage: string;
  payload: IAssetDetails | null;
}

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IPostRespnse>;
} = {
  GET: handleGetRequest,
  POST: (req, res) => withRequestValidation(APIName.ASSET_CREATE, req, res, handlePostRequest),
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
