import { IPlan, TPlanType } from '@/interfaces/subscription';

export enum SubscriptionPeriod {
  MONTHLY = 30,
  YEARLY = 365,
}

export enum SubscriptionPlanV1 {
  TRIAL = 'trial',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

// Info: (20241230 - Liz) 以下是 Beta 版本新增的 constant (訂閱方案)

export const PLANS: IPlan[] = [
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
    extraMemberPrice: 89,
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
