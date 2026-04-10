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

export const REWARD_AMOUNTS = {
  REGISTRATION_REWARD: 100,
  DAILY_CHECKIN_REWARD: 5,
} as const;

export const ANALYSIS_BASE_COSTS: Record<string, number> = {
  // Info: (20260128 - Luphia) Basic Financials
  balance_sheet: 10,
  cash_flow: 10,
  income_statement: 10,

  // Info: (20260128 - Luphia) Advanced
  financial_compliance: 20,
  financial_health: 20,
  irsc: 20,
  carbon_health_check: 50,
  net_zero_emissions: 50,

  // Info: (20260128 - Luphia) External
  market_trends: 50,
  industry_development: 50,
  financial_product_rating: 50,

  // Info: (20260408 - Luphia) AI Features
  ai_talk: 5,
  journal_upload: 1,
};

export const ANALYSIS_PERIOD_MULTIPLIERS: Record<string, number> = {
  // Info: (20260128 - Luphia) Multipliers by Period
  daily: 1,
  weekly: 1.5,
  monthly: 3,
  seasonly: 5,
  yearly: 10,
};
