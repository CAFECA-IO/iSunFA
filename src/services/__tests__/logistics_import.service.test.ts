import {
  LogisticsImportService,
  logisticsRowSchema,
} from "@/services/logistics_import.service";
import { describe, it, expect, beforeEach } from "@jest/globals";

describe("LogisticsImportService", () => {
  let service: LogisticsImportService;

  beforeEach(() => {
    service = new LogisticsImportService();
  });

  describe("Zod Schema Validation", () => {
    it("should pass valid data", () => {
      const validData = {
        origin: "台北",
        destination: "高雄",
        weightKg: 1500.5,
        transportationMode: "卡車",
      };
      const result = logisticsRowSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should fail when missing origin", () => {
      const invalidData = {
        destination: "高雄",
        weightKg: 1500,
        transportationMode: "卡車",
      };
      const result = logisticsRowSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should convert string weight to number", () => {
      const data = {
        origin: "A",
        destination: "B",
        weightKg: "123.4",
        transportationMode: "船",
      };
      const result = logisticsRowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weightKg).toBe(123.4);
      }
    });
  });

  describe("previewData", () => {
    it("should return valid result and count successes", () => {
      const rows = [
        {
          origin: "A",
          destination: "B",
          weightKg: 10,
          transportationMode: "TRUCK",
        },
        {
          origin: "C",
          destination: "D",
          weightKg: 20,
          transportationMode: "SHIP",
        },
      ];
      const result = service.previewData(rows);
      expect(result.valid).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("should return errors for invalid rows", () => {
      const rows = [
        {
          origin: "A",
          destination: "B",
          weightKg: 10,
          transportationMode: "TRUCK",
        },
        { origin: "", destination: "D", weightKg: -5, transportationMode: "" }, // Invalid
      ];
      const result = service.previewData(rows);
      expect(result.valid).toBe(false);
      expect(result.successCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].index).toBe(1);
    });
  });
});
