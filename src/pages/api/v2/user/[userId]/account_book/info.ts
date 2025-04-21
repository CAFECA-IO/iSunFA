import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { getCountryByCode, getCountryByLocaleKey } from '@/lib/utils/repo/country.repo';
import {
  getCompanySettingByCompanyId,
  createCompanySetting,
} from '@/lib/utils/repo/company_setting.repo';
import { listAccountBookByUserId } from '@/lib/utils/repo/account_book.repo';
import { IGetAccountBookResponse, ICountry } from '@/lib/utils/zod_schema/account_book';
import { DefaultValue } from '@/constants/default_value';
import { IAccountBook } from '@/interfaces/account_book';

// Info: (20250421 - Shirley) Define interface for account book with team information
interface IExtendedAccountBook extends IAccountBook {
  company?: {
    id: number;
    taxId?: string;
  };
  companyId?: number;
}

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  const statusMessage: string = STATUS_MESSAGE.SUCCESS;
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
    // Info: (20250421 - Shirley) Get all account books for the user
    // This already filters out soft-deleted books by default
    const accountBooksOptions = await listAccountBookByUserId(userId, query);
    const accountBooks = (accountBooksOptions.data || []) as IExtendedAccountBook[];

    // Info: (20250421 - Shirley) Use totalCount from the query result to get the real total of non-deleted books
    const totalCountFromQuery = accountBooksOptions.totalCount || accountBooks.length;

    // Info: (20250421 - Shirley) Process each account book to get detailed information
    const accountBookInfoPromises = accountBooks.map(async (accountBook) => {
      try {
        // Info: (20250421 - Shirley) Get company ID based on available data structure
        const companyId = accountBook.company?.id ?? accountBook.companyId ?? accountBook.id;

        // Info: (20250421 - Shirley) Get company settings
        let companySetting = await getCompanySettingByCompanyId(companyId);

        // Info: (20250421 - Shirley) Create empty settings if none exist
        if (!companySetting) {
          companySetting = await createCompanySetting(companyId);
          if (!companySetting) {
            loggerBack.error({
              userId,
              errorType: 'create empty company setting failed',
              errorMessage: `Cannot create company setting for accountBookId: ${accountBook.id}`,
            });
            return null;
          }
        }

        // Info: (20250421 - Shirley) Get country information
        const countryCode = companySetting.countryCode || 'tw';
        const countryLocaleKey = companySetting.country || 'tw';

        // Info: (20250421 - Shirley) Try to get country by localeKey first, then by code if not found
        let dbCountry = await getCountryByLocaleKey(countryLocaleKey);

        if (!dbCountry) {
          dbCountry = await getCountryByCode(countryCode);
        }

        // Info: (20250421 - Shirley) Build country information
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
              id: String(companySetting.id),
              code: countryCode,
              name: 'Taiwan', // Info: (20250421 - Shirley) Default to Taiwan
              localeKey: countryLocaleKey,
              currencyCode: 'TWD', // Info: (20250421 - Shirley) Default currency code
              phoneCode: '+886', // Info: (20250421 - Shirley) Default phone code
              phoneExample: '0902345678', // Info: (20250421 - Shirley) Default phone example
            };

        // Info: (20250421 - Shirley) Get tax ID from available sources
        const taxId = accountBook.company?.taxId ?? accountBook.taxId ?? '';

        // Info: (20250421 - Shirley) Build account book detailed information
        const accountBookInfo: IGetAccountBookResponse = {
          id: `${accountBook.id}`, // Convert to string using template literal
          name: accountBook.name,
          taxId,
          taxSerialNumber: companySetting.taxSerialNumber || '',
          representativeName: companySetting.representativeName || '',
          country,
          phoneNumber: companySetting.phone || '',
          address: companySetting.address || '',
          startDate: accountBook.startDate,
          createdAt: accountBook.createdAt,
          updatedAt: accountBook.updatedAt,
        };

        return accountBookInfo;
      } catch (error) {
        loggerBack.error({
          userId,
          errorType: 'get account book info failed',
          errorMessage: `Failed to get info for account book ${accountBook.id}: ${(error as Error).message}`,
        });
        return null;
      }
    });

    // Info: (20250421 - Shirley) Wait for all account book information processing to complete
    const accountBookInfoResults = await Promise.all(accountBookInfoPromises);

    // Info: (20250421 - Shirley) Filter out successfully retrieved account book information
    const filteredResults = accountBookInfoResults.filter(
      (info): info is IGetAccountBookResponse => info !== null
    );

    loggerBack.info(
      `Successfully retrieved info for ${filteredResults.length} account books for user ${userId} (total count: ${totalCountFromQuery})`
    );

    // Info: (20250421 - Shirley) Get pagination parameters
    const pageSize =
      typeof query.pageSize === 'string' ? parseInt(query.pageSize, 10) : query.pageSize || 10;
    const page = typeof query.page === 'string' ? parseInt(query.page, 10) : query.page || 1;

    // Info: (20250421 - Shirley) Use the total count of non-deleted books from the query
    const totalCount = totalCountFromQuery;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIdx = (page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filteredResults.length);

    // Info: (20250421 - Shirley) Apply pagination only if both page and pageSize parameters are provided
    const pageData =
      query.pageSize && query.page ? filteredResults.slice(startIdx, endIdx) : filteredResults;

    // Info: (20250421 - Shirley) Prepare paginated result format
    const paginatedResult: IPaginatedData<IGetAccountBookResponse[]> = {
      data: pageData,
      page: query.pageSize && query.page ? page : 1,
      pageSize: query.pageSize && query.page ? pageSize : totalCount,
      totalCount,
      totalPages: query.pageSize && query.page ? totalPages : 1,
      hasNextPage: query.pageSize && query.page ? page < totalPages : false,
      hasPreviousPage: query.pageSize && query.page ? page > 1 : false,
      sort: [{ sortBy: 'createdAt', sortOrder: 'desc' }], // Default sort by createdAt
    };

    // Info: (20250421 - Shirley) 直接使用處理好的分頁資料，而不透過 validateOutputData
    payload = paginatedResult;

    // Info: (20250421 - Shirley) Always return paginated format
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
