import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  IGetAccountBookQueryParams,
  IGetAccountBookResponse,
  ICountry,
} from '@/lib/utils/zod_schema/account_book';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import {
  getCompanySettingByCompanyId,
  createCompanySetting,
} from '@/lib/utils/repo/company_setting.repo';
import { getCountryByLocaleKey, getCountryByCode } from '@/lib/utils/repo/country.repo';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { TeamPermissionAction, ITeamRoleCanDo, TeamRoleCanDoKey } from '@/interfaces/permissions';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';

interface IResponse {
  statusMessage: string;
  payload: IGetAccountBookResponse | null;
}

/**
 * Info: (20250524 - Shirley) 處理 GET 請求，獲取帳本詳細資訊
 * 如果沒有 company_setting 記錄，則創建一個空白記錄
 */
const handleGetRequest: IHandleRequest<
  APIName.GET_ACCOUNT_BOOK_INFO_BY_ID,
  IResponse['payload']
> = async ({ query, session }) => {
  const { userId } = session;
  const { accountBookId } = query as IGetAccountBookQueryParams;

  try {
    // Info: (20250326 - Shirley) 根據 accountBookId 獲取公司資訊
    const company = await getCompanyById(accountBookId);
    if (!company) {
      return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
    }

    // Info: (20250326 - Shirley) 獲取帳本所屬的團隊
    const { teamId } = company;
    if (!teamId) {
      loggerError({
        userId,
        errorType: 'get account book info failed',
        errorMessage: `Account book ${accountBookId} does not belong to any team`,
      });
      return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
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
      return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
    }

    // Info: (20250326 - Shirley) 根據帳本是否為私有來檢查不同的權限
    const userRole = teamInfo.role as TeamRole;

    // Info: (20250326 - Shirley) 帳本不分公開跟私有，團隊成員都可查看
    const canViewResult = convertTeamRoleCanDo({
      teamRole: userRole,
      canDo: TeamPermissionAction.VIEW_PUBLIC_ACCOUNT_BOOK,
    });

    const canView =
      TeamRoleCanDoKey.YES_OR_NO in canViewResult && (canViewResult as ITeamRoleCanDo).yesOrNo;

    if (!canView) {
      loggerError({
        userId,
        errorType: 'permission denied',
        errorMessage: `User ${userId} with role ${userRole} does not have permission to view account book ${accountBookId}`,
      });
      return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
    }

    let companySetting = await getCompanySettingByCompanyId(accountBookId);

    // Info: (20250326 - Shirley) 如果沒有公司設定記錄，創建一個空白記錄
    if (!companySetting) {
      companySetting = await createCompanySetting(accountBookId);
      if (!companySetting) {
        loggerError({
          userId,
          errorType: 'create empty company setting failed',
          errorMessage: `Cannot create company setting for accountBookId: ${accountBookId}`,
        });
        return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
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
    const payload: IGetAccountBookResponse = {
      id: String(accountBookId),
      name: company.name,
      taxId: company.taxId,
      taxSerialNumber: companySetting.taxSerialNumber || '',
      representativeName: companySetting.representativeName || '',
      country,
      phoneNumber: companySetting.phone || '',
      address: companySetting.address || '',
      startDate: company.startDate,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };

    return { statusMessage: STATUS_MESSAGE.SUCCESS_GET, payload };
  } catch (error) {
    loggerError({
      userId: session.userId || DefaultValue.USER_ID.SYSTEM,
      errorType: 'get account book info failed',
      errorMessage: (error as Error).message,
    });
    return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
  }
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req) => withRequestValidation(APIName.GET_ACCOUNT_BOOK_INFO_BY_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IResponse['payload'] = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
