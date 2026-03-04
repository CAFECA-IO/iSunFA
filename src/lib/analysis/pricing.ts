export interface IOrderParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
}

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

const BASE_COSTS: Record<string, number> = {
  // Info: (20260128 - Luphia) Basic Financials
  'balance_sheet': 10,
  'cash_flow': 10,
  'income_statement': 10,

  // Info: (20260128 - Luphia) Advanced
  'financial_compliance': 20,
  'financial_health': 20,
  'irsc': 20,

  // Info: (20260128 - Luphia) External
  'market_trends': 50,
  'industry_development': 50,
  'financial_product_rating': 50,
};

const PERIOD_MULTIPLIERS: Record<string, number> = {
  // Info: (20260128 - Luphia) Multipliers by Period
  'daily': 1,
  'weekly': 1.5,
  'monthly': 3,
  'seasonly': 5,
  'yearly': 10,
};

export function getAnalysisCost(params: IOrderParams): number {
  const baseCost = BASE_COSTS[params.category] || 10; // Info: (20260128 - Luphia) Default to 10 if unknown
  const multiplier = PERIOD_MULTIPLIERS[params.periodType] || 1;

  return Math.round(baseCost * multiplier);
}
