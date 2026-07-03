import { MeasurementUnit } from "@/constants/enums";
import { UnitDimensionMap } from "@/constants/dimension";
import { PhysicalDimension } from "@/constants/enums";
import { Decimal } from "decimal.js";

/** Info: (20260703 - Tzuhan) 定義所有單位的基準單位與轉換係數
 * 基準單位：
 * MASS: KG
 * VOLUME: LITER
 * ENERGY: KWH
 * TRANSPORT: KM
 * COUNT: PIECE
 */
const ConversionRates: Record<PhysicalDimension, Record<string, number>> = {
  [PhysicalDimension.MASS]: {
    [MeasurementUnit.KG]: 1,
    [MeasurementUnit.TONNE]: 1000,
    [MeasurementUnit.GRAM]: 0.001,
  },
  [PhysicalDimension.VOLUME]: {
    [MeasurementUnit.LITER]: 1,
    [MeasurementUnit.GALLON]: 3.78541, // Info: (20260703 - Tzuhan) US Gallon to Liter
    [MeasurementUnit.M3]: 1000, // Info: (20260703 - Tzuhan) 1 Cubic Meter = 1000 Liters
  },
  [PhysicalDimension.ENERGY]: {
    [MeasurementUnit.KWH]: 1,
    [MeasurementUnit.MWH]: 1000,
    [MeasurementUnit.GJ]: 277.778, // Info: (20260703 - Tzuhan) 1 GJ = 277.778 kWh
  },
  [PhysicalDimension.TRANSPORT]: {
    [MeasurementUnit.KM]: 1,
    [MeasurementUnit.TKM]: 1, // Info: (20260703 - Tzuhan) Tonne-kilometer can be complex, assuming 1:1 base for distance part for now unless specified
    [MeasurementUnit.PKM]: 1, // Info: (20260703 - Tzuhan) Passenger-kilometer
  },
  [PhysicalDimension.COUNT]: {
    [MeasurementUnit.PIECE]: 1,
  },
  [PhysicalDimension.MONEY]: {},
  [PhysicalDimension.UNKNOWN]: {},
  [PhysicalDimension.AREA]: {},
  [PhysicalDimension.TIME]: {},
  [PhysicalDimension.TEMPERATURE]: {},
  [PhysicalDimension.SPEED]: {},
  [PhysicalDimension.INTENSITY]: {},
};

export class UnitConverter {
  /**
   * Info: (20260703 - Tzuhan)
   * 將來源數值從來源單位轉換為目標單位
   */
  public static convert(
    amount: number | string | Decimal,
    fromUnit: string,
    toUnit: string,
  ): Decimal {
    const decAmount = new Decimal(amount);

    // Info: (20260703 - Tzuhan) 如果單位相同，不需要轉換
    if (fromUnit === toUnit) {
      return decAmount;
    }

    const fromDimension = UnitDimensionMap[fromUnit as MeasurementUnit];
    const toDimension = UnitDimensionMap[toUnit as MeasurementUnit];

    // Info: (20260703 - Tzuhan) 量綱不一致無法轉換
    if (!fromDimension || !toDimension || fromDimension !== toDimension) {
      throw new Error(
        `Cannot convert between different dimensions: ${fromUnit} and ${toUnit}`,
      );
    }

    const dimensionRates = ConversionRates[fromDimension];

    // Info: (20260703 - Tzuhan) 找不到匯率表
    if (
      !dimensionRates ||
      !dimensionRates[fromUnit] ||
      !dimensionRates[toUnit]
    ) {
      throw new Error(`Missing conversion rate for ${fromUnit} or ${toUnit}`);
    }

    /** Info: (20260703 - Tzuhan)
     * 轉換邏輯：先將 fromUnit 轉回基準單位，再除以 toUnit 的係數
     * 例如：GALLON (3.78541) 轉為 LITER (1)
     * 10 GALLON = 10 * 3.78541 / 1 = 37.8541 LITER
     */
    const baseAmount = decAmount.mul(dimensionRates[fromUnit]);
    return baseAmount.div(dimensionRates[toUnit]);
  }
}
