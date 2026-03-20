export const INTERNAL_CATEGORIES = [
  'balance_sheet',
  'cash_flow',
  'income_statement',
  'irsc',
  'financial_compliance',
  'financial_health',
  'carbon_health_check',
  'net_zero_emissions',
] as const;

export const EXTERNAL_CATEGORIES = [
  'market_trends',
  'industry_development',
  'irsc',
  'financial_product_rating',
] as const;

export const COUNTRIES = ['tw', 'us', 'cn', 'jp', 'kr', 'eu'] as const;

export const CATEGORIES = [...INTERNAL_CATEGORIES, ...EXTERNAL_CATEGORIES] as const;

export const PERIOD_TYPES = ['yearly', 'seasonly', 'monthly', 'weekly', 'daily'] as const;
