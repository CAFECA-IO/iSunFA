import * as fs from "fs";
import * as path from "path";

interface ISimulatedVoucherLine {
  id: string;
  description: string;
  accountingCode: string;
  debitAmount: number;
  creditAmount: number;
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

const parseFinanceNumber = (val: string): number => {
  if (!val) return 0;
  const num = parseInt(val.replace(/,/g, ""), 10);
  return isNaN(num) ? 0 : num * 1000;
};

const findReportValue = (reportList: string[][], keyword: string): number => {
  const row = reportList.find((r) => r[0].includes(keyword));
  return row ? parseFinanceNumber(row[1]) : 0;
};

export const runCrossValidation = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const finDataPath = path.join(dataDir, "2024_FIN_DATA.json");
  const vouchersPath = path.join(dataDir, "simulated_vouchers.json");

  if (!fs.existsSync(finDataPath) || !fs.existsSync(vouchersPath)) {
    console.error(
      `[ERROR] Missing required files for Cross Validation for ${stockId}.`,
    );
    process.exit(1);
  }

  console.log(`\n🔍 [AUDIT] Starting Cross Validation for ${stockId}...`);

  // 1. Read Golden Values
  const finData = JSON.parse(fs.readFileSync(finDataPath, "utf-8"));
  const isList = finData.incomeStatement.reportList;
  const cfList = finData.cashFlow.reportList;

  const goldenRevenue = findReportValue(isList, "營業收入合計");
  const goldenOpex = findReportValue(isList, "營業費用合計");
  const goldenDepreciation = findReportValue(cfList, "折舊費用");

  // 2. Aggregate System Vouchers
  const vouchers = JSON.parse(
    fs.readFileSync(vouchersPath, "utf-8"),
  ) as ISimulatedVoucher[];

  let systemRevenue = 0;
  let systemOpex = 0;
  let systemDepreciation = 0;

  vouchers.forEach((voucher) => {
    voucher.lines.forEach((line) => {
      // Revenue (4111) is credited
      if (line.accountingCode === "4111") {
        systemRevenue += line.creditAmount;
      }
      // Operating Expenses (6161, 6172, 6299) are debited
      if (["6161", "6172", "6299"].includes(line.accountingCode)) {
        systemOpex += line.debitAmount;
      }
      // Depreciation (6184) is debited
      if (line.accountingCode === "6184") {
        systemDepreciation += line.debitAmount;
      }
    });
  });

  // 3. Calculate Variance
  const calculateVariance = (system: number, golden: number) => {
    if (golden === 0) return system === 0 ? "0.00%" : "∞%";
    const diff = system - golden;
    return `${((diff / golden) * 100).toFixed(4)}%`;
  };

  const report = {
    metadata: {
      stockId,
      auditTimestamp: new Date().toISOString(),
      totalVouchersScanned: vouchers.length,
    },
    metrics: {
      Revenue: {
        golden: goldenRevenue,
        system: systemRevenue,
        variancePercent: calculateVariance(systemRevenue, goldenRevenue),
        isPassed: systemRevenue === goldenRevenue,
      },
      OperatingExpenses: {
        golden: goldenOpex,
        system: systemOpex,
        variancePercent: calculateVariance(systemOpex, goldenOpex),
        // Due to flooring in integer division, there might be a tiny rounding error
        isPassed: Math.abs(systemOpex - goldenOpex) < 100,
      },
      Depreciation: {
        golden: goldenDepreciation,
        system: systemDepreciation,
        variancePercent: calculateVariance(
          systemDepreciation,
          goldenDepreciation,
        ),
        isPassed: systemDepreciation === goldenDepreciation,
      },
    },
    overallStatus: "FAILED",
  };

  const allPassed =
    report.metrics.Revenue.isPassed &&
    report.metrics.OperatingExpenses.isPassed &&
    report.metrics.Depreciation.isPassed;

  report.overallStatus = allPassed ? "PASSED" : "FAILED";

  const outPath = path.join(dataDir, "audit_report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`📊 [AUDIT REPORT]`);
  console.log(`- Revenue Variance: ${report.metrics.Revenue.variancePercent}`);
  console.log(
    `- OpEx Variance: ${report.metrics.OperatingExpenses.variancePercent}`,
  );
  console.log(
    `- Depreciation Variance: ${report.metrics.Depreciation.variancePercent}`,
  );
  console.log(`✅ [AUDIT RESULT] Status: ${report.overallStatus}`);
  console.log(`📄 Saved audit_report.json to data/${stockId}/`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx cross_validator.ts 1538",
    );
    process.exit(1);
  }
  runCrossValidation(targetStock);
}
