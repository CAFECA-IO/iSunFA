import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  IGetAccountBookQueryParams,
  IGetAccountBookResponse,
  ICountry,
  IUpdateAccountBookInfoBody,
} from '@/lib/utils/zod_schema/account_book';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import {
  getCompanySettingByCompanyId,
  createCompanySetting,
  updateCompanySettingByCompanyId,
} from '@/lib/utils/repo/company_setting.repo';
import { getCountryByLocaleKey, getCountryByCode } from '@/lib/utils/repo/country.repo';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import {
  FILING_FREQUENCY,
  FILING_METHOD,
  DECLARANT_FILING_METHOD,
  AGENT_FILING_ROLE,
} from '@/interfaces/account_book';

interface IResponse {
  statusMessage: string;
  payload: IGetAccountBookResponse | null;
}

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
    await checkSessionUser(session, APIName.GET_ACCOUNT_BOOK_INFO_BY_ID, req);
    await checkUserAuthorization(APIName.GET_ACCOUNT_BOOK_INFO_BY_ID, req, session);

    // Info: (20250421 - Shirley) Validate request data
    const { query } = checkRequestData(APIName.GET_ACCOUNT_BOOK_INFO_BY_ID, req, session);
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
      // address: {
      //   city: (companySetting.address as { city: string })?.city || '',
      //   district: (companySetting.address as { district: string })?.district || '',
      //   enteredAddress:
      //     (companySetting.address as { enteredAddress: string })?.enteredAddress || '',
      // },
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
        : undefined,
      filingMethod: companySetting.filingMethod
        ? (companySetting.filingMethod.toString() as FILING_METHOD)
        : undefined,
      declarantFilingMethod: companySetting.declarantFilingMethod
        ? (companySetting.declarantFilingMethod.toString() as DECLARANT_FILING_METHOD)
        : undefined,
      declarantName: companySetting.declarantName || '',
      declarantPersonalId: companySetting.declarantPersonalId || '',
      declarantPhoneNumber: companySetting.declarantPhoneNumber || '',
      agentFilingRole: companySetting.agentFilingRole
        ? (companySetting.agentFilingRole.toString() as AGENT_FILING_ROLE)
        : undefined,
      licenseId: companySetting.licenseId || '',
    };

    // Info: (20250421 - Shirley) Validate output data
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.GET_ACCOUNT_BOOK_INFO_BY_ID,
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

/**
 * Info: (20250410 - Shirley) 處理 PUT 請求，更新帳本詳細資訊
 */
const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IGetAccountBookResponse | null = null;

  try {
    await checkSessionUser(session, APIName.UPDATE_ACCOUNT_BOOK_INFO, req);
    await checkUserAuthorization(APIName.UPDATE_ACCOUNT_BOOK_INFO, req, session);

    // Info: (20250421 - Shirley) Validate request data
    const { query, body } = checkRequestData(APIName.UPDATE_ACCOUNT_BOOK_INFO, req, session);
    if (query === null || body === null) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const { accountBookId } = query as IGetAccountBookQueryParams;
    const updateData = body as IUpdateAccountBookInfoBody;

    // Info: (20250410 - Shirley) 獲取帳本信息
    const company = await getCompanyById(+accountBookId);
    if (!company) {
      loggerError({
        userId,
        errorType: 'update account book info failed',
        errorMessage: `Account book ${accountBookId} not found`,
      });
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250410 - Shirley) 獲取帳本所屬的團隊
    const { teamId } = company;
    if (!teamId) {
      loggerError({
        userId,
        errorType: 'update account book info failed',
        errorMessage: `Account book ${accountBookId} does not belong to any team`,
      });
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250410 - Shirley) 從 session 中獲取用戶在團隊中的角色
    const teamInfo = session.teams?.find((team) => team.id === teamId);
    if (!teamInfo) {
      loggerError({
        userId,
        errorType: 'permission denied',
        errorMessage: `User ${userId} is not a member of team ${teamId}`,
      });
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    const userRole = teamInfo.role as TeamRole;

    // Info: (20250410 - Shirley) 檢查用戶是否有修改帳本權限
    const canModifyResult = convertTeamRoleCanDo({
      teamRole: userRole,
      canDo: TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
    });

    if (!canModifyResult.can) {
      loggerError({
        userId,
        errorType: 'permission denied',
        errorMessage: `User ${userId} with role ${userRole} does not have permission to modify account book ${accountBookId}`,
      });
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250410 - Shirley) 獲取公司設定
    let companySetting = await getCompanySettingByCompanyId(+accountBookId);
    if (!companySetting) {
      // Info: (20250410 - Shirley) 如果沒有公司設定記錄，創建一個空白記錄
      companySetting = await createCompanySetting(+accountBookId);
      if (!companySetting) {
        loggerError({
          userId,
          errorType: 'update account book info failed',
          errorMessage: `Cannot create company setting for accountBookId: ${accountBookId}`,
        });
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        return { response: formatApiResponse(statusMessage, null), statusMessage };
      }
    }

    // Info: (20250410 - Shirley) 記錄更新前的狀態
    loggerBack.info(
      `Updating account book ${accountBookId}: Previous values - country: ${companySetting.country}, countryCode: ${companySetting.countryCode}, startDate: ${company.startDate}`
    );

    // Info: (20250410 - Shirley) 更新公司設定
    const updatedSetting = await updateCompanySettingByCompanyId({
      companyId: +accountBookId,
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
      loggerError({
        userId,
        errorType: 'update account book info failed',
        errorMessage: `Failed to update company setting for accountBookId: ${accountBookId}`,
      });
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250410 - Shirley) 記錄更新後的狀態
    loggerBack.info(
      `Updated account book ${accountBookId}: New values - country: ${updatedSetting.country}, countryCode: ${updatedSetting.countryCode}, startDate: ${updatedSetting.company.startDate}`
    );

    // Info: (20250410 - Shirley) 獲取更新後的帳本信息
    const updatedCompany = await getCompanyById(+accountBookId);
    if (!updatedCompany) {
      loggerError({
        userId,
        errorType: 'update account book info failed',
        errorMessage: `Failed to get updated company for accountBookId: ${accountBookId}`,
      });
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    // Info: (20250410 - Shirley) 獲取國家資訊
    const countryCode = updatedSetting.countryCode || 'tw';
    const countryLocaleKey = updatedSetting.country || 'tw';

    let dbCountry = await getCountryByLocaleKey(countryLocaleKey);
    if (!dbCountry) {
      dbCountry = await getCountryByCode(countryCode);
    }

    // Info: (20250410 - Shirley) 構建國家資訊
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
          id: String(updatedSetting.id),
          code: countryCode,
          name: 'Taiwan',
          localeKey: countryLocaleKey,
          currencyCode: 'TWD',
          phoneCode: '+886',
          phoneExample: '0902345678',
        };

    // Info: (20250410 - Shirley) 構建回應資料
    const accountBookData: IGetAccountBookResponse = {
      id: String(accountBookId),
      name: updatedCompany.name,
      taxId: updatedCompany.taxId,
      taxSerialNumber: updatedSetting.taxSerialNumber || '',
      representativeName: updatedSetting.representativeName || '',
      country,
      phoneNumber: updatedSetting.phone || '',
      // address: {
      //   city: (updatedSetting.address as { city: string })?.city || '',
      //   district: (updatedSetting.address as { district: string })?.district || '',
      //   enteredAddress:
      //     (updatedSetting.address as { enteredAddress: string })?.enteredAddress || '',
      // },
      address: (updatedSetting.address as { enteredAddress: string })?.enteredAddress || '',
      startDate: updatedCompany.startDate,
      createdAt: updatedCompany.createdAt,
      updatedAt: updatedCompany.updatedAt,

      // Info: (20250717 - Shirley) 添加 RC2 欄位
      contactPerson: updatedSetting.contactPerson || '',
      city: (updatedSetting.address as { city: string })?.city || '',
      district: (updatedSetting.address as { district: string })?.district || '',
      enteredAddress: (updatedSetting.address as { enteredAddress: string })?.enteredAddress || '',
      filingFrequency: updatedSetting.filingFrequency
        ? (updatedSetting.filingFrequency.toString() as FILING_FREQUENCY)
        : undefined,
      filingMethod: updatedSetting.filingMethod
        ? (updatedSetting.filingMethod.toString() as FILING_METHOD)
        : undefined,
      declarantFilingMethod: updatedSetting.declarantFilingMethod
        ? (updatedSetting.declarantFilingMethod.toString() as DECLARANT_FILING_METHOD)
        : undefined,
      declarantName: updatedSetting.declarantName || '',
      declarantPersonalId: updatedSetting.declarantPersonalId || '',
      declarantPhoneNumber: updatedSetting.declarantPhoneNumber || '',
      agentFilingRole: updatedSetting.agentFilingRole
        ? (updatedSetting.agentFilingRole.toString() as AGENT_FILING_ROLE)
        : undefined,
      licenseId: updatedSetting.licenseId || '',
    };

    // Info: (20250421 - Shirley) Validate output data
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.UPDATE_ACCOUNT_BOOK_INFO,
      accountBookData
    );

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      return { response: formatApiResponse(statusMessage, null), statusMessage };
    }

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = outputData;

    return { response: formatApiResponse(statusMessage, payload), statusMessage };
  } catch (error) {
    loggerError({
      userId: session.userId || DefaultValue.USER_ID.SYSTEM,
      errorType: 'update account book info failed',
      errorMessage: (error as Error).message,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    return { response: formatApiResponse(statusMessage, null), statusMessage };
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.GET_ACCOUNT_BOOK_INFO_BY_ID;

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.GET_ACCOUNT_BOOK_INFO_BY_ID;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.PUT:
        apiName = APIName.UPDATE_ACCOUNT_BOOK_INFO;
        ({ response, statusMessage } = await handlePutRequest(req));
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

  // Info: (20250421 - Shirley) Log user action after API execution
  const session = await getSession(req);
  await logUserAction(session, apiName, req, statusMessage);

  res.status(httpCode).json(result);
}
