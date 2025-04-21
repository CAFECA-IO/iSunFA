import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { getOptimizedCompanySettingsByUserId } from '@/lib/utils/repo/company_setting.repo';
import { IGetAccountBookResponse, ICountry } from '@/lib/utils/zod_schema/account_book';
import { DefaultValue } from '@/constants/default_value';
import { SortBy, SortOrder } from '@/constants/sort';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { validateOutputData } from '@/lib/utils/validator';
import { listCountries } from '@/lib/utils/repo/country.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IGetAccountBookResponse[]> | null = null;

  await checkSessionUser(session, APIName.LIST_ACCOUNT_BOOK_INFO_BY_USER_ID, req);
  await checkUserAuthorization(APIName.LIST_ACCOUNT_BOOK_INFO_BY_USER_ID, req, session);

  const { query } = checkRequestData(APIName.LIST_ACCOUNT_BOOK_INFO_BY_USER_ID, req, session);
  loggerBack.info(
    `List accountBook info by userId: ${userId} with query: ${JSON.stringify(query)}`
  );

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250421 - Shirley) Check if user has permission to view account books
  let hasAnyTeamViewPermission = false;

  if (teams && teams.length > 0) {
    hasAnyTeamViewPermission = teams.some((team) => {
      const teamRole = team.role as TeamRole;
      const canViewPublicAccountBookResult = convertTeamRoleCanDo({
        teamRole,
        canDo: TeamPermissionAction.VIEW_PUBLIC_ACCOUNT_BOOK,
      });

      if (canViewPublicAccountBookResult.can) {
        loggerBack.info(
          `User ${userId} has permission to view public account books in team ${team.id} with role ${teamRole}`
        );
        return true;
      }
      return false;
    });
  }

  if (!hasAnyTeamViewPermission) {
    loggerBack.warn(`User ${userId} doesn't have permission to view account books in any teams`);
    return {
      response: formatApiResponse(STATUS_MESSAGE.FORBIDDEN, null),
      statusMessage: STATUS_MESSAGE.FORBIDDEN,
    };
  }

  try {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    const {
      page = 1,
      pageSize = 10,
      startDate = 0,
      endDate = getTimestampNow(),
      searchQuery = '',
      sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
    } = query;

    // Info: (20250421 - Shirley) 使用優化後的函數直接獲取公司設置及關聯資料
    const { companySettings } = await getOptimizedCompanySettingsByUserId(userId, {
      searchQuery,
      startDate,
      endDate,
      includedImageFile: true,
      sortOption,
    });

    loggerBack.info(
      `Retrieved ${companySettings.length} company settings for user ${userId} with search query: "${searchQuery}"`
    );

    // Info: (20250421 - Shirley) 使用 repo 函數獲取國家資料
    const countries = await listCountries();

    loggerBack.info(`Retrieved ${countries.length} countries from database`);

    // Info: (20250421 - Shirley) workaround: 在 companySettings 中的 countryCode 和 country 沒有與 countries 建立關聯，因此需要建立快取映射，提高查詢效率
    const countryByCode = new Map();
    const countryByLocaleKey = new Map();

    countries.forEach((country) => {
      countryByCode.set(country.code, country);
      countryByLocaleKey.set(country.localeKey, country);
    });

    // Info: (20250421 - Shirley) 處理取得的公司設置資料
    const accountBookInfos = companySettings.map((setting) => {
      try {
        const { company } = setting;
        const companyId = company.id;

        // Info: (20250421 - Shirley) 從快取映射中獲取國家資訊，不再需要額外的數據庫查詢
        const countryCode = setting.countryCode || 'tw';
        const countryLocaleKey = setting.country || 'tw';

        // Info: (20250421 - Shirley) 先從 localeKey 嘗試獲取國家資訊，若找不到則使用 code
        const dbCountry =
          countryByLocaleKey.get(countryLocaleKey) || countryByCode.get(countryCode);

        // Info: (20250421 - Shirley) 建立國家資訊物件
        const country: ICountry = dbCountry
          ? {
              id: String(dbCountry.id),
              code: dbCountry.code,
              name: dbCountry.name,
              localeKey: dbCountry.localeKey,
              currencyCode: dbCountry.currencyCode,
              phoneCode: dbCountry.phoneCode,
              phoneExample: dbCountry.phoneExample,
            }
          : {
              id: String(setting.id),
              code: countryCode,
              name: 'Taiwan', // Info: (20250421 - Shirley) Default to Taiwan
              localeKey: countryLocaleKey,
              currencyCode: 'TWD', // Info: (20250421 - Shirley) Default currency code
              phoneCode: '+886', // Info: (20250421 - Shirley) Default phone code
              phoneExample: '0902345678', // Info: (20250421 - Shirley) Default phone example
            };

        // Info: (20250421 - Shirley) Build account book detailed information
        const accountBookInfo: IGetAccountBookResponse = {
          id: `${companyId}`, // Convert to string using template literal
          name: company.name,
          taxId: company.taxId || '',
          taxSerialNumber: setting.taxSerialNumber || '',
          representativeName: setting.representativeName || '',
          country,
          phoneNumber: setting.phone || '',
          address: setting.address || '',
          startDate: company.startDate,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
        };

        return accountBookInfo;
      } catch (error) {
        loggerBack.error({
          userId,
          errorType: 'get account book info failed',
          errorMessage: `Failed to get info for account book ${setting.companyId}: ${(error as Error).message}`,
        });
        return null;
      }
    });

    // Info: (20250421 - Shirley) Filter out successfully retrieved account book information
    const filteredResults = accountBookInfos.filter(
      (info): info is IGetAccountBookResponse => info !== null
    );

    // Info: (20250421 - Shirley) 確保分頁參數類型正確
    const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    const parsedPageSize = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;

    // Info: (20250421 - Shirley) 使用與 index.ts 一致的方式處理分頁和排序
    const paginationOptions: IPaginatedOptions<IGetAccountBookResponse[]> = {
      data: filteredResults,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalCount: filteredResults.length,
      totalPages: Math.ceil(filteredResults.length / parsedPageSize),
      sort:
        typeof sortOption === 'string'
          ? [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }]
          : sortOption,
    };

    // Info: (20250421 - Shirley) 使用 toPaginatedData 函數同時處理分頁和排序邏輯
    const paginatedResult = toPaginatedData(paginationOptions);

    // Info: (20250421 - Shirley) 使用 validateOutputData 驗證輸出資料，與 index.ts 保持一致的寫法
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.LIST_ACCOUNT_BOOK_INFO_BY_USER_ID,
      paginatedResult
    );

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      payload = outputData;
      loggerBack.info(
        `Successfully retrieved ${payload?.data?.length || 0} account books for user ${userId}`
      );
    }

    // Info: (20250421 - Shirley) Format API response
    const response = formatApiResponse(statusMessage, payload);
    return { response, statusMessage };
  } catch (error) {
    loggerBack.error({
      userId: session.userId || DefaultValue.USER_ID.SYSTEM,
      errorType: 'list account book info failed',
      errorMessage: (error as Error).message,
    });
    return {
      response: formatApiResponse(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, null),
      statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR,
    };
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const apiName = APIName.LIST_ACCOUNT_BOOK_INFO_BY_USER_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
