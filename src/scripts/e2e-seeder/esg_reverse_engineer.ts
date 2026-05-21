import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { Prisma } from "@/generated";
import { MoneyUtil } from "@/lib/utils/money";

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
    category: "scope1" | "scope2" | "scope3" | "water" | "waste";
    source: string;
    metricAmount: string;
    metricUnit: string;
    carbonAmount: string;
  }[];
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

// Info: (20260502 - Tzuhan) 在複雜的 ESG JSON 結構中進行搜尋的工具
const findEsgValue = (
  esgData: Record<string, unknown>,
  codeToFind: string,
): Prisma.Decimal => {
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
            let rawValue = String(control.value || "").replace(/,/g, "");
            if (rawValue.startsWith("(") && rawValue.endsWith(")")) {
              rawValue = "-" + rawValue.slice(1, -1);
            }
            const dec = MoneyUtil.toDecimal(rawValue);
            return dec.isNaN()
              ? new Prisma.Decimal(0)
              : new Prisma.Decimal(dec.toString());
          }
        }
      }
    }
  }
  return new Prisma.Decimal(0);
};

export const generateEsgRecords = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const esgDataPath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    "2024_ESG_METRICS.json",
  );
  const cachePath = path.join(
    dataDir,
    "outputs",
    "phase4_vision_test",
    "ai_extracted_context_cache.json",
  );
  const vouchersPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "phase5_articulation_test",
    "simulated_vouchers.json",
  );

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

  // Info: (20260502 - Tzuhan) 1. 從 JSON 解析真實的 ESG 目標
  const scope1Target = findEsgValue(
    esgData,
    "grossScope1GreenhouseGasEmissions",
  );
  const scope2Target = findEsgValue(
    esgData,
    "grossScope2GreenhouseGasEmissions",
  );
  const scope3Target = findEsgValue(
    esgData,
    "grossScope3GreenhouseGasEmissions",
  );
  const waterTarget = findEsgValue(esgData, "waterConsumed");
  const wasteTarget = findEsgValue(esgData, "nonHazardousWaste");

  // Info: (20260502 - Tzuhan) 2. 將範疇二 (電力) 映射至水電費傳票 (代碼 6288)
  const utilityLines = vouchers.flatMap((v) =>
    v.lines.filter((l) => l.accountingCode === "6288" && l.debitAmount > 0),
  );

  if (utilityLines.length > 0 && scope2Target.gt(0)) {
    const scope2PerVoucher = scope2Target.div(utilityLines.length);
    utilityLines.forEach((line) => {
      line.esgRecords = line.esgRecords || [];
      line.esgRecords.push({
        id: randomUUID(),
        category: "scope2",
        source: contextCache.esg.scope2MajorSource || "台電外購電力",
        metricAmount: scope2PerVoucher.mul(1980).toString(), // Info: (20260502 - Tzuhan) 假設 1 噸 CO2e 約等於 1980 度電
        metricUnit: "kWh",
        carbonAmount: scope2PerVoucher.toString(),
      });
    });
  }

  // Info: (20260502 - Tzuhan) 3. 將範疇一 (直接排放) 映射至交通費傳票 (代碼 6213)
  const travelLines = vouchers.flatMap((v) =>
    v.lines.filter((l) => l.accountingCode === "6213" && l.debitAmount > 0),
  );

  if (travelLines.length > 0 && scope1Target.gt(0)) {
    const scope1PerVoucher = scope1Target.div(travelLines.length);
    travelLines.forEach((line) => {
      line.esgRecords = line.esgRecords || [];
      line.esgRecords.push({
        id: randomUUID(),
        category: "scope1",
        source: contextCache.esg.scope1MajorSource || "公司車輛燃油",
        metricAmount: scope1PerVoucher.mul(400).toString(), // Info: (20260502 - Tzuhan) 假設 1 噸 CO2e 約等於 400 公升汽油
        metricUnit: "Liters",
        carbonAmount: scope1PerVoucher.toString(),
      });
    });
  }

  // Info: (20260504 - Tzuhan) 將範疇三 (其他間接排放) 映射至其他管理費用傳票 (代碼 6288)
  const opexLines = vouchers.flatMap((v) =>
    v.lines.filter((l) => l.accountingCode === "6288" && l.debitAmount > 0),
  );

  if (opexLines.length > 0 && scope3Target.gt(0)) {
    const scope3PerVoucher = scope3Target.div(opexLines.length);
    opexLines.forEach((line) => {
      line.esgRecords = line.esgRecords || [];
      line.esgRecords.push({
        id: randomUUID(),
        category: "scope3",
        source: "其他供應鏈間接排放",
        metricAmount: scope3PerVoucher.mul(100).toString(), // Info: (20260504 - Tzuhan) 假設 1 噸 CO2e 約對應 100 單位物料
        metricUnit: "Pieces",
        carbonAmount: scope3PerVoucher.toString(),
      });
    });
  }

  // Info: (20260502 - Tzuhan) 4. 映射用水與廢棄物
  if (utilityLines.length > 0 && waterTarget.gt(0)) {
    const waterPerVoucher = waterTarget.div(utilityLines.length);
    const wastePerVoucher = wasteTarget.gt(0)
      ? wasteTarget.div(utilityLines.length)
      : new Prisma.Decimal(0);
    utilityLines.forEach((line) => {
      line.esgRecords = line.esgRecords || [];
      line.esgRecords.push({
        id: randomUUID(),
        category: "water",
        source: "自來水",
        metricAmount: waterPerVoucher.toString(),
        metricUnit: "ton",
        carbonAmount: "0", // Info: (20260502 - Tzuhan) 用水通常不會直接映射到這裡的範疇一或範疇二的碳排放量
      });
      if (wastePerVoucher.gt(0)) {
        line.esgRecords.push({
          id: randomUUID(),
          category: "waste",
          source: "一般廢棄物",
          metricAmount: wastePerVoucher.toString(),
          metricUnit: "ton",
          carbonAmount: "0",
        });
      }
    });
  }

  // Info: (20260502 - Tzuhan) 5. 將 ESG 紀錄覆寫回傳票
  fs.writeFileSync(vouchersPath, JSON.stringify(vouchers, null, 2), "utf-8");

  console.log(
    `[SUCCESS] Embedded ESG Data into Vouchers for ${stockId}. (Scope1: ${scope1Target.toString()}t, Scope2: ${scope2Target.toString()}t, Scope3: ${scope3Target.toString()}t)`,
  );
};

// Info: (20260502 - Tzuhan) 如果直接執行此腳本
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
