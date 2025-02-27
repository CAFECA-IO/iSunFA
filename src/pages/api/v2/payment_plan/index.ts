import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaymentPlan } from '@/interfaces/payment_plan';

const mockPaymentPlans: IPaymentPlan[] = [
  {
    name: 'BEGINNER',
    price: 0,
    extraMemberPrice: 0,
    features: [
      {
        name: 'CLOUD_STORAGE',
        value: '10GB',
      },
      {
        name: 'AI_ASSISTANT',
        value: 'LIMITED',
      },
      {
        name: 'REPORT_GENERATION',
        value: 'UNLIMITED',
      },
      {
        name: 'FINANCIAL_STATEMENTS',
        value: 'MANUAL_DOWNLOAD',
      },
      {
        name: 'MATCHMAKING_PLATFORM',
        value: 'TASK_ACCEPTANCE_ONLY',
      },
      {
        name: 'TEAM_MEMBERS',
        value: 'LIMITED_TO_1_PERSON',
      },
      {
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
    name: 'PROFESSIONAL',
    price: 899,
    extraMemberPrice: 0,
    features: [
      {
        name: 'CLOUD_STORAGE',
        value: '1TB',
      },
      {
        name: 'AI_ASSISTANT',
        value: 'UNLIMITED_CAPACITY',
      },
      {
        name: 'MATCHMAKING_PLATFORM',
        value: 'POST_TASK_REQUIREMENTS',
      },
      {
        name: 'TEAM_MEMBERS',
        value: 'UP_TO_10_PEOPLE',
      },
      {
        name: 'FINANCIAL_STATEMENTS',
        value: 'AUTO_UPDATED',
      },
      {
        name: 'TECHNICAL_SUPPORT',
        value: 'UP_TO_24_HOURS_IN_TOTAL_4_HOURS_PER_SESSION',
      },
      {
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
    name: 'ENTERPRISE',
    price: 8990,
    extraMemberPrice: 89,
    features: [
      {
        name: 'CLOUD_STORAGE',
        value: 'UNLIMITED',
      },
      {
        name: 'REPORT_GENERATION',
        value: 'CUSTOMIZABLE_REPORTS',
      },
      {
        name: 'MATCHMAKING_PLATFORM',
        value: 'PRIORITY_VISIBILITY',
      },
      {
        name: 'TEAM_MEMBERS',
        value: 'UNLIMITED',
      },
      {
        name: 'FINANCIAL_STATEMENTS',
        value: 'AUTO_UPDATED',
      },
      {
        name: 'API_INTEGRATION',
        value: 'SYSTEM_SUPPORT',
      },
      {
        name: 'TECHNICAL_SUPPORT',
        value: 'UP_TO_48_HOURS_IN_TOTAL_4_HOURS_PER_SESSION',
      },
      {
        name: 'ADDITIONAL_PERKS',
        value: '100_ASSET_TAGGING_STICKERS',
      },
      {
        name: 'ADDITIONAL_PERKS',
        value: 'ONLINE_AND_OFFLINE_INTEGRATION',
      },
      {
        name: 'ADDITIONAL_PERKS',
        value: 'HARDWARE_SUPPORT',
      },
    ],
    isActive: false,
    createdAt: 1725372460,
    updatedAt: 1725372460,
    deletedAt: 0,
  },
];

interface IResponse {
  statusMessage: string;
  payload: IPaymentPlan[] | null;
}

const handleGetRequest: IHandleRequest<APIName.LIST_PAYMENT_PLAN, IPaymentPlan[]> = async () => {
  const statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  const payload = mockPaymentPlans;
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req) => withRequestValidation(APIName.LIST_PAYMENT_PLAN, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaymentPlan[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaymentPlan[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IPaymentPlan[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
