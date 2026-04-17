import {
  ANALYSIS_BASE_COSTS,
  ANALYSIS_PERIOD_MULTIPLIERS,
} from "@/constants/price";

export interface IOrderParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
  country?: string;
  keyword?: string;
  isExternal?: boolean;
  data?: unknown; // Info: (20260418 - Luphia) Extraneous data mapping specific payload requirements
  items?: { name: string; unitPrice: number; quantity: number }[];
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

export function getAnalysisCost(params: IOrderParams): number {
  const baseCost = ANALYSIS_BASE_COSTS[params.category] || 10; // Info: (20260128 - Luphia) Default to 10 if unknown
  const multiplier = ANALYSIS_PERIOD_MULTIPLIERS[params.periodType] || 1;
  const unitCost = Math.round(baseCost * multiplier);

  if (params.items && params.items.length > 0) {
    return params.items.reduce(
      (acc, item) => acc + (item.unitPrice ?? unitCost) * item.quantity,
      0,
    );
  }

  return unitCost;
}
