import { describe, it, expect } from "@jest/globals";
import { UnitConverter } from "@/lib/utils/unit_converter";
import { MeasurementUnit } from "@/constants/enums";

describe("UnitConverter", () => {
  it("should convert Mass correctly", () => {
    // Info: (20260703 - Tzuhan) 1000 KG -> 1 TONNE
    expect(
      UnitConverter.convert(
        1000,
        MeasurementUnit.KG,
        MeasurementUnit.TONNE,
      ).toNumber(),
    ).toBe(1);

    // Info: (20260703 - Tzuhan) 1 TONNE -> 1000000 GRAM
    expect(
      UnitConverter.convert(
        1,
        MeasurementUnit.TONNE,
        MeasurementUnit.GRAM,
      ).toNumber(),
    ).toBe(1000000);
  });

  it("should convert Volume correctly", () => {
    // Info: (20260703 - Tzuhan) 10 GALLON -> ~37.8541 LITER
    expect(
      UnitConverter.convert(
        10,
        MeasurementUnit.GALLON,
        MeasurementUnit.LITER,
      ).toNumber(),
    ).toBeCloseTo(37.8541);

    // Info: (20260703 - Tzuhan) 1 M3 -> 1000 LITER
    expect(
      UnitConverter.convert(
        1,
        MeasurementUnit.M3,
        MeasurementUnit.LITER,
      ).toNumber(),
    ).toBe(1000);
  });

  it("should convert Energy correctly", () => {
    // Info: (20260703 - Tzuhan)1 MWH -> 1000 KWH
    expect(
      UnitConverter.convert(
        1,
        MeasurementUnit.MWH,
        MeasurementUnit.KWH,
      ).toNumber(),
    ).toBe(1000);

    // Info: (20260703 - Tzuhan) 1 GJ -> 277.778 KWH
    expect(
      UnitConverter.convert(
        1,
        MeasurementUnit.GJ,
        MeasurementUnit.KWH,
      ).toNumber(),
    ).toBeCloseTo(277.778);
  });

  it("should return same value if units are identical", () => {
    expect(
      UnitConverter.convert(
        50,
        MeasurementUnit.LITER,
        MeasurementUnit.LITER,
      ).toNumber(),
    ).toBe(50);
  });

  it("should throw error when converting across dimensions", () => {
    expect(() => {
      UnitConverter.convert(1, MeasurementUnit.LITER, MeasurementUnit.KG);
    }).toThrow("Cannot convert between different dimensions: LITER and KG");
  });
});
