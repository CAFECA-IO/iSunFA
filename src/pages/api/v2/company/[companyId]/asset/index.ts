import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  IAssetDetails,
  IAssetItem,
  mockAssetItem,
  IAssetEntity,
  ICreateAssetWithVouchersRepo,
} from '@/interfaces/asset';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { AssetStatus } from '@/constants/asset';

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
 * o 1. Check the User Permission (middleware)
 * o 2. Check the User Input (middleware)
 * x 3. Create the Asset with repo
 * x 4. Create the future Vouchers for asset with repo
 * o 5. Format the result (middleware)
 * o 6. Return the result (middleware)
 * o ps1. register the zod schema for the input and output (/lib/utils/zod_schema/asset.ts)
 * o ps2. register the zod schema in methodHandlers
 * x ps3. register the API handler interface in middleware
 * x ps4. check the main handler
 * x ps5. create repo for asset database operation, repo will throw error directly
 */

export async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetDetails | null = null;

  try {
    const companyId = req.query.companyId as string;
    const {
      assetName,
      assetType,
      assetNumber, // Info: (20241204 - Luphia) assetNumber is the unique identifier for the asset
      acquisitionDate,
      purchasePrice,
      // TODO: (20241001 - Shirley) implement API
      // Deprecated: (20241015 - Shirley) remove after API implementation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      amount,
      depreciationStart,
      depreciationMethod,
      residualValue,
      usefulLife,
      note,
    } = req.body;

    // Info: (20241204 - Luphia) collect the new asset data with db schema
    const newAsset: ICreateAssetWithVouchersRepo = {
      companyId: parseInt(companyId, 10),
      name: assetName,
      type: assetType,
      number: assetNumber,
      acquisitionDate,
      purchasePrice,
      accumulatedDepreciation: 0,
      residualValue,
      remainingLife: usefulLife,
      depreciationStart,
      depreciationMethod,
      usefulLife,
      note,
      relatedVouchers: [],
    };

    // Info: (20241204 - Luphia) Insert the new asset and vouchers to the database and get the new asset id
    const newAssetResult = awaitcreateAssetWithVouchers(newAsset);

    
    const newAssetId = await prisma.asset.create({
      data: newAsset,
    });

    // Info: (20240927 - Shirley) 獲取並格式化創建後的資產數據
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
  POST: (req, res) => withRequestValidation(APIName.CREATE_ASSET_V2, req, res, handlePostRequest),
};

// Info: (20241204 - Luphia) API main handler, will call the middleware to handle the request
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
    // ToDo: (20241204 - Shirley) Use logger to log the error
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
