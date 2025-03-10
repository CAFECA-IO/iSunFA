import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { IPaymentPlan } from '@/interfaces/payment_plan';
import { TPlanType } from '@/interfaces/subscription';
import { getSession } from '@/lib/utils/session';
import { checkSessionUser, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { validateOutputData, validateRequestData } from '@/lib/utils/validator';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

const mockPaymentPlans: IPaymentPlan[] = [
  {
    id: TPlanType.BEGINNER,
    planName: 'Beginner',
    price: 0,
    extraMemberPrice: 0,
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
    isActive: true,
    createdAt: 1725372460,
    updatedAt: 1725372460,
    deletedAt: 0,
  },
  {
    id: TPlanType.PROFESSIONAL,
    planName: 'Professional',
    price: 899,
    extraMemberPrice: 0,
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
    isActive: false,
    createdAt: 1725372460,
    updatedAt: 1725372460,
    deletedAt: 0,
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
    isActive: false,
    createdAt: 1725372460,
    updatedAt: 1725372460,
    deletedAt: 0,
  },
];

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaymentPlan[] | null = null;
  const apiName = APIName.LIST_PAYMENT_PLAN;

  try {
    // Info: (20250226 - Shirley) 獲取用戶 session
    const session = await getSession(req);

    // Info: (20250226 - Shirley) 檢查用戶是否登入
    const isLogin = await checkSessionUser(session, apiName, req);

    if (!isLogin) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    } else {
      // Info: (20250226 - Shirley) 驗證請求數據
      const { query, body } = validateRequestData(apiName, req);

      if (query !== null || body !== null) {
        // Info: (20250226 - Shirley) 檢查用戶授權
        const isAuth = await checkUserAuthorization(apiName, req, session);

        if (!isAuth) {
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
        } else {
          // Info: (20250226 - Shirley) 獲取付款計劃數據
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          const handlerOutput = mockPaymentPlans;

          // Info: (20250226 - Shirley) 驗證輸出數據
          const { isOutputDataValid, outputData } = validateOutputData(apiName, handlerOutput);

          if (!isOutputDataValid) {
            statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
          } else {
            payload = outputData;
          }
        }
      } else {
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      }

      // Info: (20250226 - Shirley) 記錄用戶行為
      await logUserAction(session, apiName, req, statusMessage);
    }
  } catch (error) {
    // Info: (20250226 - Shirley) 如果處理過程中出現錯誤
    if (error instanceof Error) {
      statusMessage = error.message;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: `Handler Request Error for ${apiName} in payment_plan/index.ts`,
      errorMessage: error as Error,
    });
  }

  return { statusMessage, payload };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaymentPlan[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaymentPlan[] | null = null;

  try {
    if (req.method !== 'GET') {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    } else {
      // Info: (20250226 - Shirley) 調用 handleGetRequest 處理 GET 請求
      const { statusMessage: handlerStatusMessage, payload: handlerOutput } =
        await handleGetRequest(req);
      statusMessage = handlerStatusMessage;
      payload = handlerOutput;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: `Error in payment_plan/index.ts`,
      errorMessage: error,
    });
  } finally {
    const { httpCode, result } = formatApiResponse<IPaymentPlan[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
