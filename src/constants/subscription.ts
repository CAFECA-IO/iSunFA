import { ISubscriptionPlan, TPlanType } from '@/interfaces/subscription';

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

export const SUBSCRIPTION_PLANS: ISubscriptionPlan[] = [
  {
    id: TPlanType.BEGINNER,
    name: 'Beginner', // ToDo: (20241230 - Liz) Add translation
    price: 0,
  },
  {
    id: TPlanType.PROFESSIONAL,
    name: 'Professional',
    price: 899,
  },
  {
    id: TPlanType.ENTERPRISE,
    name: 'Enterprise',
    price: 8999,
  },
];
