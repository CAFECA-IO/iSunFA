import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  ICreateAssetWithVouchersRepoInput,
  IAssetPostOutput,
  ICreateAssetInput,
  IPaginatedAsset,
} from '@/interfaces/asset';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { createAssetWithVouchers, getAllAssetsByCompanyId } from '@/lib/utils/repo/asset.repo';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { formatPaginatedAsset } from '@/lib/utils/formatter/asset.formatter';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { DEFAULT_SORT_OPTIONS } from '@/constants/asset';
import { Prisma } from '@prisma/client';
import { parseSortOption } from '@/lib/utils/sort';

/* Info: (20241204 - Luphia) API develop SOP 以 POST ASSET API 為例
 * 1. 前置作業
 *    1. 根據 Mockup 設計 API 並撰寫 API Wiki 文件 (URI, Method, Request, Response)
 *    2. 設計 DB schema 並撰寫 DB schema 文件
 *    3. 繪製 Entity Relationship Diagram (ERD)
 *    4. 繪製 API Sequence Diagram
 * 2. Mock 階段
 *    1. 註冊 API connection (/constants/api_connection.ts, /interfaces/api_connection.ts)
 *    2. 建立 API input and output zod schema 檔案 (/lib/utils/zod_schema/asset.ts)
 *    3. 註冊 zod schema (/constants/zod_schema.ts)
 *    4. 建立獨立的 Interface 檔案，需取自 zod schema (/interfaces/asset.ts)
 *    5. 根據 URI 建立 API 檔案
 *    6. 撰寫 Mock data (/interfaces/asset.ts)
 * 3. 實際開發階段
 *    1. 註冊 Auth (src/constants/auth.ts)
 *    2. 撰寫 repo 操作 DB 的 function (src/lib/utils/repo/asset.ts)
 *    3. 撰寫 repo 單元測試 (src/lib/utils/repo_test/asset.repo.test.ts)
 *    4. 撰寫 utils 將邏輯整理成 function (src/lib/utils/asset.ts)
 *    5. 撰寫 API handler (/pages/api/v2/company/\[companyId\]/asset/index.ts)
 *    6. 設置需要使用的 middleware (整理 session, 檢查權限, 檢查輸入, 格式化輸出, 紀錄使用者行為)
 *    7. 使用 Postman 、Hoppsctoch 進行功能測試
 */

/* ToDo: (20241204 - Luphia) prepare to done
 * o 1. Check the User Permission (middleware)
 * o 2. Check the User Input (middleware)
 * o 3. Create the Asset with repo 建立 repo
 * x 4. Create the future Vouchers for asset with repo
 * o 5. Format the result (middleware)
 * o 6. Return the result (middleware)
 * o ps1. register the zod schema for the input and output (/lib/utils/zod_schema/asset.ts)
 * o ps2. register the zod schema in constant (/constants/zod_schema.ts)
 * o ps3. register the API handler interface in middleware
 * o ps4. check the main handler
 * o ps5. create repo for asset database operation, repo will throw error directly
 */

interface IHandlerResult {
  statusMessage: string;
}

interface IPostResult extends IHandlerResult {
  payload: IAssetPostOutput;
}

interface IGetResult extends IHandlerResult {
  payload: IPaginatedAsset;
}

type IHandlerResultPayload = IGetResult['payload'] | IPostResult['payload'] | null;

interface IHandlerResponse extends IHandlerResult {
  payload: IHandlerResultPayload;
}

export const handleGetRequest: IHandleRequest<
  APIName.ASSET_LIST_V2,
  IGetResult['payload']
> = async ({ query }) => {
  const {
    companyId,
    page = 1,
    pageSize,
    sortOption,
    type,
    status,
    startDate,
    endDate,
    searchQuery,
  } = query;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedAsset | null = null;

  const filterCondition: Prisma.AssetWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(startDate || endDate
      ? {
          acquisitionDate: {
            ...(startDate ? { gte: Number(startDate) } : {}),
            ...(endDate ? { lte: Number(endDate) } : {}),
          },
        }
      : {}),
  };

  // Info: (20241211 - Shirley) 將 sortOption 轉換成 prisma 的 orderBy 條件，如果 sortOption 不符合預設的格式，則使用預設的排序條件 `DEFAULT_SORT_OPTIONS`
  const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

  const assets = await getAllAssetsByCompanyId(companyId, {
    sortOption: parsedSortOption,
    filterCondition,
    searchQuery,
  });

  if (!assets) {
    payload = null;
  } else {
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);
    // Info: (20241210 - Shirley) sort assets into fit the `IAssetItem`
    const sortedAssets = assets.map((item) => {
      return {
        id: item.id,
        currencyAlias: accountingSetting?.currency || 'TWD',
        acquisitionDate: item.acquisitionDate,
        assetType: item.type,
        assetName: item.name,
        assetNumber: item.number,
        purchasePrice: item.purchasePrice,
        accumulatedDepreciation: 0,
        residualValue: 0,
        remainingLife: 0,
        assetStatus: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        deletedAt: null,
      };
    });

    const paginatedAssets = formatPaginatedAsset(sortedAssets, parsedSortOption, page, pageSize);
    payload = paginatedAssets;
  }

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
};

export const handlePostRequest: IHandleRequest<
  APIName.CREATE_ASSET_V2,
  IPostResult['payload']
> = async ({ query, body }) => {
  const { companyId } = query;
  const {
    assetName,
    assetType,
    assetNumber, // Info: (20241204 - Luphia) assetNumber is the unique identifier for the asset
    acquisitionDate,
    purchasePrice,
    depreciationStart,
    depreciationMethod,
    residualValue,
    usefulLife,
    note = '',
  } = body as ICreateAssetInput;

  // Info: (20241204 - Luphia) collect the new asset data with db schema
  const newAsset: ICreateAssetWithVouchersRepoInput = {
    companyId,
    name: assetName,
    type: assetType,
    number: assetNumber,
    acquisitionDate,
    purchasePrice,
    accumulatedDepreciation: 0,
    residualValue,
    depreciationStart,
    depreciationMethod,
    usefulLife,
    note,
  };

  // Info: (20241204 - Luphia) Insert the new asset and vouchers to the database and get the new asset id
  const rs = await createAssetWithVouchers(newAsset);

  const statusMessage = STATUS_MESSAGE.CREATED;

  // Info: (20240927 - Shirley) 獲取並格式化創建後的資產數據
  const result: IPostResult = { statusMessage, payload: rs };

  return result;
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IHandlerResponse>;
} = {
  GET: (req, res) => withRequestValidation(APIName.ASSET_LIST_V2, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.CREATE_ASSET_V2, req, res, handlePostRequest),
};

// Info: (20241204 - Luphia) API main handler, will call the middleware to handle the request
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
    // ToDo: (20241204 - Shirley) Use logger to log the error
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IHandlerResultPayload>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
