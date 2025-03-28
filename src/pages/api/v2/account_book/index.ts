import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountBookForUser, WORK_TAG } from '@/interfaces/account_book';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { generateKeyPair, storeKeyByCompany } from '@/lib/utils/crypto';
import { createFile } from '@/lib/utils/repo/file.repo';
import { FileFolder } from '@/constants/file';
import { APIName } from '@/constants/api_connection';
import { createCompanyAndRole, getCompanyAndRoleByTaxId } from '@/lib/utils/repo/admin.repo';
import { createAccountingSetting } from '@/lib/utils/repo/accounting_setting.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import prisma from '@/client';
import { SUBSCRIPTION_PLAN_LIMITS } from '@/constants/team/permissions';
import { loggerError } from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { DefaultValue } from '@/constants/default_value';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import { ISessionData } from '@/interfaces/session';

/**
 * Info: (20250328 - Shirley) 處理 POST 請求，建立帳本
 * All checks will throw errors, which will be caught by the outer try-catch
 * 1. 檢查用戶登錄狀態 -> UNAUTHORIZED_ACCESS
 * 2. 驗證請求數據 -> INVALID_INPUT_PARAMETER
 * 3. 檢查用戶授權 -> FORBIDDEN
 * 4. 建立帳本（包含多個步驟）
 * 5. 驗證輸出數據 -> INVALID_OUTPUT_DATA
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const apiName = APIName.CREATE_ACCOUNT_BOOK;

  // Info: (20250328 - Shirley) 獲取用戶會話
  const session = await getSession(req);

  // Info: (20250328 - Shirley) 檢查用戶登錄狀態，如果未登錄則拋出 UNAUTHORIZED_ACCESS 錯誤
  await checkSessionUser(session, apiName, req);

  // Info: (20250328 - Shirley) 驗證請求數據，如果無效則拋出 INVALID_INPUT_PARAMETER 錯誤
  const { body } = checkRequestData(apiName, req, session);
  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250328 - Shirley) 檢查用戶授權，如果未授權則拋出 FORBIDDEN 錯誤
  await checkUserAuthorization(apiName, req, session);

  const { teamId, name, taxId, tag } = body;
  const { userId } = session;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookForUser | null = null;

  try {
    // Info: (20250328 - Shirley) Step 1. 檢查用戶在團隊中的權限
    const teamInfo = session.teams?.find((team) => team.id === teamId);

    if (!teamInfo) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { statusMessage, payload, session };
    }

    const checkResult = convertTeamRoleCanDo({
      teamRole: teamInfo.role as TeamRole,
      canDo: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
    });

    if (!('yesOrNo' in checkResult) || !checkResult.yesOrNo) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      return { statusMessage, payload, session };
    }

    // Info: (20250328 - Shirley) Step 2. 檢查團隊訂閱方案的帳本數量限制
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!team) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      return { statusMessage, payload, session };
    }

    // 獲取團隊下的帳本數量
    const accountBookCount = await prisma.company.count({
      where: {
        teamId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });

    const lastSubscription = team.subscription;

    // 獲取團隊的訂閱計劃，如果找不到對應的計劃類型，默認使用 FREE 計劃
    const planType = lastSubscription?.plan?.type || 'BEGINNER';

    // 根據計劃類型確定帳本數量限制
    const limitsByType = SUBSCRIPTION_PLAN_LIMITS as Record<string, number>;

    const accountBookLimit = limitsByType[planType] || limitsByType.BEGINNER;

    // 檢查是否超過帳本數量限制
    if (accountBookCount >= accountBookLimit) {
      statusMessage = STATUS_MESSAGE.EXCEED_PLAN_LIMIT;
      return { statusMessage, payload, session };
    }

    // Info: (20250328 - Shirley) Step 3. 檢查是否有相同統編的公司帳本
    const getCompany = await getCompanyAndRoleByTaxId(userId, taxId);
    if (getCompany) {
      statusMessage = STATUS_MESSAGE.DUPLICATE_COMPANY;
      return { statusMessage, payload, session };
    }

    // Info: (20250328 - Shirley) Step 4. 建立公司帳本 icon
    const companyIcon = await generateIcon(name);
    const nowInSecond = getTimestampNow();
    const imageName = name + '_icon' + nowInSecond;
    const file = await createFile({
      name: imageName,
      size: companyIcon.size,
      mimeType: companyIcon.mimeType,
      type: FileFolder.TMP,
      url: companyIcon.iconUrl,
      isEncrypted: false,
      encryptedSymmetricKey: '',
    });

    if (!file) {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      return { statusMessage, payload, session };
    }

    // Info: (20250328 - Shirley) Step 5. 建立帳本關係
    const result = await createCompanyAndRole(userId, taxId, name, file.id, tag, undefined, teamId);

    const companyId = result.company.id;

    // Info: (20250328 - Shirley) Step 6. 建立帳本公私鑰對
    const companyKeyPair = await generateKeyPair();
    await storeKeyByCompany(companyId, companyKeyPair);

    // Info: (20250328 - Shirley) Step 7. 建立公司設定
    await createAccountingSetting(companyId);

    // 從結果中提取所需資料，構建 API 響應
    payload = {
      company: {
        id: result.company.id,
        imageId: file.url || '',
        name: result.company.name,
        taxId: result.company.taxId,
        startDate: result.company.startDate,
        createdAt: result.company.createdAt,
        updatedAt: result.company.updatedAt,
        isPrivate: result.company.isPrivate || false,
      },
      role: result.role,
      tag: (Object.values(WORK_TAG).includes(tag as WORK_TAG) ? tag : WORK_TAG.ALL) as WORK_TAG,
      order: result.order,
    };

    // Info: (20250328 - Shirley) 驗證輸出數據
    const validatedData = validateOutputData(apiName, payload);
    if (!validatedData.isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      payload = null;
    } else {
      payload = validatedData.outputData;
      statusMessage = STATUS_MESSAGE.CREATED;
    }
  } catch (error) {
    // Info: (20250328 - Shirley) 處理錯誤
    loggerError({
      userId: userId || DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    payload = null;
  }

  return { statusMessage, payload, session };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBookForUser | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookForUser | null = null;
  let session: ISessionData | null = null;
  const apiName: APIName = APIName.CREATE_ACCOUNT_BOOK;

  // Info: (20250328 - Shirley) 宣告變數以避免在 case 區塊中宣告
  let postResult: {
    statusMessage: string;
    payload: IAccountBookForUser | null;
    session: ISessionData | null;
  };

  try {
    // Info: (20250328 - Shirley) 檢查請求方法
    switch (req.method) {
      case 'POST':
        postResult = await handlePostRequest(req);
        statusMessage = postResult.statusMessage;
        payload = postResult.payload;
        session = postResult.session;
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (error) {
    // Info: (20250328 - Shirley) 處理錯誤
    if (error instanceof Error) {
      statusMessage = error.message;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }

    // Info: (20250328 - Shirley) 記錄錯誤
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });

    // Info: (20250328 - Shirley) 嘗試獲取會話以記錄用戶操作
    if (!session) {
      try {
        session = await getSession(req);
      } catch (sessionError) {
        loggerError({
          userId: DefaultValue.USER_ID.GUEST,
          errorType: `Failed to get session in ${apiName}`,
          errorMessage: sessionError as Error,
        });
      }
    }
  } finally {
    // Info: (20250328 - Shirley) 記錄用戶操作（僅針對已登錄用戶）
    if (session) {
      const userId = session.userId || DefaultValue.USER_ID.GUEST;

      // Info: (20250328 - Shirley) 僅記錄已登錄用戶的操作，不記錄訪客用戶的操作
      if (userId !== DefaultValue.USER_ID.GUEST) {
        try {
          await logUserAction(session, apiName, req, statusMessage);
        } catch (logError) {
          loggerError({
            userId,
            errorType: `Failed to log user action in ${apiName}`,
            errorMessage: logError as Error,
          });
        }
      }
    }

    // Info: (20250328 - Shirley) 格式化 API 響應並返回
    const { httpCode, result } = formatApiResponse<IAccountBookForUser | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
