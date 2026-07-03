import { Decimal } from "decimal.js";
import { IPCC_AR6_GWP_100, DEFAULT_GWP_VERSION } from "@/constants/gwp";
import { MoneyUtil } from "@/lib/utils/money";

export interface ICalculationResult {
  emissions: string;
  ghgBreakdown?: Record<string, string>;
  gwpVersion?: string;
}

export interface ICoefficientInput {
  emissionFactor: string | number;
  ghgFactors?: Record<string, number> | unknown;
}

export class EsgCalculatorService {
  /**
   * Info: (20260630 - Tzuhan)
   * Calculates the CO2e emissions based on activity amount and multi-gas coefficient.
   */
  public static calculateEmissions(
    amount: string | number,
    coefficient: ICoefficientInput,
    gwpVersion: string = DEFAULT_GWP_VERSION,
  ): ICalculationResult {
    const amountStr = String(amount);

    // Info: (20260630 - Tzuhan) Legacy / Single factor path
    if (
      !coefficient.ghgFactors ||
      Object.keys(coefficient.ghgFactors).length === 0
    ) {
      const emissions = MoneyUtil.multiply(
        amountStr,
        String(coefficient.emissionFactor),
      );
      return {
        emissions,
      };
    }

    // Info: (20260630 - Tzuhan) Multi-gas path
    let totalCO2e = new Decimal(0);
    const breakdown: Record<string, string> = {};

    const gwpDict =
      gwpVersion === "IPCC_AR6" ? IPCC_AR6_GWP_100 : IPCC_AR6_GWP_100; // Extendable for AR5 etc.

    const factors = coefficient.ghgFactors as Record<string, number>;

    for (const [gas, factor] of Object.entries(factors)) {
      const gasAmount = MoneyUtil.multiply(amountStr, String(factor));
      breakdown[gas] = gasAmount;

      const gwp = gwpDict[gas] || 0;
      const co2e = MoneyUtil.multiply(gasAmount, String(gwp));

      totalCO2e = totalCO2e.plus(new Decimal(co2e));
    }

    return {
      emissions: totalCO2e.toString(),
      ghgBreakdown: breakdown,
      gwpVersion,
    };
  }
}
