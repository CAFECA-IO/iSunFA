import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { TPlanType } from '@/interfaces/subscription';
import { getSession } from '@/lib/utils/session';
import {
  checkOutputDataValid,
  checkRequestDataValid,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { IPaymentPlanSchema } from '@/lib/utils/zod_schema/payment_plan';
import { ISessionData } from '@/interfaces/session';

const mockPaymentPlans: IPaymentPlanSchema[] = [
  {
    id: TPlanType.BEGINNER,
    planName: 'Beginner',
    price: 0,
    features: [
      {
        id: 'cloud_storage',
        name: 'CLOUD_STORAGE',
        value: '10GB',
      },
      {
        id: 'ai_assistant',
        name: 'AI_ASSISTANT',
        value: 'LIMITED_CAPACITY',
      },
      {
        id: 'report_generation',
        name: 'REPORT_GENERATION',
        value: 'UNLIMITED',
      },
      {
        id: 'financial_statements',
        name: 'FINANCIAL_STATEMENTS',
        value: 'MANUAL_DOWNLOAD',
      },
      {
        id: 'matchmaking_platform',
        name: 'MATCHMAKING_PLATFORM',
        value: 'TASK_ACCEPTANCE_ONLY',
      },
      {
        id: 'team_members',
        name: 'TEAM_MEMBERS',
        value: 'LIMITED_TO_1_PERSON',
      },
      {
        id: 'customer_support',
        name: 'CUSTOMER_SUPPORT',
        value: 'LIVE_CHAT_SUPPORT',
      },
    ],
  },
  {
    id: TPlanType.PROFESSIONAL,
    planName: 'Professional',
    price: 899,
    features: [
      {
        id: 'cloud_storage',
        name: 'CLOUD_STORAGE',
        value: '1TB',
      },
      {
        id: 'ai_assistant',
        name: 'AI_ASSISTANT',
        value: 'UNLIMITED_CAPACITY',
      },
      {
        id: 'matchmaking_platform',
        name: 'MATCHMAKING_PLATFORM',
        value: 'POST_TASK_REQUIREMENTS',
      },
      {
        id: 'team_members',
        name: 'TEAM_MEMBERS',
        value: 'UP_TO_10_PEOPLE',
      },
      {
        id: 'financial_statements',
        name: 'FINANCIAL_STATEMENTS',
        value: 'AUTO_UPDATED',
      },
      {
        id: 'technical_support',
        name: 'TECHNICAL_SUPPORT',
        value: 'UP_TO_24_HOURS_IN_TOTAL_4_HOURS_PER_SESSION',
      },
      {
        id: 'additional_perks',
        name: 'ADDITIONAL_PERKS',
        value: '10_ASSET_TAGGING_STICKERS',
      },
    ],
  },
  {
    id: TPlanType.ENTERPRISE,
    planName: 'Enterprise',
    price: 8990,
    extraMemberPrice: 89,
    features: [
      {
        id: 'cloud_storage',
        name: 'CLOUD_STORAGE',
        value: 'UNLIMITED',
      },
      {
        id: 'report_generation',
        name: 'REPORT_GENERATION',
        value: 'CUSTOMIZABLE_REPORTS',
      },
      {
        id: 'matchmaking_platform',
        name: 'MATCHMAKING_PLATFORM',
        value: 'PRIORITY_VISIBILITY',
      },
      {
        id: 'team_members',
        name: 'TEAM_MEMBERS',
        value: 'UNLIMITED',
      },
      {
        id: 'financial_statements',
        name: 'FINANCIAL_STATEMENTS',
        value: 'AUTO_UPDATED',
      },
      {
        id: 'api_integration',
        name: 'API_INTEGRATION',
        value: 'SYSTEM_SUPPORT',
      },
      {
        id: 'technical_support',
        name: 'TECHNICAL_SUPPORT',
        value: 'UP_TO_48_HOURS_IN_TOTAL_4_HOURS_PER_SESSION',
      },
      {
        id: 'additional_perks',
        name: 'ADDITIONAL_PERKS',
        value: ['100_ASSET_TAGGING_STICKERS', 'ONLINE_AND_OFFLINE_INTEGRATION', 'HARDWARE_SUPPORT'],
      },
    ],
  },
];

/**
 * Info: (20250310 - Shirley) 處理 GET 請求
 * 所有的檢查都會拋出錯誤，由外層的 handler 捕獲
 * 1. 檢查用戶是否登入 -> UNAUTHORIZED_ACCESS
 * 2. 檢查請求數據是否有效 -> INVALID_INPUT_PARAMETER
 * 3. 檢查用戶授權 -> FORBIDDEN
 * 4. 獲取付款計劃數據
 * 5. 驗證輸出數據 -> INVALID_OUTPUT_DATA
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.LIST_PAYMENT_PLAN;

  // Info: (20250310 - Shirley) 獲取用戶 session
  const session = await getSession(req);

  // Info: (20250310 - Shirley) 檢查用戶是否登入，如果未登入會拋出 UNAUTHORIZED_ACCESS 錯誤
  await checkSessionUser(session, apiName, req);

  // Info: (20250310 - Shirley) 驗證請求數據，如果無效會拋出 INVALID_INPUT_PARAMETER 錯誤
  checkRequestDataValid(apiName, req);

  // Info: (20250310 - Shirley) 檢查用戶授權，如果未授權會拋出 FORBIDDEN 錯誤
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250310 - Shirley) 獲取付款計劃數據
  const paymentPlans = mockPaymentPlans;

  // Info: (20250310 - Shirley) 驗證輸出數據，如果無效會拋出 INVALID_OUTPUT_DATA 錯誤
  const validatedPayload = checkOutputDataValid(apiName, paymentPlans);

  return {
    statusMessage: STATUS_MESSAGE.SUCCESS_GET,
    payload: validatedPayload,
    session, // Info: (20250310 - Shirley) 返回 session 以便在外層記錄用戶行為
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaymentPlanSchema[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaymentPlanSchema[] | null = null;
  let session: ISessionData | null = null;
  const apiName = APIName.LIST_PAYMENT_PLAN;

  try {
    // Info: (20250310 - Shirley) 檢查請求方法
    if (req.method !== 'GET') {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    } else {
      // Info: (20250310 - Shirley) 調用 handleGetRequest 處理 GET 請求
      const result = await handleGetRequest(req);
      statusMessage = result.statusMessage;
      payload = result.payload;
      session = result.session;
    }
  } catch (error) {
    // Info: (20250310 - Shirley) 處理錯誤
    if (error instanceof Error) {
      statusMessage = error.message;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }

    // Info: (20250310 - Shirley) 記錄錯誤
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: `Error in ${apiName}`,
      errorMessage: error as Error,
    });

    // Info: (20250310 - Shirley) 嘗試獲取 session 以記錄用戶行為
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
    // Info: (20250310 - Shirley) 記錄用戶行為（只記錄已登錄的用戶），與 logUserAction in middleware.ts 一致
    if (session) {
      const userId = session.userId || DefaultValue.USER_ID.GUEST;

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

    // Info: (20250310 - Shirley) 格式化 API 響應並返回
    const { httpCode, result } = formatApiResponse<IPaymentPlanSchema[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
