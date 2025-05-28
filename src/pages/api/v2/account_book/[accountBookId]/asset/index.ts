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
import { APIName, HttpMethod } from '@/constants/api_connection';
import { createAssetWithVouchers, listAssetsByCompanyId } from '@/lib/utils/repo/asset.repo';
import {
  formatPaginatedAsset,
  parsePrismaAssetToAssetEntity,
} from '@/lib/utils/formatter/asset.formatter';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { DEFAULT_SORT_OPTIONS } from '@/constants/asset';
import { Prisma } from '@prisma/client';
import { parseSortOption } from '@/lib/utils/sort';
import { calculateRemainingLife } from '@/lib/utils/asset';
import { SortBy, SortOrder } from '@/constants/sort';
import { getSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';

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

/**
 * Info: (20250423 - Shirley) Handle GET request for asset list
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Get and process asset list data
 * 7. Validate output data
 * 8. Log user action and return response
 */
export const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.ASSET_LIST_V2;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedAsset | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.accountBookId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const {
    accountBookId,
    page = 1,
    pageSize,
    sortOption,
    type,
    status,
    startDate,
    endDate,
    searchQuery,
  } = query;

  loggerBack.info(`User ${userId} requesting asset list for accountBookId: ${accountBookId}`);

  // Info: (20250411 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
  const company = await getCompanyById(accountBookId);
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
    canDo: TeamPermissionAction.VIEW_ASSET,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to view assets for company ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

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

  const assets = await listAssetsByCompanyId(accountBookId, {
    sortOption: parsedSortOption,
    filterCondition,
    searchQuery,
  });

  if (!assets) {
    payload = null;
  } else {
    const accountingSetting = await getAccountingSettingByCompanyId(accountBookId);
    // Info: (20241210 - Shirley) sort assets into fit the `IAssetItem`
    const sortedAssets = assets.map((item) => {
      const initAsset = parsePrismaAssetToAssetEntity(item);

      const remainingLife = calculateRemainingLife(
        initAsset,
        item.usefulLife,
        initAsset.depreciationMethod
      );
      return {
        id: item.id,
        currencyAlias: accountingSetting?.currency || 'TWD',
        acquisitionDate: item.acquisitionDate,
        assetType: item.type,
        assetName: item.name,
        assetNumber: item.number,
        purchasePrice: item.purchasePrice,
        accumulatedDepreciation: 0,
        residualValue: item.purchasePrice,
        remainingLife,
        assetStatus: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        deletedAt: null,
      };
    });

    /** Info: (20250115 - Shirley) 對即時計算的數值進行排序，這邊的 residualValue 指的是購買價格-累計折舊，不是 db 存的 residualValue
     * 排序需要一起排，所以在對即時計算的欄位進行排序，代表直接從 DB 拿出來的值也要再排一次
     */
    sortedAssets.sort((a, b) =>
      parsedSortOption.reduce((acc, sort) => {
        if (acc !== 0) return acc;
        let comparison = 0;
        switch (sort.sortBy) {
          case SortBy.RESIDUAL_VALUE:
            comparison = a.residualValue - b.residualValue;
            break;
          case SortBy.ACCUMULATED_DEPRECIATION:
            comparison = a.accumulatedDepreciation - b.accumulatedDepreciation;
            break;
          case SortBy.REMAINING_LIFE:
            comparison = a.remainingLife - b.remainingLife;
            break;
          case SortBy.PURCHASE_PRICE:
            comparison = a.purchasePrice - b.purchasePrice;
            break;
          case SortBy.ACQUISITION_DATE:
            comparison = a.acquisitionDate - b.acquisitionDate;
            break;
          default:
            break;
        }
        return sort.sortOrder === SortOrder.ASC ? comparison : -comparison;
      }, 0)
    );

    const paginatedAssets = formatPaginatedAsset(sortedAssets, parsedSortOption, page, pageSize);
    payload = paginatedAssets;
  }

  // Info: (20250423 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    loggerBack.info(
      `Successfully retrieved ${payload?.data.length || 0} assets for company ${accountBookId}`
    );
  }

  // Info: (20250423 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
};

/**
 * Info: (20250423 - Shirley) Handle POST request for creating asset
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Process and validate input data
 * 7. Create asset with vouchers
 * 8. Validate output data
 * 9. Log user action and return response
 */
export const handlePostRequest = async (req: NextApiRequest) => {
  const apiName = APIName.CREATE_ASSET_V2;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAssetPostOutput | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !query.accountBookId || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId } = query;
  const {
    assetName,
    assetType,
    assetNumber,
    acquisitionDate,
    purchasePrice,
    depreciationStart,
    depreciationMethod,
    residualValue,
    usefulLife,
    note = '',
  } = body as ICreateAssetInput;

  loggerBack.info(`User ${userId} creating asset for accountBookId: ${accountBookId}`);

  // Info: (20250411 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
  const company = await getCompanyById(accountBookId);
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
    canDo: TeamPermissionAction.CREATE_ASSET,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to create asset for company ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20241215 - Shirley) 檢查折舊開始日期是否大於購入日期
  if (depreciationStart && depreciationStart > acquisitionDate) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20241215 - Shirley) 檢查殘值是否大於購入價格
  if (residualValue && residualValue > purchasePrice) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20241204 - Luphia) collect the new asset data with db schema
  const newAsset: ICreateAssetWithVouchersRepoInput = {
    accountBookId,
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
  const rs = await createAssetWithVouchers(newAsset, userId);

  // Info: (20250423 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, rs);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    statusMessage = STATUS_MESSAGE.CREATED;
    payload = rs;
    loggerBack.info(`Successfully created asset ${rs.id} for company ${accountBookId}`);
  }

  // Info: (20250423 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
};

/**
 * Info: (20250423 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedAsset | IAssetPostOutput | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<IPaginatedAsset | IAssetPostOutput | null>;

  try {
    // Info: (20250423 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case HttpMethod.POST:
        ({ httpCode, result } = await handlePostRequest(req));
        break;
      default:
        // Info: (20250423 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250423 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250423 - Shirley) Send response
  res.status(httpCode).json(result);
}
