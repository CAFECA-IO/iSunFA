import { type AnalysisPeriod } from "@/constants/analysis";

/**
 * Info: (20260128 - Luphia) Pricing Logic:
 * - Base Cost:
 *   - Financial Reports (Balance/Cash/Income): 100
 *   - Advanced (Compliance/Health/IRSC): 200
 *   - External (Market/Industry/Rating): 500
 * - Multipliers by Period:
 *   - Daily: x1
 *   - Weekly: x1.5
 *   - Monthly: x3
 *   - Seasonly: x5
 *   - Yearly: x10
 */

export const CURRENCY_UNIT = {
  TWD: "TWD",
  ICP: "ICP",
  ISC: "ISC",
} as const;

export type CurrencyUnit = (typeof CURRENCY_UNIT)[keyof typeof CURRENCY_UNIT];

export const REWARD_AMOUNTS = {
  REGISTRATION_REWARD: 100,
  DAILY_CHECKIN_REWARD: 5,
} as const;

export { ANALYSIS_CATEGORY, type AnalysisCategory, ANALYSIS_PERIOD, type AnalysisPeriod } from "@/constants/analysis";

export const ANALYSIS_BASE_COSTS: Record<string, number> = {
  // Info: (20260128 - Luphia) Basic Financials
  BALANCE_SHEET: 10,
  CASH_FLOW: 10,
  INCOME_STATEMENT: 10,

  // Info: (20260128 - Luphia) Advanced
  FINANCIAL_COMPLIANCE: 20,
  FINANCIAL_HEALTH: 20,
  IRSC: 20,
  CARBON_HEALTH_CHECK: 50,
  NET_ZERO_EMISSIONS: 50,

  // Info: (20260128 - Luphia) External
  MARKET_TRENDS: 50,
  INDUSTRY_DEVELOPMENT: 50,
  FINANCIAL_PRODUCT_RATING: 50,

  // Info: (20260408 - Luphia) AI Features
  AI_CONSULTING: 5,
  CERTIFICATE_ANALYSIS: 1,
};

export const ANALYSIS_PERIOD_MULTIPLIERS: Record<AnalysisPeriod, number> = {
  // Info: (20260128 - Luphia) Multipliers by Period
  DAILY: 1,
  WEEKLY: 1.5,
  MONTHLY: 3,
  SEASONLY: 5,
  YEARLY: 10,
};

export const ANALYSIS_ADDON_COSTS = {
  BOOKKEEPER: 3000,
  CPA: 30000,
  THIRD_PARTY: 100000,
} as const;

export const ENTERPRISE_PLAN_PRICE = {
  MACHINE: 10200 * 1.05,
  USER: 100 * 1.05,
  MODULE: 2000 * 1.05,
} as const;

export const SUBSCRIPTION_PLAN_PRICE = {
  free: {
    monthly: 0,
    yearly: 0,
  },
  team: {
    monthly: 840,
    yearly: 8400,
  },
  business: {
    monthly: 2940,
    yearly: 29400,
  },
} as const;
