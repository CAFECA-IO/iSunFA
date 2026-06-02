import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { Prisma } from "@/generated";
import { SystemAccountNodes } from "@/constants/system_account_codes";

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
  accountingCode: string;
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

const parseFinanceNumber = (val: string): Prisma.Decimal => {
  if (!val) return new Prisma.Decimal(0);
  const num = parseInt(val.replace(/,/g, ""), 10);
  return isNaN(num) ? new Prisma.Decimal(0) : new Prisma.Decimal(num);
};

const findReportValue = (
  reportList: string[][],
  keyword: string,
): Prisma.Decimal => {
  const row = reportList.find((r) => r[0].includes(keyword));
  return row ? parseFinanceNumber(row[1]) : new Prisma.Decimal(0);
};

const getRandomDate2024 = (): string => {
  const start = new Date("2024-01-01T00:00:00.000Z").getTime();
  const end = new Date("2024-12-30T23:59:59.000Z").getTime();
  const randomMs = start + Math.random() * (end - start);
  return new Date(randomMs).toISOString();
};

const createVoucherBlocks = (
  targetAmount: Prisma.Decimal,
  numBlocks: number,
  prefix: string,
  debitCode: string,
  creditCode: string,
  desc: string,
  vendor: string | undefined = undefined,
): ISimulatedVoucher[] => {
  if (targetAmount.lte(0)) return [];
  const vouchers: ISimulatedVoucher[] = [];
  const perBlock = targetAmount.div(numBlocks).floor();
  let cumulative = new Prisma.Decimal(0);

  for (let i = 0; i < numBlocks; i++) {
    const isLast = i === numBlocks - 1;
    const actual = isLast ? targetAmount.sub(cumulative) : perBlock;
    cumulative = cumulative.add(actual);

    const lines: ISimulatedVoucherLine[] = [
      {
        id: randomUUID(),
        description: desc,
        accountingCode: debitCode,
        debitAmount: actual.toString(),
        creditAmount: "0",
        vendor,
      },
      {
        id: randomUUID(),
        description: desc,
        accountingCode: creditCode,
        debitAmount: "0",
        creditAmount: actual.toString(),
        vendor,
      },
    ];
    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: `${prefix}-2024-${i.toString().padStart(3, "0")}`,
      lines,
    });
  }
  return vouchers;
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
    "e2e_roadmap-sprint1",
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

  // Info: (20260525 - Tzuhan) 1. IS Extraction
  const totalRevenue = findReportValue(isList, "營業收入合計");

  const depreciation = findReportValue(cfList, "折舊費用");
  const cogs = findReportValue(isList, "營業成本合計").sub(depreciation);
  const sellingExp = findReportValue(isList, "推銷費用");
  const adminExp = findReportValue(isList, "管理費用");
  const rndExp = findReportValue(isList, "研究發展費用");
  const interestRev = findReportValue(isList, "利息收入");
  const interestExp = findReportValue(isList, "財務成本淨額");
  const taxExp = findReportValue(isList, "所得稅費用（利益）合計");
  const creditLoss = findReportValue(isList, "預期信用減損損失（利益）");

  const vouchers: ISimulatedVoucher[] = [];

  // Info: (20260525 - Tzuhan) P&L Generation
  // Info: (20260525 - Tzuhan) 1. Revenue (4111)
  vouchers.push(
    ...createVoucherBlocks(
      totalRevenue,
      20,
      "RV",
      "1100",
      "4111",
      "銷貨收入",
      contextCache.financial.top3Customers?.[0],
    ),
  );
  // Info: (20260525 - Tzuhan) 2. COGS (5111)
  vouchers.push(
    ...createVoucherBlocks(cogs, 20, "COGS", "5111", "1100", "銷貨成本"),
  );
  // Info: (20260525 - Tzuhan) 3. Selling (6100)
  vouchers.push(
    ...createVoucherBlocks(sellingExp, 10, "SEL", "6100", "1100", "推銷費用"),
  );
  // Info: (20260525 - Tzuhan) 4. Admin (6200)
  vouchers.push(
    ...createVoucherBlocks(adminExp, 10, "ADM", "6200", "1100", "管理費用"),
  );
  // Info: (20260525 - Tzuhan) 5. R&D (6300)
  vouchers.push(
    ...createVoucherBlocks(rndExp, 10, "RND", "6300", "1100", "研究發展費用"),
  );
  // Info: (20260525 - Tzuhan) 6. Interest Revenue (7110)
  vouchers.push(
    ...createVoucherBlocks(
      interestRev,
      5,
      "INT-RV",
      "1100",
      "7110",
      "利息收入",
    ),
  );
  // Info: (20260525 - Tzuhan) 7. Interest Expense (7510)
  vouchers.push(
    ...createVoucherBlocks(
      interestExp,
      5,
      "INT-EX",
      "7510",
      "1100",
      "利息費用",
    ),
  );
  // Info: (20260525 - Tzuhan) 8. Tax Expense (7950)
  vouchers.push(
    ...createVoucherBlocks(taxExp, 5, "TAX", "7950", "1100", "所得稅費用"),
  );

  if (!creditLoss.isZero()) {
    if (creditLoss.lt(0)) {
      // Info: (20260525 - Tzuhan) Negative expense = Benefit (Credit 6400, Debit 1100)
      vouchers.push(
        ...createVoucherBlocks(
          creditLoss.abs(),
          1,
          "ECL",
          "1100",
          "6400",
          "預期信用減損利益",
        ),
      );
    } else {
      vouchers.push(
        ...createVoucherBlocks(
          creditLoss,
          1,
          "ECL",
          "6400",
          "1100",
          "預期信用減損損失",
        ),
      );
    }
  }

  // Info: (20260525 - Tzuhan) 9. Zero-Sum Fuzzing Expansion for BS & CF
  const fuzzingVouchers: ISimulatedVoucher[] = [
    {
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: "FUZZ-1410",
      lines: [
        {
          id: randomUUID(),
          description: "預付費用測試",
          accountingCode: SystemAccountNodes.PREPAYMENTS_ROOT,
          debitAmount: "15000",
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "支付預付",
          accountingCode: SystemAccountNodes.CASH_ROOT,
          debitAmount: "0",
          creditAmount: "15000",
        },
      ],
    },
    {
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: "FUZZ-2310",
      lines: [
        {
          id: randomUUID(),
          description: "預收貨款測試",
          accountingCode: SystemAccountNodes.CASH_ROOT,
          debitAmount: "25000",
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "收取代收款",
          accountingCode: SystemAccountNodes.UNEARNED_REVENUE_ROOT,
          debitAmount: "0",
          creditAmount: "25000",
        },
      ],
    },
    {
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: "FUZZ-1510",
      lines: [
        {
          id: randomUUID(),
          description: "非流動金融資產測試",
          accountingCode: SystemAccountNodes.NON_CURRENT_FINANCIAL_ASSETS_ROOT,
          debitAmount: "40000",
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "購入金融資產",
          accountingCode: SystemAccountNodes.CASH_ROOT,
          debitAmount: "0",
          creditAmount: "40000",
        },
      ],
    },
    {
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: "FUZZ-1780",
      lines: [
        {
          id: randomUUID(),
          description: "無形資產測試",
          accountingCode: SystemAccountNodes.INTANGIBLE_ASSETS_ROOT,
          debitAmount: "35000",
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "購入無形資產",
          accountingCode: SystemAccountNodes.CASH_ROOT,
          debitAmount: "0",
          creditAmount: "35000",
        },
      ],
    },
    {
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: "FUZZ-3110",
      lines: [
        {
          id: randomUUID(),
          description: "股本測試",
          accountingCode: SystemAccountNodes.CASH_ROOT,
          debitAmount: "500000",
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "發行股本",
          accountingCode: SystemAccountNodes.COMMON_STOCK_CAPITAL,
          debitAmount: "0",
          creditAmount: "500000",
        },
      ],
    },
    {
      id: randomUUID(),
      tradingDate: getRandomDate2024(),
      voucherNumber: "FUZZ-3350",
      lines: [
        {
          id: randomUUID(),
          description: "發放現金股利",
          accountingCode: SystemAccountNodes.UNAPPROPRIATED_RETAINED_EARNINGS,
          debitAmount: "120000",
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "支付股利",
          accountingCode: SystemAccountNodes.CASH_ROOT,
          debitAmount: "0",
          creditAmount: "120000",
        },
      ],
    },
  ];
  vouchers.push(...fuzzingVouchers);

  // Info: (20260525 - Tzuhan) 10. Depreciation Adjustments
  if (depreciation.gt(0)) {
    const depreciationVoucher: ISimulatedVoucher = {
      id: randomUUID(),
      tradingDate: "2024-12-31T23:59:59.000Z",
      voucherNumber: "ADJ-DEP-2024",
      lines: [
        {
          id: randomUUID(),
          description: "期末提列製造費用折舊",
          accountingCode: "5110",
          debitAmount: depreciation.toString(),
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "累計折舊增加",
          accountingCode: "1613",
          debitAmount: "0",
          creditAmount: depreciation.toString(),
        },
      ],
    };
    vouchers.push(depreciationVoucher);
  }

  const outPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "e2e_roadmap-sprint1",
    "simulated_vouchers.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(vouchers, null, 2), "utf-8");
  console.log(
    `[SUCCESS] Reverse engineered ${vouchers.length} vouchers for ${stockId} and saved to simulated_vouchers.json.`,
  );
};

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
