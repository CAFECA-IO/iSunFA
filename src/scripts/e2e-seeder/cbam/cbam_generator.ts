import * as fs from "fs";
import * as path from "path";
import { SemanticAccountMatcher } from "@/lib/utils/semantic_account_matcher";
import { UniversalAccountTag } from "@/constants/enums";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { IBomData, ISimulatedVoucher, IPrecursorReconciliation } from "@/interfaces/cbam";

// Info: (20260605 - Tzuhan) Reverse-Engineering Constants
const MOCK_ELECTRICITY_PRICE = 3.5; // Info: (20260605 - Tzuhan) NTD/kWh
const MOCK_STEEL_PRICE = 30; // Info: (20260605 - Tzuhan) NTD/kg
const TAIPOWER_EMISSION_FACTOR_2023 = 0.495; // Info: (20260605 - Tzuhan) kgCO2e/kWh


export const runCbamGenerator = (stockId: string, year: string = "2024") => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const vouchersPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "simulated_vouchers.json",
  );
  const bomsPath = path.join(
    dataDir,
    "outputs",
    "mock_sources",
    "boms_and_precursors.json",
  );
  const outPath = path.join(
    dataDir,
    "outputs",
    "cbam_reconciliation_report.json",
  );

  if (!fs.existsSync(vouchersPath)) {
    console.error(`[ERROR] Missing simulated_vouchers.json for ${stockId} at ${vouchersPath}`);
    process.exit(1);
  }

  const vouchers: ISimulatedVoucher[] = JSON.parse(fs.readFileSync(vouchersPath, "utf-8"));
  let bomsData: IBomData | null = null;
  if (fs.existsSync(bomsPath)) {
    bomsData = JSON.parse(fs.readFileSync(bomsPath, "utf-8"));
    console.log(`[INFO] Loaded BOMs data from ${bomsPath}`);
  } else {
    console.warn(`[WARN] Missing BOMs data at ${bomsPath}. Precursor carbon emissions will use fallback values.`);
  }

  // Info: (20260605 - Tzuhan) 1. Build a map of precursor suppliers and their emission factors
  const supplierFactors = new Map<string, number>();
  if (bomsData && bomsData.products) {
    for (const product of bomsData.products) {
      if (product.bom) {
        for (const pre of product.bom) {
          if (pre.supplierName && pre.embeddedEmissionsKgCO2ePerKg) {
            supplierFactors.set(pre.supplierName, pre.embeddedEmissionsKgCO2ePerKg);
          }
        }
      }
    }
  }

  console.log(`[INFO] Reverse-Engineering CBAM Data from ${vouchers.length} Vouchers...`);

  // Info: (20260605 - Tzuhan) 2. Aggregate Vouchers
  const COGS_ACCOUNT = SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS);
  
  let totalElectricityCostNtd = 0;
  const precursorCostsNtd = new Map<string, number>();
  let totalOutsourcedCostNtd = 0;

  for (const voucher of vouchers) {
    for (const line of voucher.lines) {
      // Info: (20260605 - Tzuhan) We only care about Debit lines in COGS to reverse-engineer physical consumption
      if (line.accountingCode !== COGS_ACCOUNT) continue;
      
      // Info: (20260605 - Tzuhan) Vouchers are stored in THOUSANDS NTD, so we must multiply by 1000
      const debitAmt = (Number(line.debitAmount) || 0) * 1000;
      if (debitAmt <= 0) continue;

      if (line.vendor === "台灣電力公司") {
        totalElectricityCostNtd += debitAmt;
      } else if (line.vendor && supplierFactors.has(line.vendor)) {
        const current = precursorCostsNtd.get(line.vendor) || 0;
        precursorCostsNtd.set(line.vendor, current + debitAmt);
      } else if (line.description && line.description.includes("委外加工")) {
        totalOutsourcedCostNtd += debitAmt;
      }
    }
  }

  // Info: (20260605 - Tzuhan) 3. Reverse-Engineer Physical Quantities
  const inferredElectricityKwh = Math.floor(totalElectricityCostNtd / MOCK_ELECTRICITY_PRICE);
  const scope2EmissionsKgCo2e = Math.floor(inferredElectricityKwh * TAIPOWER_EMISSION_FACTOR_2023);

  const precursorReconciliations: IPrecursorReconciliation[] = [];
  let totalPrecursorEmissionsKgCo2e = 0;

  for (const [vendor, cost] of precursorCostsNtd.entries()) {
    const factor = supplierFactors.get(vendor) || 2.0; // Info: (20260605 - Tzuhan) fallback to 2.0 kgCO2e/kg if not found
    const inferredWeightKg = Math.floor(cost / MOCK_STEEL_PRICE);
    const emissionsKgCo2e = Math.floor(inferredWeightKg * factor);

    totalPrecursorEmissionsKgCo2e += emissionsKgCo2e;
    
    precursorReconciliations.push({
      supplierName: vendor,
      totalCostNtd: cost,
      inferredWeightKg: inferredWeightKg,
      emissionFactorKgCo2ePerKg: factor,
      totalEmissionsKgCo2e: emissionsKgCo2e
    });
  }

  // Info: (20260605 - Tzuhan) 4. Generate Audit Report
  const report = {
    metadata: {
      stockId,
      year,
      timestamp: new Date().toISOString(),
      generator: "Financial-Physical Reverse Engineering Engine"
    },
    summary: {
      totalScope2EmissionsKgCo2e: scope2EmissionsKgCo2e,
      totalPrecursorEmissionsKgCo2e: totalPrecursorEmissionsKgCo2e,
      totalOutsourcedCostNtd: totalOutsourcedCostNtd
    },
    reconciliation: {
      electricity: {
        totalCostNtd: totalElectricityCostNtd,
        inferredVolumeKwh: inferredElectricityKwh,
        priceConstantNtdPerKwh: MOCK_ELECTRICITY_PRICE,
        emissionFactor: TAIPOWER_EMISSION_FACTOR_2023
      },
      precursors: precursorReconciliations
    }
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  
  console.log(`\n🎉 [CBAM Generator] 反推完成！`);
  console.log(` - 總用電度數 (推估): ${inferredElectricityKwh.toLocaleString()} kWh`);
  console.log(` - Scope 2 碳排: ${scope2EmissionsKgCo2e.toLocaleString()} kgCO2e`);
  console.log(` - 前驅物碳排: ${totalPrecursorEmissionsKgCo2e.toLocaleString()} kgCO2e`);
  console.log(`✅ 已將 CBAM 稽核報告寫入: ${outPath}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  const year = process.argv[3] || "2024";
  
  if (!targetStock) {
    console.error(
      "Usage: tsx cbam_generator.ts <stockId> [year]",
    );
    process.exit(1);
  }
  
  runCbamGenerator(targetStock, year);
}
