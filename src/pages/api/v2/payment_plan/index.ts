import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';

interface IFeature {
  name: string;
  value: string;
  description: string;
}

interface IPaymentPlan {
  name: string;
  price: number;
  description: string;
  features: IFeature[];
  remarks: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

interface ILocalizedPaymentPlan {
  locale: string;
  plans: IPaymentPlan[];
}

const mockPaymentPlans: ILocalizedPaymentPlan[] = [
  {
    locale: 'en',
    plans: [
      {
        name: 'Beginner',
        price: 0,
        description: 'Free version with basic features',
        features: [
          {
            name: 'storage',
            value: '10GB',
            description: 'Storage space',
          },
          {
            name: 'ai_assistant',
            value: 'Limited',
            description: 'AI assistant features',
          },
          {
            name: 'team_members',
            value: '1',
            description: 'Number of team members',
          },
        ],
        remarks: '',
        isActive: true,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
      {
        name: 'Professional',
        price: 899,
        description: 'Professional version with advanced features',
        features: [
          {
            name: 'storage',
            value: '1TB',
            description: 'Storage space',
          },
          {
            name: 'ai_assistant',
            value: 'Unlimited',
            description: 'AI assistant features',
          },
          {
            name: 'team_members',
            value: '10',
            description: 'Number of team members',
          },
        ],
        remarks: '',
        isActive: false,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
      {
        name: 'Enterprise',
        price: 8990,
        description: 'Enterprise version with all features',
        features: [
          {
            name: 'storage',
            value: 'Unlimited',
            description: 'Storage space',
          },
          {
            name: 'ai_assistant',
            value: 'Advanced functions',
            description: 'AI assistant features with advanced functions',
          },
          {
            name: 'team_members',
            value: 'Unlimited',
            description: 'Unlimited team members',
          },
        ],
        remarks: '',
        isActive: false,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
    ],
  },
  {
    locale: 'zh-TW',
    plans: [
      {
        name: '入門版',
        price: 0,
        description: '基本功能免費版本',
        features: [
          {
            name: 'storage',
            value: '10GB',
            description: '儲存空間',
          },
          {
            name: 'ai_assistant',
            value: 'Limited',
            description: 'AI 助手功能',
          },
          {
            name: 'team_members',
            value: '1',
            description: '團隊成員數',
          },
        ],
        remarks: '',
        isActive: true,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
      {
        name: '專業版',
        price: 899,
        description: '進階功能專業版本',
        features: [
          {
            name: 'storage',
            value: '1TB',
            description: '儲存空間',
          },
          {
            name: 'ai_assistant',
            value: 'Unlimited',
            description: 'AI 助手功能',
          },
          {
            name: 'team_members',
            value: '10',
            description: '團隊成員數',
          },
        ],
        remarks: '',
        isActive: false,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
      {
        name: '企業版',
        price: 8990,
        description: '完整功能企業版本',
        features: [
          {
            name: 'storage',
            value: 'Unlimited',
            description: '儲存空間',
          },
          {
            name: 'ai_assistant',
            value: 'Advanced functions',
            description: 'AI 助手進階功能',
          },
          {
            name: 'team_members',
            value: 'Unlimited',
            description: '無限團隊成員',
          },
        ],
        remarks: '',
        isActive: false,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
    ],
  },
  {
    locale: 'zh-CN',
    plans: [
      {
        name: '入门版',
        price: 0,
        description: '基本功能免费版本',
        features: [
          {
            name: 'storage',
            value: '10GB',
            description: '存储空间',
          },
          {
            name: 'ai_assistant',
            value: 'Limited',
            description: 'AI 助手功能',
          },
          {
            name: 'team_members',
            value: '1',
            description: '团队成员数',
          },
        ],
        remarks: '',
        isActive: true,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
      {
        name: '专业版',
        price: 899,
        description: '进阶功能专业版本',
        features: [
          {
            name: 'storage',
            value: '1TB',
            description: '存储空间',
          },
          {
            name: 'ai_assistant',
            value: 'Unlimited',
            description: 'AI 助手功能',
          },
          {
            name: 'team_members',
            value: '10',
            description: '团队成员数',
          },
        ],
        remarks: '',
        isActive: false,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
      {
        name: '企业版',
        price: 8990,
        description: '完整功能企业版本',
        features: [
          {
            name: 'storage',
            value: 'Unlimited',
            description: '存储空间',
          },
          {
            name: 'ai_assistant',
            value: 'Advanced functions',
            description: 'AI 助手进阶功能',
          },
          {
            name: 'team_members',
            value: 'Unlimited',
            description: '无限团队成员',
          },
        ],
        remarks: '',
        isActive: false,
        createdAt: 1725372460,
        updatedAt: 1725372460,
        deletedAt: 0,
      },
    ],
  },
];

async function handleGetRequest() {
  const statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  const payload = mockPaymentPlans;
  return { statusMessage, payload };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILocalizedPaymentPlan[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ILocalizedPaymentPlan[] = [];

  try {
    if (req.method === 'GET') {
      ({ statusMessage, payload } = await handleGetRequest());
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<ILocalizedPaymentPlan[]>(statusMessage, payload);
    res.status(httpCode).json({
      ...result,
      powerby: 'iSunFA v0.9.1+19',
    });
  }
}
