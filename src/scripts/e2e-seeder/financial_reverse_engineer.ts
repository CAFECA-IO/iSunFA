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
  accountingCode: string; // e.g. 4111
  debitAmount: number;
  creditAmount: number;
  vendor?: string;
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

// Utility to parse numbers like "112,684" into absolute integers
const parseFinanceNumber = (val: string): number => {
  if (!val) return 0;
  const num = parseInt(val.replace(/,/g, ""), 10);
  return isNaN(num) ? 0 : num * 1000; // Assume reports are in thousands of NTD
};

// Utility to search for a specific row in the unstructured report list
const findReportValue = (reportList: string[][], keyword: string): number => {
  const row = reportList.find((r) => r[0].includes(keyword));
  return row ? parseFinanceNumber(row[1]) : 0;
};

// Helper to generate a random date in 2024
const getRandomDate2024 = (): string => {
  const start = new Date("2024-01-01T00:00:00.000Z").getTime();
  const end = new Date("2024-12-30T23:59:59.000Z").getTime();
  const randomMs = start + Math.random() * (end - start);
  return new Date(randomMs).toISOString();
};

export const generateFinancialVouchers = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const finDataPath = path.join(dataDir, "2024_FIN_DATA.json");
  const cachePath = path.join(dataDir, "ai_extracted_context_cache.json");

  if (!fs.existsSync(finDataPath) || !fs.existsSync(cachePath)) {
    console.error(`[ERROR] Missing required files for ${stockId}.`);
    process.exit(1);
  }

  const finData = JSON.parse(fs.readFileSync(finDataPath, "utf-8"));
  const contextCache = JSON.parse(
    fs.readFileSync(cachePath, "utf-8"),
  ) as IExtractedContextCache;

  const isList = finData.incomeStatement.reportList;
  const cfList = finData.cashFlow.reportList;

  // Extract Macro Numbers
  const totalRevenue = findReportValue(isList, "營業收入合計");
  const totalOpex = findReportValue(isList, "營業費用合計");
  const depreciation = findReportValue(cfList, "折舊費用");

  // Determine targeted amounts based on AI extraction
  const utilitiesAmount = totalOpex * contextCache.financial.utilitiesRatio;
  const travelAmount = totalOpex * contextCache.financial.travelExpenseRatio;
  // The rest of OpEx
  const otherOpexAmount = totalOpex - utilitiesAmount - travelAmount;

  const vouchers: ISimulatedVoucher[] = [];

  // ============================================
  // 1. Generate Revenue Vouchers (Sales)
  // ============================================
  // Let's create 12 monthly revenue vouchers for simplicity, or 50 random ones.
  const numSales = 50;
  const revenuePerSale = Math.floor(totalRevenue / numSales);
  for (let i = 0; i < numSales; i++) {
    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: `RV-2024-${i.toString().padStart(4, "0")}`,
      lines: [
        {
          id: randomUUID(),
          description: "日常銷貨收款",
          accountingCode: "1111", // 現金
          debitAmount: revenuePerSale,
          creditAmount: 0,
        },
        {
          id: randomUUID(),
          description: "日常銷貨收入",
          accountingCode: "4111", // 銷貨收入
          debitAmount: 0,
          creditAmount: revenuePerSale,
        },
      ],
    });
  }

  // ============================================
  // 2. Generate OpEx: Utilities (水電費)
  // ============================================
  const numUtilities = 12; // Monthly
  const utilityPerMonth = Math.floor(utilitiesAmount / numUtilities);
  for (let i = 0; i < numUtilities; i++) {
    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: `UTIL-2024-${i.toString().padStart(2, "0")}`,
      lines: [
        {
          id: randomUUID(),
          description: "當月水電瓦斯費",
          accountingCode: "6161", // 水電瓦斯費
          debitAmount: utilityPerMonth,
          creditAmount: 0,
          vendor: contextCache.financial.top3Vendors[0] || "台灣電力公司",
        },
        {
          id: randomUUID(),
          description: "支付水電瓦斯費",
          accountingCode: "1111", // 現金
          debitAmount: 0,
          creditAmount: utilityPerMonth,
        },
      ],
    });
  }

  // ============================================
  // 3. Generate OpEx: Travel (差旅費)
  // ============================================
  const numTravels = 20;
  const travelPerTrip = Math.floor(travelAmount / numTravels);
  for (let i = 0; i < numTravels; i++) {
    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: `TRV-2024-${i.toString().padStart(3, "0")}`,
      lines: [
        {
          id: randomUUID(),
          description: "業務出差機票及住宿",
          accountingCode: "6172", // 旅費
          debitAmount: travelPerTrip,
          creditAmount: 0,
        },
        {
          id: randomUUID(),
          description: "支付差旅費",
          accountingCode: "1111", // 現金
          debitAmount: 0,
          creditAmount: travelPerTrip,
        },
      ],
    });
  }

  // ============================================
  // 4. Generate OpEx: Other Expenses
  // ============================================
  const otherOpexVoucher: ISimulatedVoucher = {
    id: randomUUID(),
    tradingDate: "2024-12-31T00:00:00.000Z", // Simplify as year-end aggregate for test
    voucherNumber: "OPEX-OTHER-2024",
    lines: [
      {
        id: randomUUID(),
        description: "其他營業費用彙總",
        accountingCode: "6299", // 其他管理費用
        debitAmount: otherOpexAmount,
        creditAmount: 0,
      },
      {
        id: randomUUID(),
        description: "支付其他營業費用",
        accountingCode: "1111",
        debitAmount: 0,
        creditAmount: otherOpexAmount,
      },
    ],
  };
  vouchers.push(otherOpexVoucher);

  // ============================================
  // 5. Period-end Adjustments: Depreciation (折舊)
  // [Priority 0: Missing Accrual Adjustments]
  // ============================================
  if (depreciation > 0) {
    const depreciationVoucher: ISimulatedVoucher = {
      id: randomUUID(),
      tradingDate: "2024-12-31T23:59:59.000Z",
      voucherNumber: "ADJ-DEP-2024",
      lines: [
        {
          id: randomUUID(),
          description: "期末提列固定資產折舊",
          accountingCode: "6184", // 折舊
          debitAmount: depreciation,
          creditAmount: 0,
        },
        {
          id: randomUUID(),
          description: "累計折舊增加",
          accountingCode: "1521", // 累計折舊
          debitAmount: 0,
          creditAmount: depreciation,
        },
      ],
    };
    vouchers.push(depreciationVoucher);
  }

  // Write out the simulated vouchers
  const outPath = path.join(dataDir, "simulated_vouchers.json");
  fs.writeFileSync(outPath, JSON.stringify(vouchers, null, 2), "utf-8");
  console.log(
    `[SUCCESS] Reverse engineered ${vouchers.length} vouchers for ${stockId} and saved to simulated_vouchers.json.`,
  );
};

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx financial_reverse_engineer.ts 1538",
    );
    process.exit(1);
  }
  generateFinancialVouchers(targetStock);
}
