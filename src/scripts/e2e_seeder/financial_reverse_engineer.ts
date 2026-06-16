import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { Prisma } from "@/generated";
import { SystemAccountNodes } from "@/constants/system_account_codes";

interface IExtractedContextCache {
  historicalBaseline: {
    revenueScale: string;
    scope1Emissions: string;
    scope2Emissions: string;
  };
  supplyChainIntelligence: {
    upstreamSuppliers: string[];
    downstreamCustomers: string[];
    outsourcedProcesses: string[];
  };
  costStructureAnalysis: {
    majorCostComponents: string;
    majorExpenseComponents: string;
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

const getRandomDateForYear = (year: string): string => {
  const start = new Date(`${year}-01-01T00:00:00.000Z`).getTime();
  const end = new Date(`${year}-12-30T23:59:59.000Z`).getTime();
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
  year: string,
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
      tradingDate: getRandomDateForYear(year),
      voucherNumber: `${prefix}-${year}-${i.toString().padStart(3, "0")}`,
      lines,
    });
  }
  return vouchers;
};

interface IAccountPoolItem {
  code: string;
  desc: string;
}

const REVENUE_POOL: IAccountPoolItem[] = [
  { code: "4111", desc: "銷貨收入" },
  { code: "4112", desc: "分期付款銷貨收入" },
  { code: "4150", desc: "勞務收入" },
  { code: SystemAccountNodes.SALES_RETURN, desc: "銷貨退回" },
  { code: SystemAccountNodes.SALES_DISCOUNT, desc: "銷貨折讓" },
];

const COGS_POOL: IAccountPoolItem[] = [
  { code: "5111", desc: "銷貨成本" },
  { code: "5121", desc: "進貨費用" },
  { code: SystemAccountNodes.DIRECT_LABOR_WAGES, desc: "進貨折讓" },
];

const SELLING_EXP_POOL: IAccountPoolItem[] = [
  { code: "6112", desc: "薪資支出" },
  { code: "6113", desc: "租金支出" },
  { code: "6115", desc: "旅費" },
  { code: "6116", desc: "運費" },
  { code: "6117", desc: "郵電費" },
  { code: "6118", desc: "修繕費" },
  { code: "6119", desc: "廣告費" },
  { code: "6120", desc: "水電瓦斯費" },
  { code: "6121", desc: "保險費" },
  { code: "6123", desc: "交際費" },
  { code: "6124", desc: "折舊" },
];

const ADMIN_EXP_POOL: IAccountPoolItem[] = [
  { code: "6212", desc: "薪資支出" },
  { code: "6213", desc: "租金支出" },
  { code: "6214", desc: "文具用品" },
  { code: "6215", desc: "旅費" },
  { code: "6217", desc: "郵電費" },
  { code: "6218", desc: "修繕費" },
  { code: "6220", desc: "水電瓦斯費" },
  { code: "6221", desc: "保險費" },
  { code: "6223", desc: "交際費" },
  { code: "6224", desc: "折舊" },
  { code: "6227", desc: "勞務費" },
  { code: "6231", desc: "伙食費" },
];

const RND_EXP_POOL: IAccountPoolItem[] = [
  { code: "6312", desc: "薪資支出" },
  { code: "6314", desc: "文具用品" },
  { code: "6315", desc: "旅費" },
  { code: "6316", desc: "實驗費用" },
  { code: "6320", desc: "水電瓦斯費" },
  { code: "6324", desc: "折舊" },
];

const createDiversifiedVoucherBlocks = (
  targetAmount: Prisma.Decimal,
  numBlocks: number,
  prefix: string,
  pool: IAccountPoolItem[],
  creditCode: string, // Info: (20260601 - Tzuhan) The offset account, usually CASH or AR/AP
  isDebitNormal: boolean,
  year: string,
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

    const randomItem = pool[Math.floor(Math.random() * pool.length)];

    let debitCode = isDebitNormal ? randomItem.code : creditCode;
    let finalCreditCode = isDebitNormal ? creditCode : randomItem.code;

    // Info: (20260601 - Tzuhan) Reverse for contra accounts
    if (
      randomItem.code === SystemAccountNodes.SALES_RETURN ||
      randomItem.code === SystemAccountNodes.SALES_DISCOUNT
    ) {
      debitCode = randomItem.code;
      finalCreditCode = creditCode;
    } else if (randomItem.code === SystemAccountNodes.DIRECT_LABOR_WAGES) {
      debitCode = creditCode;
      finalCreditCode = randomItem.code;
    }

    const lines: ISimulatedVoucherLine[] = [
      {
        id: randomUUID(),
        description: randomItem.desc,
        accountingCode: debitCode,
        debitAmount: actual.toString(),
        creditAmount: "0",
        vendor,
      },
      {
        id: randomUUID(),
        description: randomItem.desc,
        accountingCode: finalCreditCode,
        debitAmount: "0",
        creditAmount: actual.toString(),
        vendor,
      },
    ];

    vouchers.push({
      id: randomUUID(),
      tradingDate: getRandomDateForYear(year),
      voucherNumber: `${prefix}-${year}-${i.toString().padStart(3, "0")}`,
      lines,
    });
  }
  return vouchers;
};

export const generateFinancialVouchers = (
  stockId: string,
  year: string = "2024",
  targetVoucherCount?: number,
) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const finDataPath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    `${year}_FIN_DATA.json`,
  );
  const cachePath = path.join(
    dataDir,
    "outputs",
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

  // Info: (20260601 - Tzuhan) Calculate dynamic voucher volume based on revenue scale
  let totalTarget = targetVoucherCount;
  if (!totalTarget || totalTarget <= 0) {
    // Info: (20260601 - Tzuhan) 預設：每一百萬元營業額產生 10 張傳票（即平均十萬一張），最高上限 55,000 張，最低 100 張
    const calculated = totalRevenue.div(100000).toNumber();
    totalTarget = Math.min(Math.max(calculated, 100), 55000);
  }

  // Info: (20260601 - Tzuhan) Allocate proportions based on typical transaction frequency
  const revBlocks = Math.floor(totalTarget * 0.4);
  const cogsBlocks = Math.floor(totalTarget * 0.3);
  const selBlocks = Math.floor(totalTarget * 0.1);
  const admBlocks = Math.floor(totalTarget * 0.15);
  const rndBlocks = Math.floor(totalTarget * 0.05);

  const actualRevBlocks = Math.max(revBlocks, 1);
  const actualCogsBlocks = Math.max(cogsBlocks, 1);
  const actualSelBlocks = Math.max(selBlocks, 1);
  const actualAdmBlocks = Math.max(admBlocks, 1);
  const actualRndBlocks = Math.max(rndBlocks, 1);

  const vouchers: ISimulatedVoucher[] = [];

  // Info: (20260525 - Tzuhan) P&L Generation
  // Info: (20260525 - Tzuhan) 1. Revenue (41xx)
  vouchers.push(
    ...createDiversifiedVoucherBlocks(
      totalRevenue,
      actualRevBlocks,
      "RV",
      REVENUE_POOL,
      SystemAccountNodes.CASH_ROOT,
      false, // Info: (20260525 - Tzuhan) Revenue is Credit Normal
      year,
      contextCache.supplyChainIntelligence?.downstreamCustomers?.[0],
    ),
  );
  // Info: (20260525 - Tzuhan) 2. COGS (51xx)
  vouchers.push(
    ...createDiversifiedVoucherBlocks(
      cogs,
      actualCogsBlocks,
      "COGS",
      COGS_POOL,
      SystemAccountNodes.CASH_ROOT,
      true,
      year,
    ),
  );
  // Info: (20260525 - Tzuhan) 3. Selling (61xx)
  vouchers.push(
    ...createDiversifiedVoucherBlocks(
      sellingExp,
      actualSelBlocks,
      "SEL",
      SELLING_EXP_POOL,
      SystemAccountNodes.CASH_ROOT,
      true,
      year,
    ),
  );
  // Info: (20260525 - Tzuhan) 4. Admin (62xx)
  vouchers.push(
    ...createDiversifiedVoucherBlocks(
      adminExp,
      actualAdmBlocks,
      "ADM",
      ADMIN_EXP_POOL,
      SystemAccountNodes.CASH_ROOT,
      true,
      year,
    ),
  );
  // Info: (20260525 - Tzuhan) 5. R&D (63xx)
  vouchers.push(
    ...createDiversifiedVoucherBlocks(
      rndExp,
      actualRndBlocks,
      "RND",
      RND_EXP_POOL,
      SystemAccountNodes.CASH_ROOT,
      true,
      year,
    ),
  );
  // Info: (20260525 - Tzuhan) 6. Interest Revenue (7110)
  vouchers.push(
    ...createVoucherBlocks(
      interestRev,
      5,
      "INT-RV",
      SystemAccountNodes.CASH_ROOT,
      SystemAccountNodes.INTEREST_INCOME,
      "利息收入",
      year,
    ),
  );
  // Info: (20260525 - Tzuhan) 7. Interest Expense (7510)
  vouchers.push(
    ...createVoucherBlocks(
      interestExp,
      5,
      "INT-EX",
      SystemAccountNodes.INTEREST_EXPENSE_ROOT_ALT,
      SystemAccountNodes.CASH_ROOT,
      "利息費用",
      year,
    ),
  );
  // Info: (20260525 - Tzuhan) 8. Tax Expense (7950)
  vouchers.push(
    ...createVoucherBlocks(
      taxExp,
      5,
      "TAX",
      SystemAccountNodes.TAX_EXPENSE_ROOT,
      SystemAccountNodes.CASH_ROOT,
      "所得稅費用",
      year,
    ),
  );

  if (!creditLoss.isZero()) {
    if (creditLoss.lt(0)) {
      // Info: (20260525 - Tzuhan) Negative expense = Benefit (Credit 6400, Debit 1100)
      vouchers.push(
        ...createVoucherBlocks(
          creditLoss.abs(),
          1,
          "ECL",
          SystemAccountNodes.CASH_ROOT,
          SystemAccountNodes.EXPECTED_CREDIT_LOSS,
          "預期信用減損利益",
          year,
        ),
      );
    } else {
      vouchers.push(
        ...createVoucherBlocks(
          creditLoss,
          1,
          "ECL",
          SystemAccountNodes.EXPECTED_CREDIT_LOSS,
          SystemAccountNodes.CASH_ROOT,
          "預期信用減損損失",
          year,
        ),
      );
    }
  }

  // Info: (20260525 - Tzuhan) 9. Zero-Sum Fuzzing Expansion for BS & CF
  const fuzzingVouchers: ISimulatedVoucher[] = [
    {
      id: randomUUID(),
      tradingDate: getRandomDateForYear(year),
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
      tradingDate: getRandomDateForYear(year),
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
          description: "收收取款",
          accountingCode: SystemAccountNodes.UNEARNED_REVENUE_ROOT,
          debitAmount: "0",
          creditAmount: "25000",
        },
      ],
    },
    {
      id: randomUUID(),
      tradingDate: getRandomDateForYear(year),
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
      tradingDate: getRandomDateForYear(year),
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
      tradingDate: getRandomDateForYear(year),
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
      tradingDate: getRandomDateForYear(year),
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
      tradingDate: `${year}-12-31T23:59:59.000Z`,
      voucherNumber: `ADJ-DEP-${year}`,
      lines: [
        {
          id: randomUUID(),
          description: "期末提列製造費用折舊",
          accountingCode: SystemAccountNodes.DEPRECIATION_MANUFACTURING,
          debitAmount: depreciation.toString(),
          creditAmount: "0",
        },
        {
          id: randomUUID(),
          description: "累計折舊增加",
          accountingCode: SystemAccountNodes.ACCUMULATED_DEPRECIATION_EQUIPMENT,
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
  let targetYear = "2024";
  const yearArg = process.argv.find((a) => a.startsWith("--year="));
  if (yearArg) {
    targetYear = yearArg.split("=")[1];
  }
  const targetCount =
    process.argv[3] && !process.argv[3].startsWith("--")
      ? parseInt(process.argv[3], 10)
      : undefined;
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx financial_reverse_engineer.ts 1538 [voucherCount] [--year=2025]",
    );
    process.exit(1);
  }
  generateFinancialVouchers(targetStock, targetYear, targetCount);
}
