import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

interface IExtractedContextCache {
  financial: {
    travelExpenseRatio: number;
    utilitiesRatio: number;
    top3Vendors: string[];
    depreciationStrategy: string;
  };
  esg: {
    scope1MajorSource: string;
    scope2MajorSource: string;
    hasGreenEnergyPurchases: boolean;
  };
  simulatedNoise: {
    suggestedNoiseLevel: string;
    commonMissingFields: string[];
  };
}

interface ISimulatedVoucherLine {
  id: string;
  description: string;
  accountingCode: string;
  debitAmount: number;
  creditAmount: number;
  vendor?: string;
  esgRecords?: {
    id: string;
    category: "scope1" | "scope2" | "water" | "waste";
    source: string;
    metricAmount: number;
    metricUnit: string;
    carbonAmount: number;
  }[];
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

// Utility to search the complex ESG JSON structure
const findEsgValue = (
  esgData: Record<string, unknown>,
  codeToFind: string,
): number => {
  const treeModels =
    (esgData.treeModels as Array<Record<string, unknown>>) || [];
  for (const model of treeModels) {
    const items = (model.items as Array<Record<string, unknown>>) || [];
    for (const item of items) {
      const sections = (item.sections as Array<Record<string, unknown>>) || [];
      for (const section of sections) {
        const controls =
          (section.controls as Array<Record<string, unknown>>) || [];
        for (const control of controls) {
          if (control.code === codeToFind) {
            const val = parseFloat(control.value as string);
            return isNaN(val) ? 0 : val;
          }
        }
      }
    }
  }
  return 0;
};

export const generateEsgRecords = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const esgDataPath = path.join(dataDir, "2024_ESG_METRICS.json");
  const cachePath = path.join(dataDir, "ai_extracted_context_cache.json");
  const vouchersPath = path.join(dataDir, "simulated_vouchers.json");

  if (
    !fs.existsSync(esgDataPath) ||
    !fs.existsSync(cachePath) ||
    !fs.existsSync(vouchersPath)
  ) {
    console.error(
      `[ERROR] Missing required files for ESG Seeding for ${stockId}.`,
    );
    console.error(
      "Make sure you have run ai_vision_extractor.ts and financial_reverse_engineer.ts first.",
    );
    process.exit(1);
  }

  const esgData = JSON.parse(fs.readFileSync(esgDataPath, "utf-8"));
  const contextCache = JSON.parse(
    fs.readFileSync(cachePath, "utf-8"),
  ) as IExtractedContextCache;
  const vouchers = JSON.parse(
    fs.readFileSync(vouchersPath, "utf-8"),
  ) as ISimulatedVoucher[];

  // 1. Parse Real ESG Targets from JSON
  const scope1Target = findEsgValue(
    esgData,
    "grossScope1GreenhouseGasEmissions",
  );
  const scope2Target = findEsgValue(
    esgData,
    "grossScope2GreenhouseGasEmissions",
  );
  const waterTarget = findEsgValue(esgData, "waterConsumed");
  const wasteTarget = findEsgValue(esgData, "nonHazardousWaste");

  // 2. Map Scope 2 (Electricity) to Utilities Vouchers (Code 6161)
  const utilityLines = vouchers.flatMap((v) =>
    v.lines.filter((l) => l.accountingCode === "6161" && l.debitAmount > 0),
  );

  if (utilityLines.length > 0 && scope2Target > 0) {
    const scope2PerVoucher = scope2Target / utilityLines.length;
    utilityLines.forEach((line) => {
      line.esgRecords = line.esgRecords || [];
      line.esgRecords.push({
        id: randomUUID(),
        category: "scope2",
        source: contextCache.esg.scope2MajorSource || "台電外購電力",
        metricAmount: scope2PerVoucher * 1980, // Assuming 1 ton CO2e = 1980 kWh approx
        metricUnit: "kWh",
        carbonAmount: scope2PerVoucher,
      });
    });
  }

  // 3. Map Scope 1 (Direct) to Travel Vouchers (Code 6172)
  const travelLines = vouchers.flatMap((v) =>
    v.lines.filter((l) => l.accountingCode === "6172" && l.debitAmount > 0),
  );

  if (travelLines.length > 0 && scope1Target > 0) {
    const scope1PerVoucher = scope1Target / travelLines.length;
    travelLines.forEach((line) => {
      line.esgRecords = line.esgRecords || [];
      line.esgRecords.push({
        id: randomUUID(),
        category: "scope1",
        source: contextCache.esg.scope1MajorSource || "公司車輛燃油",
        metricAmount: scope1PerVoucher * 400, // Assuming 1 ton CO2e = 400 Liters of gasoline
        metricUnit: "Liters",
        carbonAmount: scope1PerVoucher,
      });
    });
  }

  // 4. Map Water and Waste
  if (utilityLines.length > 0 && waterTarget > 0) {
    const waterPerVoucher = waterTarget / utilityLines.length;
    const wastePerVoucher =
      wasteTarget > 0 ? wasteTarget / utilityLines.length : 0;
    utilityLines.forEach((line) => {
      line.esgRecords = line.esgRecords || [];
      line.esgRecords.push({
        id: randomUUID(),
        category: "water",
        source: "自來水",
        metricAmount: waterPerVoucher,
        metricUnit: "ton",
        carbonAmount: 0, // Water doesn't usually map directly to Scope 1/2 CO2e directly here
      });
      if (wastePerVoucher > 0) {
        line.esgRecords.push({
          id: randomUUID(),
          category: "waste",
          source: "一般廢棄物",
          metricAmount: wastePerVoucher,
          metricUnit: "ton",
          carbonAmount: 0,
        });
      }
    });
  }

  // 5. Overwrite vouchers with ESG records
  fs.writeFileSync(vouchersPath, JSON.stringify(vouchers, null, 2), "utf-8");

  console.log(
    `[SUCCESS] Embedded ESG Data into Vouchers for ${stockId}. (Scope1: ${scope1Target}t, Scope2: ${scope2Target}t)`,
  );
};

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx esg_reverse_engineer.ts 1538",
    );
    process.exit(1);
  }
  generateEsgRecords(targetStock);
}
