import { Prisma } from "@/generated";
import { describe, it, expect } from "@jest/globals";
import { UncertaintyCalculator } from "@/lib/report/uncertainty_calculator";
import { PRIMARY_DATA_DISCOUNT } from "@/constants/esg";

describe("UncertaintyCalculator", () => {
  describe("adjustUncertaintyByType", () => {
    it("should discount PRIMARY data", () => {
      const base = new Prisma.Decimal(0.1);
      const result = UncertaintyCalculator.adjustUncertaintyByType(
        base,
        "PRIMARY",
      );
      expect(result.toNumber()).toBeCloseTo(
        0.1 * PRIMARY_DATA_DISCOUNT.toNumber(),
      );
    });

    it("should not discount SECONDARY data", () => {
      const base = new Prisma.Decimal(0.1);
      const result = UncertaintyCalculator.adjustUncertaintyByType(
        base,
        "SECONDARY",
      );
      expect(result.toNumber()).toBe(0.1);
    });
  });

  describe("calculateRecordUncertainty", () => {
    it("should calculate root sum square of uAd and uEf", () => {
      const uAd = new Prisma.Decimal(0.03); // 3%
      const uEf = new Prisma.Decimal(0.04); // 4%
      const result = UncertaintyCalculator.calculateRecordUncertainty(uAd, uEf);
      // sqrt(0.03^2 + 0.04^2) = 0.05
      expect(result.toNumber()).toBeCloseTo(0.05);
    });
  });

  describe("calculateAggregatedUncertainty", () => {
    it("should calculate correctly for multiple items", () => {
      const items = [
        {
          emissions: new Prisma.Decimal(100),
          uncertainty: new Prisma.Decimal(0.05),
        },
        {
          emissions: new Prisma.Decimal(200),
          uncertainty: new Prisma.Decimal(0.1),
        },
      ];
      const result =
        UncertaintyCalculator.calculateAggregatedUncertainty(items);
      // sumEmissions = 300
      // variance = (100*0.05)^2 + (200*0.10)^2 = 5^2 + 20^2 = 25 + 400 = 425
      // rootSumVariance = sqrt(425) ≈ 20.615528
      // result = 20.615528 / 300 ≈ 0.068718
      expect(result.toNumber()).toBeCloseTo(0.068718, 5);
    });

    it("should return 0 for empty array", () => {
      const result = UncertaintyCalculator.calculateAggregatedUncertainty([]);
      expect(result.toNumber()).toBe(0);
    });

    it("should return 0 if total emissions is 0", () => {
      const items = [
        {
          emissions: new Prisma.Decimal(0),
          uncertainty: new Prisma.Decimal(0.05),
        },
        {
          emissions: new Prisma.Decimal(0),
          uncertainty: new Prisma.Decimal(0.1),
        },
      ];
      const result =
        UncertaintyCalculator.calculateAggregatedUncertainty(items);
      expect(result.toNumber()).toBe(0);
    });
  });
});
