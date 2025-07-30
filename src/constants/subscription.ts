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
        id: 'beginner_2',
        name: 'JOINABLE_TEAM_LIMIT',
        value: 'UNLIMITED',
      },
      {
        id: 'beginner_3',
        name: 'OWNED_TEAM_MEMBER_LIMIT',
        value: 'LIMIT_1_MEMBER',
      },
      {
        id: 'beginner_4',
        name: 'OWNED_TEAM_LEDGER_LIMIT',
        value: 'LIMIT_1_LEDGER',
      },
      {
        id: 'beginner_5',
        name: 'CERTIFICATE_MANAGEMENT',
        value: 'VIEW_ONLY',
      },
      {
        id: 'beginner_6',
        name: 'VOUCHER_MANAGEMENT',
        value: 'VIEW_ONLY',
      },
      {
        id: 'beginner_7',
        name: 'STORAGE',
        value: 'STORAGE_10GB',
      },
      {
        id: 'beginner_8',
        name: 'TRIAL_BALANCE',
        value: 'AVAILABLE_TB',
      },
      {
        id: 'beginner_9',
        name: 'LEDGER',
        value: 'AVAILABLE_LEDGER',
      },
      {
        id: 'beginner_10',
        name: 'FINANCIAL_REPORTS',
        value: 'DAILY_DOWNLOADABLE',
      },
      {
        id: 'beginner_11',
        name: 'TECH_ADVANTAGE',
        value: 'HOMOMORPHIC_ENCRYPTION_BLOCKCHAIN',
      },
    ],
    comparison: {
      PRICE: 'PRICE',
      JOINABLE_TEAM_LIMIT: 'JOINABLE_TEAM_LIMIT',
      OWNED_TEAM_MEMBER_LIMIT: 'OWNED_TEAM_MEMBER_LIMIT',
      OWNED_TEAM_LEDGER_LIMIT: 'OWNED_TEAM_LEDGER_LIMIT',
      CERTIFICATE_MANAGEMENT: 'CERTIFICATE_MANAGEMENT',
      VOUCHER_MANAGEMENT: 'VOUCHER_MANAGEMENT',
      STORAGE: 'STORAGE',
      TRIAL_BALANCE: 'TRIAL_BALANCE',
      GENERAL_LEDGER: 'GENERAL_LEDGER',
      FINANCIAL_REPORTS: 'FINANCIAL_REPORTS',
      TECH_ADVANTAGE: 'TECH_ADVANTAGE',
    },
  },
  {
    id: TPlanType.PROFESSIONAL,
    planName: 'Professional',
    price: 899,
    extraMemberPrice: 89,
    features: [
      {
        id: 'professional_2',
        name: 'EVERY_OWNED_TEAM_MEMBER_LIMIT',
        value: 'LIMIT_3_MEMBERS_PAID_EXTENSION',
      },
      {
        id: 'professional_3',
        name: 'OWNED_TEAM_LEDGER_LIMIT',
        value: 'UNLIMITED',
      },
      {
        id: 'professional_4',
        name: 'CERTIFICATE_MANAGEMENT',
        value: 'UPLOAD_UNLIMITED',
      },
      {
        id: 'professional_5',
        name: 'VOUCHER_MANAGEMENT',
        value: 'EDIT_UNLIMITED',
      },
      {
        id: 'professional_6',
        name: 'STORAGE',
        value: 'STORAGE_50GB',
      },
      {
        id: 'professional_7',
        name: 'CONTINUOUS_AUDIT',
        value: 'AUTO_EMBED_DISCLOSURE',
      },
      {
        id: 'professional_8',
        name: 'EARLY_ACCESS',
        value: 'LATEST_FEATURES_FIRST',
      },
    ],
    comparison: {
      PRICE: 'PRICE',
      FREE_TRIAL: 'FREE_TRIAL',
      JOINABLE_TEAM_LIMIT: 'JOINABLE_TEAM_LIMIT',
      OWNED_TEAM_MEMBER_LIMIT: 'OWNED_TEAM_MEMBER_LIMIT',
      OWNED_TEAM_LEDGER_LIMIT: 'OWNED_TEAM_LEDGER_LIMIT',
      CERTIFICATE_MANAGEMENT: 'CERTIFICATE_MANAGEMENT',
      VOUCHER_MANAGEMENT: 'VOUCHER_MANAGEMENT',
      STORAGE: 'STORAGE',
      TRIAL_BALANCE: 'TRIAL_BALANCE',
      GENERAL_LEDGER: 'GENERAL_LEDGER',
      FINANCIAL_REPORTS: 'FINANCIAL_REPORTS',
      TECH_ADVANTAGE: 'TECH_ADVANTAGE',
      CONTINUOUS_AUDIT: 'CONTINUOUS_AUDIT',
      EARLY_ACCESS: 'EARLY_ACCESS',
      UNSUBSCRIBE: 'UNSUBSCRIBE',
    },
  },
  {
    id: TPlanType.ENTERPRISE,
    planName: 'Enterprise',
    price: 2399,
    extraMemberPrice: 89,
    features: [
      {
        id: 'enterprise_1',
        name: 'STORAGE',
        value: 'STORAGE_200GB',
      },
      {
        id: 'enterprise_2',
        name: 'AI_MODEL_ASSISTANCE',
        value: 'META_LLAMA',
      },
      {
        id: 'enterprise_3',
        name: 'ENTERPRISE_SUPPORT',
        value: 'TURN_KEY_AND_MCP',
      },
      {
        id: 'enterprise_4',
        name: 'EARLY_ACCESS',
        value: 'LATEST_FEATURES_FIRST_ENTERPRISE',
      },
    ],
    comparison: {
      PRICE: 'PRICE',
      JOINABLE_TEAM_LIMIT: 'JOINABLE_TEAM_LIMIT',
      OWNED_TEAM_MEMBER_LIMIT: 'OWNED_TEAM_MEMBER_LIMIT',
      OWNED_TEAM_LEDGER_LIMIT: 'OWNED_TEAM_LEDGER_LIMIT',
      CERTIFICATE_MANAGEMENT: 'CERTIFICATE_MANAGEMENT',
      VOUCHER_MANAGEMENT: 'VOUCHER_MANAGEMENT',
      STORAGE: 'STORAGE',
      TRIAL_BALANCE: 'TRIAL_BALANCE',
      GENERAL_LEDGER: 'GENERAL_LEDGER',
      FINANCIAL_REPORTS: 'FINANCIAL_REPORTS',
      TECH_ADVANTAGE: 'TECH_ADVANTAGE',
      CONTINUOUS_AUDIT: 'CONTINUOUS_AUDIT',
      EARLY_ACCESS: 'EARLY_ACCESS',
      AI_MODEL_ASSISTANCE: 'AI_MODEL_ASSISTANCE',
      ENTERPRISE_SUPPORT: 'ENTERPRISE_SUPPORT',
      UNSUBSCRIBE: 'UNSUBSCRIBE',
    },
  },
];

export const TRAIL_PLAN: IPlan = {
  id: TPlanType.TRIAL,
  planName: 'Trial',
  price: 0,
  features: [
    {
      id: 'professional_2',
      name: 'EVERY_OWNED_TEAM_MEMBER_LIMIT',
      value: 'LIMIT_3_MEMBERS_PAID_EXTENSION',
    },
    {
      id: 'professional_3',
      name: 'OWNED_TEAM_LEDGER_LIMIT',
      value: 'UNLIMITED',
    },
    {
      id: 'professional_4',
      name: 'CERTIFICATE_MANAGEMENT',
      value: 'UPLOAD_UNLIMITED',
    },
    {
      id: 'professional_5',
      name: 'VOUCHER_MANAGEMENT',
      value: 'EDIT_UNLIMITED',
    },
    {
      id: 'professional_6',
      name: 'STORAGE',
      value: 'STORAGE_50GB',
    },
    {
      id: 'professional_7',
      name: 'CONTINUOUS_AUDIT',
      value: 'AUTO_EMBED_DISCLOSURE',
    },
    {
      id: 'professional_8',
      name: 'EARLY_ACCESS',
      value: 'LATEST_FEATURES_FIRST',
    },
  ],
};
