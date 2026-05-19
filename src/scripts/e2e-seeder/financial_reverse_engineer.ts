import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { Prisma } from "@/generated";

interface IExtractedContextCache {
  financial: {
    travelExpenseRatio: number;
    utilitiesRatio: number;
    top3Vendors: string[];
    top3Customers?: string[];
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
  accountingCode: string; // Info: (20260502 - Tzuhan) 例如 4111
  debitAmount: string;
  creditAmount: string;
  vendor?: string;
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

// Info: (20260502 - Tzuhan) 將類似 "112,684" 的數字解析為絕對整數的工具
const parseFinanceNumber = (val: string): Prisma.Decimal => {
  if (!val) return new Prisma.Decimal(0);
  const num = parseInt(val.replace(/,/g, ""), 10);
  return isNaN(num) ? new Prisma.Decimal(0) : new Prisma.Decimal(num); // Info: (20260503 - Tzuhan) 移除 .mul(1000) 以避免 Prisma Int 欄位超過 21 億上限
};

// Info: (20260502 - Tzuhan) 在非結構化報表列表中搜尋特定資料列的工具
const findReportValue = (
  reportList: string[][],
  keyword: string,
): Prisma.Decimal => {
  const row = reportList.find((r) => r[0].includes(keyword));
  return row ? parseFinanceNumber(row[1]) : new Prisma.Decimal(0);
};

// Info: (20260502 - Tzuhan) 產生 2024 年隨機日期的輔助函式
const getRandomDate2024 = (): string => {
  const start = new Date("2024-01-01T00:00:00.000Z").getTime();
  const end = new Date("2024-12-30T23:59:59.000Z").getTime();
  const randomMs = start + Math.random() * (end - start);
  return new Date(randomMs).toISOString();
};

export const generateFinancialVouchers = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const finDataPath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    "2024_FIN_DATA.json",
  );
  const cachePath = path.join(
    dataDir,
    "outputs",
    "phase4_vision_test",
    "ai_extracted_context_cache.json",
  );

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

  // Info: (20260502 - Tzuhan) 萃取宏觀數據
  const totalRevenue = findReportValue(isList, "營業收入合計");
  const totalOpex = findReportValue(isList, "營業費用合計");
  const depreciation = findReportValue(cfList, "折舊費用");

  // Info: (20260502 - Tzuhan) 根據 AI 萃取結果決定目標金額
  const utilitiesAmount = totalOpex.mul(contextCache.financial.utilitiesRatio);
  const travelAmount = totalOpex.mul(contextCache.financial.travelExpenseRatio);
  // Info: (20260502 - Tzuhan) 其餘營業費用
  const otherOpexAmount = totalOpex.sub(utilitiesAmount).sub(travelAmount);

  const vouchers: ISimulatedVoucher[] = [];

  // Info: (20260504 - Tzuhan) ============================================
  // Info: (20260502 - Tzuhan) 1. 產生銷貨收入傳票
  // Info: (20260504 - Tzuhan) ============================================
  // Info: (20260502 - Tzuhan) 為了簡化，建立 12 張月度收入傳票，或是 50 張隨機傳票。
  const numSales = 50;
  const revenuePerSale = totalRevenue.div(numSales).floor().toString();
  for (let i = 0; i < numSales; i++) {
    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: `RV-2024-${i.toString().padStart(4, "0")}`,
      lines: [
        {
          id: randomUUID(),
          description: "日常銷貨收款",
          accountingCode: "1100", // Info: (20260502 - Tzuhan) 現金
          debitAmount: revenuePerSale,
          creditAmount: "0",
          vendor: contextCache.financial.top3Customers?.[0] || "國際主力客戶",
        },
        {
          id: randomUUID(),
          description: "日常銷貨收入",
          accountingCode: "4111", // Info: (20260502 - Tzuhan) 銷貨收入
          debitAmount: "0",
          creditAmount: revenuePerSale,
        },
      ],
    });
  }

  // Info: (20260504 - Tzuhan) ============================================
  // Info: (20260502 - Tzuhan) 2. 產生營業費用：水電瓦斯費
  // Info: (20260504 - Tzuhan) ============================================
  const numUtilities = 12; // Info: (20260502 - Tzuhan) 每月
  const utilityPerMonth = utilitiesAmount.div(numUtilities).floor().toString();
  for (let i = 0; i < numUtilities; i++) {
    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: `UTIL-2024-${i.toString().padStart(2, "0")}`,
      lines: [
        {
          id: randomUUID(),
          description: "當月水電瓦斯費",
          accountingCode: "6288", // Info: (20260502 - Tzuhan) 水電瓦斯費 (改用其他管理費用)
          debitAmount: utilityPerMonth,
          creditAmount: "0",
          vendor: "台灣電力公司",
        },
        {
          id: randomUUID(),
          description: "支付水電瓦斯費",
          accountingCode: "1100", // Info: (20260502 - Tzuhan) 現金
          debitAmount: "0",
          creditAmount: utilityPerMonth,
        },
      ],
    });
  }

  // Info: (20260504 - Tzuhan) ============================================
  // Info: (20260502 - Tzuhan) 3. 產生營業費用：差旅費
  // Info: (20260504 - Tzuhan) ============================================
  const numTravels = 20;
  const travelPerTrip = travelAmount.div(numTravels).floor().toString();
  for (let i = 0; i < numTravels; i++) {
    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: `TRV-2024-${i.toString().padStart(3, "0")}`,
      lines: [
        {
          id: randomUUID(),
          description: "公司自有公務車燃油費",
          accountingCode: "6213", // Info: (20260502 - Tzuhan) 旅費/交通費
          debitAmount: travelPerTrip,
          creditAmount: "0",
          vendor: "台灣中油",
        },
        {
          id: randomUUID(),
          description: "支付差旅費",
          accountingCode: "1100", // Info: (20260502 - Tzuhan) 現金
          debitAmount: "0",
          creditAmount: travelPerTrip,
        },
      ],
    });
  }

  // Info: (20260504 - Tzuhan) ============================================
  // Info: (20260502 - Tzuhan) 4. 產生營業費用：其他費用
  // Info: (20260504 - Tzuhan) ============================================
  const otherOpexVoucher: ISimulatedVoucher = {
    id: randomUUID(),
    tradingDate: "2024-12-31T00:00:00.000Z", // Info: (20260502 - Tzuhan) 測試用，簡化為年底加總
    voucherNumber: "OPEX-OTHER-2024",
    lines: [
      {
        id: randomUUID(),
        description: "其他營業費用彙總",
        accountingCode: "6288", // Info: (20260502 - Tzuhan) 其他管理費用
        debitAmount: otherOpexAmount.floor().toString(),
        creditAmount: "0",
      },
      {
        id: randomUUID(),
        description: "支付其他營業費用",
        accountingCode: "1100",
        debitAmount: "0",
        creditAmount: otherOpexAmount.floor().toString(),
      },
    ],
  };
  vouchers.push(otherOpexVoucher);

  // Info: (20260504 - Tzuhan) ============================================
  // Info: (20260502 - Tzuhan) 5. 期末調整：折舊
  // Info: (20260502 - Tzuhan) [優先級 0: 遺漏應計調整]
  // Info: (20260504 - Tzuhan) ============================================
  if (depreciation.gt(0)) {
    const depreciationVoucher: ISimulatedVoucher = {
      id: randomUUID(),
      tradingDate: "2024-12-31T23:59:59.000Z",
      voucherNumber: "ADJ-DEP-2024",
      lines: [
        {
          id: randomUUID(),
          description: "期末提列製造費用折舊",
          accountingCode: "5110", // Info: (20260504 - Tzuhan) 銷貨成本，避免錯誤膨脹營業費用 (6XXX)
          debitAmount: depreciation.toString(),
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "累計折舊增加",
          accountingCode: "1613", // Info: (20260504 - Tzuhan) 累計折舊－房屋及建築 (此為 Contra-Asset，isDebit=false)
          debitAmount: "0",
          creditAmount: depreciation.toString(),
        },
      ],
    };
    vouchers.push(depreciationVoucher);
  }

  // Info: (20260502 - Tzuhan) 輸出模擬傳票
  const outPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "phase5_articulation_test",
    "simulated_vouchers.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(vouchers, null, 2), "utf-8");
  console.log(
    `[SUCCESS] Reverse engineered ${vouchers.length} vouchers for ${stockId} and saved to simulated_vouchers.json.`,
  );
};

// Info: (20260502 - Tzuhan) 如果直接執行此腳本
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
