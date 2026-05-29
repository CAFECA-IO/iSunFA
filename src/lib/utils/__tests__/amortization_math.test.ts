import {
  calculateAmortizationForMonth,
  getInclusiveDays,
} from "@/lib/utils/amortization_math";
import Decimal from "decimal.js";
import { describe, it, expect } from "@jest/globals";

describe("Amortization Math - Pro-rata temporis", () => {
  describe("getInclusiveDays", () => {
    it("should correctly calculate days within the same month", () => {
      const start = new Date(Date.UTC(2026, 0, 15)); // Info: (20260526 - Tzuhan) Jan 15
      const end = new Date(Date.UTC(2026, 0, 31)); // Info: (20260526 - Tzuhan) Jan 31
      expect(getInclusiveDays(start, end)).toBe(17);
    });

    it("should correctly calculate days across months", () => {
      const start = new Date(Date.UTC(2026, 0, 15)); // Info: (20260526 - Tzuhan) Jan 15
      const end = new Date(Date.UTC(2026, 2, 14)); // Info: (20260526 - Tzuhan) Mar 14
      // Info: (20260526 - Tzuhan) Jan: 17 days, Feb: 28 days, Mar: 14 days => 59 days
      expect(getInclusiveDays(start, end)).toBe(59);
    });
  });

  describe("calculateAmortizationForMonth", () => {
    it("should perfectly balance a 3-month contract spanning mid-month to mid-month", () => {
      const totalAmount = new Decimal(100000);
      const startDate = new Date(Date.UTC(2026, 0, 15)); // Info: (20260526 - Tzuhan) Jan 15, 2026
      const endDate = new Date(Date.UTC(2026, 2, 14)); // Info: (20260526 - Tzuhan) Mar 14, 2026
      // Info: (20260526 - Tzuhan) total days = 59

      // Info: (20260526 - Tzuhan) Month 1: Jan
      const targetMonth1 = new Date(Date.UTC(2026, 0, 1));
      let amortizedAmount = new Decimal(0);
      const amt1 = calculateAmortizationForMonth(
        totalAmount,
        amortizedAmount,
        startDate,
        endDate,
        targetMonth1,
      );
      // Info: (20260526 - Tzuhan) Jan: 17 days => 100000 * 17 / 59 = 28813.559 => 28814
      expect(amt1.toNumber()).toBe(28814);

      amortizedAmount = amortizedAmount.plus(amt1);

      // Info: (20260526 - Tzuhan) Month 2: Feb
      const targetMonth2 = new Date(Date.UTC(2026, 1, 1));
      const amt2 = calculateAmortizationForMonth(
        totalAmount,
        amortizedAmount,
        startDate,
        endDate,
        targetMonth2,
      );
      // Info: (20260526 - Tzuhan) Feb: 28 days => 100000 * 28 / 59 = 47457.627 => 47458
      expect(amt2.toNumber()).toBe(47458);

      amortizedAmount = amortizedAmount.plus(amt2);

      // Info: (20260526 - Tzuhan) Month 3: Mar (Final month)
      const targetMonth3 = new Date(Date.UTC(2026, 2, 1));
      const amt3 = calculateAmortizationForMonth(
        totalAmount,
        amortizedAmount,
        startDate,
        endDate,
        targetMonth3,
      );
      // Info: (20260526 - Tzuhan) Mar: Should eat the tail. 100000 - (28814 + 47458) = 23728
      expect(amt3.toNumber()).toBe(23728);

      amortizedAmount = amortizedAmount.plus(amt3);

      expect(amortizedAmount.toNumber()).toBe(100000);
    });
  });
});
