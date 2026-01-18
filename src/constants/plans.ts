export const PLAN = {
  PERSONAL: 'personal',
  FREE: 'free',
  TEAM: 'team',
  BUSINESS: 'business',
} as const;

export type PlanType = typeof PLAN[keyof typeof PLAN];

export const DEFAULT_PLAN = PLAN.PERSONAL;
