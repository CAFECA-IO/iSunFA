import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  ACCOUNT_BOOK_UPDATE_ACTION,
  FILING_FREQUENCY,
  FILING_METHOD,
  DECLARANT_FILING_METHOD,
  AGENT_FILING_ROLE,
  WORK_TAG,
} from '@/interfaces/account_book';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
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
  getCompanyById,
} from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import {
  IGetAccountBookResponse,
  IGetAccountBookQueryParams,
  IUpdateAccountBookInfoBody,
  IAccountBookEntity,
} from '@/lib/utils/zod_schema/account_book';
import {
  getCompanySettingByCompanyId,
  createCompanySetting,
  updateCompanySettingByCompanyId,
} from '@/lib/utils/repo/account_book_setting.repo';
import { getCountryByLocaleKey, getCountryByCode } from '@/lib/utils/repo/country.repo';
import { DefaultValue } from '@/constants/default_value';
import {
  getAccountingCurrencyByCompanyId,
  updateAccountingCurrency,
} from '@/lib/utils/repo/accounting_setting.repo';
import { CurrencyType } from '@/constants/currency';
import { LocaleKey } from '@/constants/normal_setting';

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
  // Info: (20250731 - Shirley) 統一所有 action 都返回 IGetAccountBookResponse 格式的數據
  let payload: IGetAccountBookResponse | null = null;
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
      const updatedAccountBook = await updateAccountBook(userId, accountBookId, { tag });

      if (!updatedAccountBook) {
        loggerBack.error(`Failed to update account book ${accountBookId} tag to ${tag}`);
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }

      const company = await getCompanyById(+accountBookId);

      if (!company) {
        loggerBack.warn(`Account book ${accountBookId} not found`);
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }

      let companySetting = await getCompanySettingByCompanyId(accountBookId);

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

      // Info: (20250606 - Shirley) 獲取會計設定中的幣別
      const accountingCurrency = await getAccountingCurrencyByCompanyId(accountBookId);

      // Info: (20250521 - Shirley) 返回符合 IGetAccountBookResponse 格式的資料
      payload = {
        id: accountBookId,
        name: company.name,
        taxId: company.taxId,
        imageId: String(company.imageFileId || ''),
        teamId,
        userId: company.userId,
        tag: updatedAccountBook.tag as WORK_TAG, // Info: (20250521 - Shirley) 使用更新後的標籤
        startDate: company.startDate,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        isPrivate: company.isPrivate,

        // Info: (20250521 - Shirley) 從 companySetting 獲取的欄位
        taxSerialNumber: companySetting.taxSerialNumber || '',
        representativeName: companySetting.representativeName || '',
        contactPerson: companySetting.contactPerson || '',
        phoneNumber: companySetting.phone || '',
        city: (companySetting.address as { city: string })?.city || '',
        district: (companySetting.address as { district: string })?.district || '',
        enteredAddress:
          (companySetting.address as { enteredAddress: string })?.enteredAddress || '',
        businessLocation: companySetting.countryCode as LocaleKey, // Info: (20250606 - Shirley) 國家
        accountingCurrency: accountingCurrency as CurrencyType, // Info: (20250606 - Shirley) 會計幣別

        // Info: (20250521 - Shirley) RC2 欄位
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

      // Info: (20250515 - Shirley) 檢查是否有修改標籤權限
      const canModifyTag =
        updateData.tag !== undefined &&
        convertTeamRoleCanDo({
          teamRole,
          canDo: TeamPermissionAction.MODIFY_TAG,
        }).can;

      if (updateData.tag !== undefined && !canModifyTag) {
        loggerBack.warn(
          `User ${userId} with role ${teamRole} doesn't have permission to update tag of account book ${accountBookId}`
        );
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }

      // Info: (20250731 - Shirley) 若有 tag 且有權限，更新 tag
      if (updateData.tag !== undefined && canModifyTag) {
        await updateAccountBook(userId, accountBookId, { tag: updateData.tag });
        loggerBack.info(`Updated account book ${accountBookId} tag to ${updateData.tag}`);
      }

      // Info: (20250731 - Shirley) 準備更新數據，只包含請求中實際提供的欄位
      const updateSettingData: Record<string, unknown> = {};

      // Info: (20250521 - Shirley) 只有當請求中包含該欄位時才更新，並且映射到正確的欄位名稱
      if (updateData.taxSerialNumber !== undefined) {
        updateSettingData.taxSerialNumber = updateData.taxSerialNumber;
      }
      if (updateData.representativeName !== undefined) {
        updateSettingData.representativeName = updateData.representativeName;
      }
      if (updateData.country !== undefined) {
        updateSettingData.country = updateData.country;
      }
      if (updateData.phoneNumber !== undefined) {
        updateSettingData.phone = updateData.phoneNumber; // Info: (20250521 - Shirley) 注意：phone 而非 phoneNumber
      }
      if (updateData.city !== undefined) {
        updateSettingData.city = updateData.city;
      }
      if (updateData.district !== undefined) {
        updateSettingData.district = updateData.district;
      }
      if (updateData.enteredAddress !== undefined) {
        updateSettingData.enteredAddress = updateData.enteredAddress;
      }
      if (updateData.name !== undefined) {
        updateSettingData.companyName = updateData.name; // Info: (20250521 - Shirley) 注意：companyName 而非 name
      }
      if (updateData.taxId !== undefined) {
        updateSettingData.companyTaxId = updateData.taxId; // Info: (20250521 - Shirley) 注意：companyTaxId 而非 taxId
      }
      if (updateData.startDate !== undefined) {
        updateSettingData.companyStartDate = updateData.startDate; // Info: (20250521 - Shirley) 注意：companyStartDate 而非 startDate
      }
      if (updateData.contactPerson !== undefined) {
        updateSettingData.contactPerson = updateData.contactPerson;
      }
      if (updateData.filingFrequency !== undefined) {
        updateSettingData.filingFrequency = updateData.filingFrequency;
      }
      if (updateData.filingMethod !== undefined) {
        updateSettingData.filingMethod = updateData.filingMethod;
      }
      if (updateData.declarantFilingMethod !== undefined) {
        updateSettingData.declarantFilingMethod = updateData.declarantFilingMethod;
      }
      if (updateData.declarantName !== undefined) {
        updateSettingData.declarantName = updateData.declarantName;
      }
      if (updateData.declarantPersonalId !== undefined) {
        updateSettingData.declarantPersonalId = updateData.declarantPersonalId;
      }
      if (updateData.declarantPhoneNumber !== undefined) {
        updateSettingData.declarantPhoneNumber = updateData.declarantPhoneNumber;
      }
      if (updateData.agentFilingRole !== undefined) {
        updateSettingData.agentFilingRole = updateData.agentFilingRole;
      }
      if (updateData.licenseId !== undefined) {
        updateSettingData.licenseId = updateData.licenseId;
      }
      if (updateData.businessLocation !== undefined) {
        updateSettingData.countryCode = updateData.businessLocation; // Info: (20250606 - Shirley) businessLocation 對應到 country 欄位
      }

      // Info: (20250731 - Shirley) 更新公司設定，只更新請求中包含的欄位
      const updatedSetting = await updateCompanySettingByCompanyId({
        accountBookId,
        data: updateSettingData,
      });

      if (!updatedSetting) {
        loggerBack.warn(`Failed to update company setting for accountBookId: ${accountBookId}`);
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }

      // Info: (20250606 - Shirley) 處理會計幣別更新到 AccountingSetting
      if (updateData.accountingCurrency !== undefined) {
        const updateResult = await updateAccountingCurrency(
          accountBookId,
          updateData.accountingCurrency
        );
        if (updateResult) {
          loggerBack.info(
            `Updated accounting currency for account book ${accountBookId} to ${updateData.accountingCurrency}`
          );
        } else {
          loggerBack.error(
            `Failed to update accounting currency for account book ${accountBookId}`
          );
        }
      }

      // Info: (20250515 - Shirley) 記錄更新後的狀態
      loggerBack.info(
        `Updated account book ${accountBookId}: New values - country: ${updatedSetting.country}, countryCode: ${updatedSetting.countryCode}, startDate: ${updatedSetting.accountBook.startDate}`
      );

      // Info: (20250515 - Shirley) 獲取更新後的帳本信息
      const updatedCompany = await getCompanyById(accountBookId);
      if (!updatedCompany) {
        loggerBack.warn(`Failed to get updated company for accountBookId: ${accountBookId}`);
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }

      // Info: (20250606 - Shirley) 獲取會計設定中的幣別
      const accountingCurrency = await getAccountingCurrencyByCompanyId(accountBookId);

      // Info: (20250515 - Shirley) 獲取國家資訊
      const countryCode = updatedSetting.countryCode || 'tw';
      const countryLocaleKey = updatedSetting.country || 'tw';

      let dbCountry = await getCountryByLocaleKey(countryLocaleKey);
      if (!dbCountry) {
        dbCountry = await getCountryByCode(countryCode);
      }

      // Info: (20250515 - Shirley) 構建國家資訊
      // const country: ICountry = dbCountry
      //   ? {
      //       id: String(dbCountry.id),
      //       code: dbCountry.code,
      //       name: dbCountry.name,
      //       localeKey: dbCountry.localeKey,
      //       currencyCode: dbCountry.currencyCode,
      //       phoneCode: dbCountry.phoneCode,
      //       phoneExample: dbCountry.phoneExample,
      //     }
      //   : {
      //       id: String(updatedSetting.id),
      //       code: countryCode,
      //       name: 'Taiwan',
      //       localeKey: countryLocaleKey,
      //       currencyCode: 'TWD',
      //       phoneCode: '+886',
      //       phoneExample: '0902345678',
      //     };

      // Info: (20250509 - Shirley) 根據 getAccountBookInfoResponse 格式返回資料
      const accountBookData: IGetAccountBookResponse = {
        id: accountBookId,
        name: updatedCompany.name,
        taxId: updatedCompany.taxId,
        imageId: String(updatedCompany.imageFileId || ''),
        teamId,
        userId: updatedCompany.userId,
        tag: updatedCompany.tag as WORK_TAG,
        startDate: updatedCompany.startDate,
        createdAt: updatedCompany.createdAt,
        updatedAt: updatedCompany.updatedAt,
        isPrivate: updatedCompany.isPrivate,

        // Info: (20250521 - Shirley) 從 companySetting 獲取的欄位
        taxSerialNumber: updatedSetting.taxSerialNumber || '',
        representativeName: updatedSetting.representativeName || '',
        contactPerson: updatedSetting.contactPerson || '',
        phoneNumber: updatedSetting.phone || '',
        city: (updatedSetting.address as { city: string })?.city || '',
        district: (updatedSetting.address as { district: string })?.district || '',
        enteredAddress:
          (updatedSetting.address as { enteredAddress: string })?.enteredAddress || '',
        businessLocation: updatedSetting.countryCode as LocaleKey, // Info: (20250606 - Shirley) 國家來自 country 欄位
        accountingCurrency: accountingCurrency as CurrencyType, // Info: (20250606 - Shirley) 會計幣別

        // Info: (20250521 - Shirley) RC2 欄位
        filingFrequency: updatedSetting.filingFrequency
          ? (updatedSetting.filingFrequency.toString() as FILING_FREQUENCY)
          : null,
        filingMethod: updatedSetting.filingMethod
          ? (updatedSetting.filingMethod.toString() as FILING_METHOD)
          : null,
        declarantFilingMethod: updatedSetting.declarantFilingMethod
          ? (updatedSetting.declarantFilingMethod.toString() as DECLARANT_FILING_METHOD)
          : null,
        declarantName: updatedSetting.declarantName || null,
        declarantPersonalId: updatedSetting.declarantPersonalId || null,
        declarantPhoneNumber: updatedSetting.declarantPhoneNumber || null,
        agentFilingRole: updatedSetting.agentFilingRole
          ? (updatedSetting.agentFilingRole.toString() as AGENT_FILING_ROLE)
          : null,
        licenseId: updatedSetting.licenseId || null,
      };

      payload = accountBookData;
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      break;
    }

    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  // Info: (20250731 - Shirley) 統一使用 GET_ACCOUNT_BOOK_BY_ID API 的 schema 進行輸出數據驗證
  let validatedPayload = null;
  if (payload) {
    // Info: (20250521 - Shirley) 無論哪種 action，都使用 GET_ACCOUNT_BOOK_BY_ID API 的 schema 進行驗證
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.GET_ACCOUNT_BOOK_BY_ID,
      payload
    );
    if (isOutputDataValid) {
      validatedPayload = outputData;
    } else {
      loggerBack.error(`Invalid output data for ${action}: ${JSON.stringify(payload)}`);
      loggerBack.error(
        `Validation error details: \n${JSON.stringify(
          {
            payload,
            errorType: 'validate_output_data',
          },
          null,
          2
        )}`
      );
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      validatedPayload = null;
    }
  }

  const response = formatApiResponse(statusMessage, validatedPayload);
  return { response, statusMessage };
};

const handleDeleteRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, teams } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookEntity | null = null;

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

    let companySetting = await getCompanySettingByCompanyId(accountBookId);

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

    // Info: (20250606 - Shirley) 獲取會計設定中的幣別
    const accountingCurrency = await getAccountingCurrencyByCompanyId(+accountBookId);

    // Info: (20250326 - Shirley) 構建回應資料
    const accountBookData: IGetAccountBookResponse = {
      id: accountBookId,
      name: company.name,
      taxId: company.taxId,
      imageId: String(company.imageFileId || ''),
      teamId,
      userId: company.userId,
      tag: company.tag as WORK_TAG,
      startDate: company.startDate,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      isPrivate: company.isPrivate,

      // Info: (20250521 - Shirley) 從 companySetting 獲取的欄位
      taxSerialNumber: companySetting.taxSerialNumber || '',
      representativeName: companySetting.representativeName || '',
      contactPerson: companySetting.contactPerson || '',
      phoneNumber: companySetting.phone || '',
      city: (companySetting.address as { city: string })?.city || '',
      district: (companySetting.address as { district: string })?.district || '',
      enteredAddress: (companySetting.address as { enteredAddress: string })?.enteredAddress || '',
      businessLocation: companySetting.countryCode as LocaleKey, // Info: (20250606 - Shirley) 國家來自 country 欄位
      accountingCurrency: accountingCurrency as CurrencyType, // Info: (20250606 - Shirley) 會計幣別來自 AccountingSetting

      // Info: (20250521 - Shirley) RC2 欄位
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
