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
        id: 'storage',
        name: 'Storage',
        value: '10GB',
      },
      {
        id: 'ai_assistant',
        name: 'AI assistant',
        value: 'Limited',
      },
      {
        id: 'report_generating',
        name: 'Report generating',
        value: 'Unlimited',
      },
      {
        id: 'outsourcing',
        name: 'Outsourcing',
        value: 'Taking task only',
      },
      {
        id: 'team_members',
        name: 'Team members',
        value: '1',
      },
      {
        id: 'continuous_audit',
        name: 'Continuous audit',
        value: 'Manual',
      },
      {
        id: 'support',
        name: 'Support',
        value: 'Online texting support',
      },
      {
        id: 'faith',
        name: 'FAITH',
        value: 'Public chatting only',
      },
    ],
  },
  {
    id: TPlanType.PROFESSIONAL,
    planName: 'Professional',
    price: 899,
    features: [
      {
        id: 'storage',
        name: 'Storage',
        value: '1TB',
      },
      {
        id: 'ai_assistant',
        name: 'AI assistant',
        value: 'Unlimited',
      },
      {
        id: 'outsourcing',
        name: 'Outsourcing',
        value: 'Can post requests',
      },
      {
        id: 'team_members',
        name: 'Team members',
        value: '10',
      },
      {
        id: 'continuous_audit',
        name: 'Continuous audit',
        value: 'Automatic',
      },
      {
        id: 'support',
        name: 'Support',
        value: '4h technical support /Month',
      },
      {
        id: 'faith',
        name: 'FAITH',
        value: 'Private chatting',
      },
      {
        id: 'professional_verification',
        name: 'Professional verification',
        value: 'Yes',
      },
      {
        id: 'extra_service',
        name: 'Extra service',
        value: ['100 asset tags'],
      },
    ],
  },
  {
    id: TPlanType.ENTERPRISE,
    planName: 'Enterprise',
    price: 8999,
    features: [
      {
        id: 'storage',
        name: 'Storage',
        value: 'Unlimited',
      },
      {
        id: 'report_generating',
        name: 'Report generating',
        value: 'Advanced functions',
      },
      {
        id: 'outsourcing',
        name: 'Outsourcing',
        value: 'Premium advertising',
      },
      {
        id: 'team_members',
        name: 'Team members',
        value: 'Unlimited',
      },
      {
        id: 'api_integration',
        name: 'API integration',
        value: 'Yes',
      },
      {
        id: 'support',
        name: 'Support',
        value: '48h technical support /Month',
      },
      {
        id: 'faith',
        name: 'FAITH',
        value: 'Connect to financial reports',
      },
      {
        id: 'extra_service',
        name: 'Extra service',
        value: ['100 asset tags', 'Physical servers', 'Offline deployment', 'Hardware integration'],
      },
    ],
  },
];
