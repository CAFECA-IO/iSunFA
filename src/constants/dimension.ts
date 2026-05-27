import { MeasurementUnit, PhysicalDimension } from "@/constants/enums";
import { FIAT_CURRENCIES } from "@/constants/country";

export const UnitDimensionMap: Record<MeasurementUnit, PhysicalDimension> = {
  [MeasurementUnit.KG]: PhysicalDimension.MASS,
  [MeasurementUnit.TONNE]: PhysicalDimension.MASS,
  [MeasurementUnit.GRAM]: PhysicalDimension.MASS,

  [MeasurementUnit.LITER]: PhysicalDimension.VOLUME,
  [MeasurementUnit.GALLON]: PhysicalDimension.VOLUME,
  [MeasurementUnit.M3]: PhysicalDimension.VOLUME,

  [MeasurementUnit.KWH]: PhysicalDimension.ENERGY,
  [MeasurementUnit.MWH]: PhysicalDimension.ENERGY,
  [MeasurementUnit.GJ]: PhysicalDimension.ENERGY,

  [MeasurementUnit.KM]: PhysicalDimension.TRANSPORT,
  [MeasurementUnit.TKM]: PhysicalDimension.TRANSPORT,
  [MeasurementUnit.PKM]: PhysicalDimension.TRANSPORT,

  [MeasurementUnit.PIECE]: PhysicalDimension.COUNT,
};

export const verifyDimensionalConsistency = (
  docUnit: string,
  coefUnit: string,
): boolean => {
  const getDimension = (u: string): PhysicalDimension => {
    if (UnitDimensionMap[u as MeasurementUnit]) {
      return UnitDimensionMap[u as MeasurementUnit];
    }
    if (FIAT_CURRENCIES.includes(u)) {
      return PhysicalDimension.MONEY;
    }
    return PhysicalDimension.UNKNOWN;
  };

  const docDim = getDimension(docUnit);
  const coefDim = getDimension(coefUnit);

  if (
    docDim === PhysicalDimension.UNKNOWN ||
    coefDim === PhysicalDimension.UNKNOWN
  ) {
    return false;
  }

  // Info: (20260527 - Tzuhan) [AUDIT FIX] 若兩者皆為法幣 (MONEY)，必須確保幣別嚴格吻合 (例如 USD !== TWD)
  // 否則雖然都是 MONEY 量綱，但幣別錯置會導致嚴重的碳排倍率錯誤。
  if (
    docDim === PhysicalDimension.MONEY &&
    coefDim === PhysicalDimension.MONEY
  ) {
    return docUnit === coefUnit;
  }

  return docDim === coefDim;
};
