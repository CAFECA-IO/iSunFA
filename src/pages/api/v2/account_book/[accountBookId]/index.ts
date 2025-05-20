import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  IAccountBook,
  ACCOUNT_BOOK_UPDATE_ACTION,
  FILING_FREQUENCY,
  FILING_METHOD,
  DECLARANT_FILING_METHOD,
  AGENT_FILING_ROLE,
} from '@/interfaces/account_book';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  checkOutputDataValid,
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import {
  deleteAccountBook,
  updateAccountBook,
  getAccountBookTeamId,
} from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import {
  IGetAccountBookResponse,
  IGetAccountBookQueryParams,
  IUpdateAccountBookInfoBody,
  ICountry,
} from '@/lib/utils/zod_schema/account_book';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import {
  getCompanySettingByCompanyId,
  createCompanySetting,
  updateCompanySettingByCompanyId,
} from '@/lib/utils/repo/company_setting.repo';
import { getCountryByLocaleKey, getCountryByCode } from '@/lib/utils/repo/country.repo';
import { DefaultValue } from '@/constants/default_value';

/**
 * Info: (20250310 - Shirley) Handle PUT request
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. Check if user is logged in -> UNAUTHORIZED_ACCESS
 * 2. Check if request data is valid -> INVALID_INPUT_PARAMETER
 * 3. Check user authorization -> FORBIDDEN
 * 4. Process account book update based on action type
 *    - UPDATE_TAG: Update account book tag
 *    - UPDATE_INFO: Update account book details (taxSerialNumber, representativeName, etc.)
 * 5. Validate output data -> INVALID_OUTPUT_DATA
 */
const handlePutRequest = async (req: NextApiRequest) => {
  const apiName = APIName.UPDATE_ACCOUNT_BOOK;

  // Info: (20250310 - Shirley) Get user session
  const session = await getSession(req);

  // Info: (20250310 - Shirley) Check if user is logged in, will throw UNAUTHORIZED_ACCESS error if not logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250310 - Shirley) Validate request data, will throw INVALID_INPUT_PARAMETER error if invalid
  const { query, body } = checkRequestData(apiName, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250310 - Shirley) Check user authorization, will throw FORBIDDEN error if not authorized
  await checkUserAuthorization(apiName, req, session);

  const { userId, teams } = session;
  const accountBookId = Number(req.query.accountBookId);
  const { action } = body;

  // Info: (20250418 - Shirley) 獲取帳本所屬的團隊ID
  const teamId = await getAccountBookTeamId(accountBookId);

  if (!teamId) {
    loggerBack.warn(`Account book ${accountBookId} not found or doesn't belong to any team`);
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  // Info: (20250418 - Shirley) 從 session 中獲取用戶在團隊中的角色
  const teamInfo = teams?.find((team) => team.id === teamId);

  if (!teamInfo) {
    loggerBack.warn(
      `User ${userId} is not in the team ${teamId} that owns account book ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const teamRole = teamInfo.role as TeamRole;
  loggerBack.info(`User ${userId} with role ${teamRole} is updating account book ${accountBookId}`);

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | IGetAccountBookResponse | null = null;
  let canDo = false;

  switch (action) {
    // Info: (20250310 - Shirley) Update account book tag
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_TAG: {
      canDo = convertTeamRoleCanDo({
        teamRole,
        canDo: TeamPermissionAction.MODIFY_TAG,
      }).can;

      if (!canDo) {
        loggerBack.warn(
          `User ${userId} with role ${teamRole} doesn't have permission to update tag of account book ${accountBookId}`
        );
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }

      const { tag } = body;
      payload = await updateAccountBook(userId, accountBookId, { tag });
      statusMessage = STATUS_MESSAGE.SUCCESS;
      break;
    }
    // Info: (20250515 - Shirley) Update account book details (from info.ts)
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_INFO: {
      // Info: (20250515 - Shirley) 檢查用戶是否有修改帳本權限
      canDo = convertTeamRoleCanDo({
        teamRole,
        canDo: TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
      }).can;

      if (!canDo) {
        loggerBack.warn(
          `User ${userId} with role ${teamRole} doesn't have permission to modify account book ${accountBookId}`
        );
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }

      // Info: (20250515 - Shirley) 獲取帳本信息
      const company = await getCompanyById(accountBookId);
      if (!company) {
        loggerBack.warn(`Account book ${accountBookId} not found`);
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }

      // Info: (20250515 - Shirley) 獲取公司設定
      let companySetting = await getCompanySettingByCompanyId(accountBookId);
      if (!companySetting) {
        // Info: (20250515 - Shirley) 如果沒有公司設定記錄，創建一個空白記錄
        companySetting = await createCompanySetting(accountBookId);
        if (!companySetting) {
          loggerBack.warn(`Cannot create company setting for accountBookId: ${accountBookId}`);
          throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
        }
      }

      // Info: (20250515 - Shirley) 記錄更新前的狀態
      loggerBack.info(
        `Updating account book ${accountBookId}: Previous values - country: ${companySetting.country}, countryCode: ${companySetting.countryCode}, startDate: ${company.startDate}`
      );

      const updateData = body as IUpdateAccountBookInfoBody;

      // Info: (20250515 - Shirley) 更新公司設定
      const updatedSetting = await updateCompanySettingByCompanyId({
        companyId: accountBookId,
        data: {
          taxSerialNumber: updateData.taxSerialNumber,
          representativeName: updateData.representativeName,
          country: updateData.country,
          phone: updateData.phoneNumber,
          city: updateData.city,
          district: updateData.district,
          enteredAddress: updateData.enteredAddress,
          companyName: updateData.name,
          companyTaxId: updateData.taxId,
          companyStartDate: updateData.startDate,
          contactPerson: updateData.contactPerson,
          filingFrequency: updateData.filingFrequency,
          filingMethod: updateData.filingMethod,
          declarantFilingMethod: updateData.declarantFilingMethod,
          declarantName: updateData.declarantName,
          declarantPersonalId: updateData.declarantPersonalId,
          declarantPhoneNumber: updateData.declarantPhoneNumber,
          agentFilingRole: updateData.agentFilingRole,
          licenseId: updateData.licenseId,
        },
      });

      if (!updatedSetting) {
        loggerBack.warn(`Failed to update company setting for accountBookId: ${accountBookId}`);
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }

      // Info: (20250515 - Shirley) 記錄更新後的狀態
      loggerBack.info(
        `Updated account book ${accountBookId}: New values - country: ${updatedSetting.country}, countryCode: ${updatedSetting.countryCode}, startDate: ${updatedSetting.company.startDate}`
      );

      // Info: (20250515 - Shirley) 獲取更新後的帳本信息
      const updatedCompany = await getCompanyById(accountBookId);
      if (!updatedCompany) {
        loggerBack.warn(`Failed to get updated company for accountBookId: ${accountBookId}`);
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }

      // Info: (20250515 - Shirley) 獲取國家資訊
      const countryCode = updatedSetting.countryCode || 'tw';
      const countryLocaleKey = updatedSetting.country || 'tw';

      let dbCountry = await getCountryByLocaleKey(countryLocaleKey);
      if (!dbCountry) {
        dbCountry = await getCountryByCode(countryCode);
      }

      // Info: (20250515 - Shirley) 構建國家資訊
      const country = dbCountry
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
            id: String(updatedSetting.id),
            code: countryCode,
            name: 'Taiwan',
            localeKey: countryLocaleKey,
            currencyCode: 'TWD',
            phoneCode: '+886',
            phoneExample: '0902345678',
          };

      // Info: (20250515 - Shirley) 構建回應資料
      const accountBookData: IGetAccountBookResponse = {
        id: String(accountBookId),
        name: updatedCompany.name,
        taxId: updatedCompany.taxId,
        taxSerialNumber: updatedSetting.taxSerialNumber || '',
        representativeName: updatedSetting.representativeName || '',
        country,
        phoneNumber: updatedSetting.phone || '',
        address: (updatedSetting.address as { enteredAddress: string })?.enteredAddress || '',
        startDate: updatedCompany.startDate,
        createdAt: updatedCompany.createdAt,
        updatedAt: updatedCompany.updatedAt,

        // Info: (20250515 - Shirley) 添加 RC2 欄位
        contactPerson: updatedSetting.contactPerson || '',
        city: (updatedSetting.address as { city: string })?.city || '',
        district: (updatedSetting.address as { district: string })?.district || '',
        enteredAddress:
          (updatedSetting.address as { enteredAddress: string })?.enteredAddress || '',
        filingFrequency: updatedSetting.filingFrequency as FILING_FREQUENCY,
        filingMethod: updatedSetting.filingMethod as FILING_METHOD,
        declarantFilingMethod: updatedSetting.declarantFilingMethod as DECLARANT_FILING_METHOD,
        declarantName: updatedSetting.declarantName,
        declarantPersonalId: updatedSetting.declarantPersonalId,
        declarantPhoneNumber: updatedSetting.declarantPhoneNumber,
        agentFilingRole: updatedSetting.agentFilingRole as AGENT_FILING_ROLE,
        licenseId: updatedSetting.licenseId,
      };

      payload = accountBookData;
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  // Info: (20250310 - Shirley) Validate output data, will throw INVALID_OUTPUT_DATA error if invalid
  const validatedPayload = payload ? checkOutputDataValid(apiName, payload) : null;

  const response = formatApiResponse(statusMessage, validatedPayload);
  return { response, statusMessage };
};

const handleDeleteRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  await checkSessionUser(session, APIName.DELETE_ACCOUNT_BOOK, req);
  await checkUserAuthorization(APIName.DELETE_ACCOUNT_BOOK, req, session);
  const { query } = checkRequestData(APIName.DELETE_ACCOUNT_BOOK, req, session);
  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250409 - Shirley) 獲取帳本所屬的團隊ID
  const accountBookId = Number(query.accountBookId);
  const teamId = await getAccountBookTeamId(accountBookId);

  if (!teamId) {
    loggerBack.warn(`Account book ${accountBookId} not found or doesn't belong to any team`);
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  // Info: (20250409 - Shirley) 從 session 中獲取用戶在團隊中的角色
  const teamInfo = teams?.find((team) => team.id === teamId);

  if (!teamInfo) {
    loggerBack.warn(
      `User ${userId} is not in the team ${teamId} that owns account book ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const teamRole = teamInfo.role as TeamRole;

  // Info: (20250409 - Shirley) 檢查用戶是否有刪除帳本的權限
  const canDeleteResult = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.DELETE_ACCOUNT_BOOK,
  });

  loggerBack.info(`canDeleteResult: ${JSON.stringify(canDeleteResult)}`);

  if (!canDeleteResult.can) {
    loggerBack.warn(
      `User ${userId} with role ${teamRole} doesn't have permission to delete account book ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250409 - Shirley) 執行刪除帳本操作
  loggerBack.info(`User ${userId} is deleting account book ${accountBookId}`);
  const result = await deleteAccountBook(accountBookId);

  // Info: (20250409 - Shirley) 驗證刪除結果
  const { isOutputDataValid, outputData } = validateOutputData(APIName.DELETE_ACCOUNT_BOOK, result);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250524 - Shirley) 處理 GET 請求，獲取帳本詳細資訊
 * 如果沒有 company_setting 記錄，則創建一個空白記錄
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IGetAccountBookResponse | null = null;

  try {
    await checkSessionUser(session, APIName.GET_ACCOUNT_BOOK_BY_ID, req);
    await checkUserAuthorization(APIName.GET_ACCOUNT_BOOK_BY_ID, req, session);

    // Info: (20250421 - Shirley) Validate request data
    const { query } = checkRequestData(APIName.GET_ACCOUNT_BOOK_BY_ID, req, session);
    if (query === null) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const { accountBookId } = query as IGetAccountBookQueryParams;

    // Info: (20250326 - Shirley) 根據 accountBookId 獲取公司資訊
    const company = await getCompanyById(+accountBookId);
    if (!company) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250326 - Shirley) 獲取帳本所屬的團隊
    const { teamId } = company;
    if (!teamId) {
      loggerError({
        userId,
        errorType: 'get account book info failed',
        errorMessage: `Account book ${accountBookId} does not belong to any team`,
      });
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250326 - Shirley) 檢查用戶是否有權限查看此帳本
    // Info: (20250326 - Shirley) 從 session 中獲取團隊信息
    const teamInfo = session.teams?.find((team) => team.id === teamId);

    // Info: (20250326 - Shirley) 如果用戶不在團隊中，則拒絕訪問
    if (!teamInfo) {
      loggerError({
        userId,
        errorType: 'permission denied',
        errorMessage: `User ${userId} is not a member of team ${teamId}`,
      });
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250326 - Shirley) 根據帳本是否為私有來檢查不同的權限
    const userRole = teamInfo.role as TeamRole;

    // Info: (20250326 - Shirley) 帳本不分公開跟私有，團隊成員都可查看
    const canViewResult = convertTeamRoleCanDo({
      teamRole: userRole,
      canDo: TeamPermissionAction.VIEW_PUBLIC_ACCOUNT_BOOK,
    });

    if (!canViewResult.can) {
      loggerError({
        userId,
        errorType: 'permission denied',
        errorMessage: `User ${userId} with role ${userRole} does not have permission to view account book ${accountBookId}`,
      });
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    let companySetting = await getCompanySettingByCompanyId(+accountBookId);

    // Info: (20250326 - Shirley) 如果沒有公司設定記錄，創建一個空白記錄
    if (!companySetting) {
      companySetting = await createCompanySetting(+accountBookId);
      if (!companySetting) {
        loggerError({
          userId,
          errorType: 'create empty company setting failed',
          errorMessage: `Cannot create company setting for accountBookId: ${accountBookId}`,
        });
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }
    }

    // Info: (20250326 - Shirley) 獲取國家資訊
    const countryCode = companySetting.countryCode || 'tw';
    const countryLocaleKey = companySetting.country || 'tw';

    // Info: (20250326 - Shirley) 首先嘗試通過 localeKey 獲取國家資訊，如果沒有再嘗試通過 code 獲取
    let dbCountry = await getCountryByLocaleKey(countryLocaleKey);

    if (!dbCountry) {
      dbCountry = await getCountryByCode(countryCode);
    }

    // Info: (20250326 - Shirley) 構建國家資訊
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
          name: 'Taiwan', // Info: (20250326 - Shirley) 預設為台灣
          localeKey: countryLocaleKey,
          currencyCode: 'TWD', // Info: (20250326 - Shirley) 預設貨幣代碼
          phoneCode: '+886', // Info: (20250326 - Shirley) 預設電話國碼
          phoneExample: '0902345678', // Info: (20250326 - Shirley) 預設電話範例
        };

    // Info: (20250326 - Shirley) 構建回應資料
    const accountBookData: IGetAccountBookResponse = {
      id: String(accountBookId),
      name: company.name,
      taxId: company.taxId,
      taxSerialNumber: companySetting.taxSerialNumber || '',
      representativeName: companySetting.representativeName || '',
      country,
      phoneNumber: companySetting.phone || '',
      address: (companySetting.address as { enteredAddress: string })?.enteredAddress || '',
      startDate: company.startDate,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,

      // Info: (20250717 - Shirley) 添加 RC2 欄位
      contactPerson: companySetting.contactPerson || '',
      city: (companySetting.address as { city: string })?.city || '',
      district: (companySetting.address as { district: string })?.district || '',
      enteredAddress: (companySetting.address as { enteredAddress: string })?.enteredAddress || '',
      filingFrequency: companySetting.filingFrequency
        ? (companySetting.filingFrequency.toString() as FILING_FREQUENCY)
        : null,
      filingMethod: companySetting.filingMethod
        ? (companySetting.filingMethod.toString() as FILING_METHOD)
        : null,
      declarantFilingMethod: companySetting.declarantFilingMethod
        ? (companySetting.declarantFilingMethod.toString() as DECLARANT_FILING_METHOD)
        : null,
      declarantName: companySetting.declarantName || null,
      declarantPersonalId: companySetting.declarantPersonalId || null,
      declarantPhoneNumber: companySetting.declarantPhoneNumber || null,
      agentFilingRole: companySetting.agentFilingRole
        ? (companySetting.agentFilingRole.toString() as AGENT_FILING_ROLE)
        : null,
      licenseId: companySetting.licenseId || null,
    };

    // Info: (20250421 - Shirley) Validate output data
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.GET_ACCOUNT_BOOK_BY_ID,
      accountBookData
    );

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = outputData;

    return { response: formatApiResponse(statusMessage, payload), statusMessage };
  } catch (error) {
    loggerError({
      userId: session.userId || DefaultValue.USER_ID.SYSTEM,
      errorType: 'get account book info failed',
      errorMessage: (error as Error).message,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    return { response: formatApiResponse(statusMessage, null), statusMessage };
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let name = APIName.UPDATE_ACCOUNT_BOOK;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);
  try {
    switch (method) {
      case HttpMethod.GET:
        name = APIName.GET_ACCOUNT_BOOK_BY_ID;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.PUT:
        name = APIName.UPDATE_ACCOUNT_BOOK;
        ({ response, statusMessage } = await handlePutRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.DELETE:
        name = APIName.DELETE_ACCOUNT_BOOK;
        ({ response, statusMessage } = await handleDeleteRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    loggerBack.info(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, name, req, statusMessage);

  res.status(httpCode).json(result);
}
