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
  return docDim === coefDim && docDim !== PhysicalDimension.UNKNOWN;
};
