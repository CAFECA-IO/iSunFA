import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";

const parseFinanceNumber = (val: string): number => {
  if (!val) return 0;
  const num = parseInt(val.replace(/,/g, ""), 10);
  return isNaN(num) ? 0 : num * 1000;
};

const findReportValue = (reportList: string[][], keyword: string): number => {
  const row = reportList.find((r) => r[0].includes(keyword));
  return row ? parseFinanceNumber(row[1]) : 0;
};

export const runCrossValidation = async (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const finDataPath = path.join(dataDir, "2024_FIN_DATA.json");
  const esgMetricsPath = path.join(dataDir, "2024_ESG_METRICS.json");

  if (!fs.existsSync(finDataPath)) {
    console.error(
      `[ERROR] Missing FIN_DATA for Cross Validation for ${stockId}.`,
    );
    process.exit(1);
  }

  console.log(`\n🔍 [AUDIT] Starting Zero-Variance Cross Validation for ${stockId}...`);

  const accountBookId = `e2e-book-${stockId}`;

  // Info: (20260502 - Tzuhan) 1. 讀取黃金標準數值 (Golden Values)
  const finData = JSON.parse(fs.readFileSync(finDataPath, "utf-8"));
  const isList = finData.incomeStatement.reportList;
  const cfList = finData.cashFlow.reportList;

  const goldenRevenue = findReportValue(isList, "營業收入合計");
  const goldenOpex = findReportValue(isList, "營業費用合計");
  const goldenDepreciation = findReportValue(cfList, "折舊費用");

  let goldenScope1 = 0, goldenScope2 = 0, goldenScope3 = 0;
  if (fs.existsSync(esgMetricsPath)) {
    const esgStr = fs.readFileSync(esgMetricsPath, "utf-8");
    const s1 = esgStr.match(/"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope1GreenhouseGasEmissions"/);
    if (s1) goldenScope1 = parseFloat(s1[1]);
    const s2 = esgStr.match(/"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope2GreenhouseGasEmissions"/);
    if (s2) goldenScope2 = parseFloat(s2[1]);
    const s3 = esgStr.match(/"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope3GreenhouseGasEmissions"/);
    if (s3) goldenScope3 = parseFloat(s3[1]);
  }

  // Info: (20260502 - Tzuhan) 2. 從資料庫讀取 AI 解析的傳票 (Vouchers) 與 碳排 (ESG)
  const vouchers = await prisma.voucher.findMany({
    where: { accountBookId, analysisStatus: "COMPLETED" },
    include: { lines: true },
  });

  let systemRevenue = 0;
  let systemOpex = 0;
  let systemDepreciation = 0;

  vouchers.forEach((voucher) => {
    voucher.lines.forEach((line) => {
      if (line.accountingCode === "4111" && !line.isDebit) {
        systemRevenue += Number(line.amount || 0);
      }
      if (["6161", "6172", "6299"].includes(line.accountingCode || "") && line.isDebit) {
        systemOpex += Number(line.amount || 0);
      }
      if (line.accountingCode === "6184" && line.isDebit) {
        systemDepreciation += Number(line.amount || 0);
      }
    });
  });

  const esgRecords = await prisma.esgRecord.findMany({
    where: { accountBookId, analysisStatus: "COMPLETED" },
  });
  
  let systemScope1 = 0, systemScope2 = 0, systemScope3 = 0;
  esgRecords.forEach(record => {
    const val = Number(record.emissions || 0);
    if (record.scope === "SCOPE_1") systemScope1 += val;
    else if (record.scope === "SCOPE_2") systemScope2 += val;
    else if (record.scope === "SCOPE_3") systemScope3 += val;
  });

  // Info: (20260502 - Tzuhan) 3. 計算誤差值 (Variance)
  const calculateVariance = (system: number, golden: number) => {
    if (isNaN(golden) || isNaN(system)) return "N/A";
    if (golden === 0) return system === 0 ? "0.00%" : "∞%";
    const diff = system - golden;
    return `${((diff / golden) * 100).toFixed(4)}%`;
  };

  const report = {
    metadata: {
      stockId,
      auditTimestamp: new Date().toISOString(),
      totalVouchersParsed: vouchers.length,
      totalEsgRecordsParsed: esgRecords.length,
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
        isPassed: Math.abs(systemOpex - goldenOpex) < 100, // Info: (20260503 - Tzuhan) 容忍千分位四捨五入所產生的微小誤差
      },
      Depreciation: {
        golden: goldenDepreciation,
        system: systemDepreciation,
        variancePercent: calculateVariance(systemDepreciation, goldenDepreciation),
        isPassed: systemDepreciation === goldenDepreciation,
      },
      Scope1: {
        golden: goldenScope1,
        system: systemScope1,
        variancePercent: calculateVariance(systemScope1, goldenScope1),
        isPassed: Math.abs(systemScope1 - goldenScope1) < 0.1, // Info: (20260503 - Tzuhan) 容忍浮點數運算誤差
      },
      Scope2: {
        golden: goldenScope2,
        system: systemScope2,
        variancePercent: calculateVariance(systemScope2, goldenScope2),
        isPassed: Math.abs(systemScope2 - goldenScope2) < 0.1,
      },
      Scope3: {
        golden: goldenScope3,
        system: systemScope3,
        variancePercent: calculateVariance(systemScope3, goldenScope3),
        isPassed: isNaN(goldenScope3) || Math.abs(systemScope3 - goldenScope3) < 0.1,
      }
    },
    overallStatus: "FAILED",
    score: 0
  };

  const tests = [
    report.metrics.Revenue.isPassed,
    report.metrics.OperatingExpenses.isPassed,
    report.metrics.Depreciation.isPassed,
    report.metrics.Scope1.isPassed,
    report.metrics.Scope2.isPassed,
    report.metrics.Scope3.isPassed
  ];
  const passedCount = tests.filter(Boolean).length;
  report.score = Math.round((passedCount / tests.length) * 100);
  report.overallStatus = report.score === 100 ? "PASSED" : "FAILED";

  const outPath = path.join(dataDir, "audit_variance_report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n📊 [FINANCIAL VARIANCE REPORT]`);
  console.table({
    Revenue: { Expected: goldenRevenue, AI_Actual: systemRevenue, Variance: report.metrics.Revenue.variancePercent },
    OpEx: { Expected: goldenOpex, AI_Actual: systemOpex, Variance: report.metrics.OperatingExpenses.variancePercent },
    Depreciation: { Expected: goldenDepreciation, AI_Actual: systemDepreciation, Variance: report.metrics.Depreciation.variancePercent }
  });

  console.log(`\n🌍 [ESG VARIANCE REPORT]`);
  console.table({
    Scope1: { Expected: goldenScope1, AI_Actual: systemScope1, Variance: report.metrics.Scope1.variancePercent },
    Scope2: { Expected: goldenScope2, AI_Actual: systemScope2, Variance: report.metrics.Scope2.variancePercent },
    Scope3: { Expected: goldenScope3, AI_Actual: systemScope3, Variance: report.metrics.Scope3.variancePercent }
  });

  console.log(`\n🏆 [FINAL SCORE FOR ${stockId}]`);
  console.log(`System Accuracy:    ${report.score}%`);
  console.log(`✅ [AUDIT RESULT] Status: ${report.overallStatus}`);
  console.log(`📄 Saved audit_variance_report.json to data/${stockId}/`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: npx tsx src/scripts/e2e-seeder/cross_validator.ts 1538",
    );
    process.exit(1);
  }
  runCrossValidation(targetStock)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
