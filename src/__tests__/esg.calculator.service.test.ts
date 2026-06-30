import { EsgCalculatorService } from "@/services/esg.calculator.service";
import { describe, it, expect } from "@jest/globals";

describe("EsgCalculatorService", () => {
  it("should calculate standard emissions correctly when no ghgFactors exist", () => {
    const coefficient = {
      emissionFactor: 0.5,
    };
    const result = EsgCalculatorService.calculateEmissions(100, coefficient);
    expect(result.emissions).toBe("50");
    expect(result.ghgBreakdown).toBeUndefined();
  });

  it("should calculate multi-gas emissions correctly using IPCC_AR6 by default", () => {
    // Info: (20260630 - Tzuhan) Example: A coefficient that has 1 kg CO2 and 0.001 kg CH4 per unit
    const coefficient = {
      emissionFactor: 0,
      ghgFactors: {
        CO2: 1,
        CH4: 0.001,
      },
    };

    const result = EsgCalculatorService.calculateEmissions(100, coefficient);

    // CO2 breakdown: 100 * 1 = 100 kg CO2
    // CH4 breakdown: 100 * 0.001 = 0.1 kg CH4
    expect(result.ghgBreakdown).toEqual({
      CO2: "100",
      CH4: "0.1",
    });

    // CO2e total: 100 * 1 (GWP) + 0.1 * 27.9 (GWP) = 100 + 2.79 = 102.79
    expect(result.emissions).toBe("102.79");
    expect(result.gwpVersion).toBe("IPCC_AR6");
  });

  it("should calculate F-Gas direct weight correctly", () => {
    const coefficient = {
      emissionFactor: 0,
      ghgFactors: {
        SF6: 1, // Direct weight of SF6
      },
    };

    const result = EsgCalculatorService.calculateEmissions(2.5, coefficient);

    // SF6 breakdown: 2.5 * 1 = 2.5 kg SF6
    expect(result.ghgBreakdown).toEqual({
      SF6: "2.5",
    });

    // CO2e total: 2.5 * 24300 (AR6 GWP) = 60750
    expect(result.emissions).toBe("60750");
  });
});
