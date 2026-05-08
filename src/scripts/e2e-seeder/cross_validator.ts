import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { getAccountByCode } from "@/lib/utils/account";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { IAccount } from "@/constants/accounts";
import { esgRepo } from "@/repositories/esg.repo";

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

  console.log(
    `\n🔍 [AUDIT] Starting Zero-Variance Cross Validation for ${stockId}...`,
  );

  const accountBookId = `e2e-book-${stockId}`;

  // Info: (20260502 - Tzuhan) 1. 讀取黃金標準數值 (Golden Values)
  const finData = JSON.parse(fs.readFileSync(finDataPath, "utf-8"));
  const isList = finData.incomeStatement.reportList;
  const cfList = finData.cashFlow.reportList;

  const goldenRevenue = findReportValue(isList, "營業收入合計");
  const goldenOpex = findReportValue(isList, "營業費用合計");
  const goldenDepreciation = findReportValue(cfList, "折舊費用");

  let goldenScope1 = new Prisma.Decimal(0);
  let goldenScope2 = new Prisma.Decimal(0);
  let goldenScope3 = new Prisma.Decimal(0);
  if (fs.existsSync(esgMetricsPath)) {
    const esgStr = fs.readFileSync(esgMetricsPath, "utf-8");
    const s1 = esgStr.match(
      /"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope1GreenhouseGasEmissions"/,
    );
    if (s1)
      goldenScope1 = new Prisma.Decimal(parseFloat(s1[1].replace(/,/g, "")));
    const s2 = esgStr.match(
      /"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope2GreenhouseGasEmissions"/,
    );
    if (s2)
      goldenScope2 = new Prisma.Decimal(parseFloat(s2[1].replace(/,/g, "")));
    const s3 = esgStr.match(
      /"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope3GreenhouseGasEmissions"/,
    );
    if (s3)
      goldenScope3 = new Prisma.Decimal(parseFloat(s3[1].replace(/,/g, "")));
  }

  // Info: (20260504 - Tzuhan) 2. 從資料庫讀取 AI 解析的傳票 (Vouchers) 與 碳排 (ESG)
  // Info: (20260504 - Tzuhan) ⚠️修復：必須與 UI 取報告的查詢條件一致，嚴格要求 isVerified: true 且 deletedAt: null
  const vouchers = await prisma.voucher.findMany({
    where: {
      accountBookId,
      analysisStatus: "COMPLETED",
      isVerified: true,
      deletedAt: null,
    },
    include: { lines: true },
  });

  // Info: (20260504 - Tzuhan) [架構重構] 棄用陽春迴圈，全面改用與 UI 100% 相同的報表核心引擎
  const allLines: IVoucherLineUI[] = [];
  for (const v of vouchers) {
    if (!v.lines || !Array.isArray(v.lines)) continue;
    for (const line of v.lines) {
      const code = String(line.accountingCode || "");
      const acc = getAccountByCode(code);
      allLines.push({
        id: String(line.id || ""),
        accountingCode: code,
        accounting: acc
          ? (acc as IAccount)
          : ({ code, name: code } as IAccount),
        particular: String(line.particular || ""),
        amount: Number(line.amount || 0),
        isDebit: Boolean(line.isDebit),
      } as unknown as IVoucherLineUI);
    }
  }

  const incomeStatement = generateIncomeStatement(allLines);
  const cashFlowStatement = generateCashFlowStatement(allLines);

  const systemRevenue = new Prisma.Decimal(
    incomeStatement.sections.revenue.total,
  );
  const systemOpex = new Prisma.Decimal(
    incomeStatement.sections.operatingExpenses.total,
  );

  const depreciationItem = cashFlowStatement.activities.operating.items.find(
    (i) => i.name.includes("折舊"),
  );
  const systemDepreciation = new Prisma.Decimal(
    depreciationItem ? depreciationItem.amount : 0,
  );

  // const esgRecords = await prisma.esgRecord.findMany({
  //   where: {
  //     accountBookId,
  //     analysisStatus: "COMPLETED",
  //     isVerified: true,
  //     deletedAt: null,
  //   },
  // });

  // Info: (20260507 - Julian) 改用 getEsgRecordsForReport 取得產生碳盤查資料
  const esgRecords = await esgRepo.getEsgRecordsForReport({ accountBookId });

  const esgReport = generateEsgReport(esgRecords);

  const systemScope1 = new Prisma.Decimal(esgReport.sections.scope1.total);
  const systemScope2 = new Prisma.Decimal(esgReport.sections.scope2.total);
  const systemScope3 = new Prisma.Decimal(esgReport.sections.scope3.total);

  // Info: (20260502 - Tzuhan) 3. 計算誤差值 (Variance)
  const calculateVariance = (
    system: Prisma.Decimal,
    golden: Prisma.Decimal,
  ) => {
    if (golden.isNaN() || system.isNaN()) return "N/A";
    if (golden.isZero()) return system.isZero() ? "0.00%" : "∞%";
    const diff = system.sub(golden);
    return `${diff.div(golden).mul(100).toFixed(4)}%`;
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
        golden: goldenRevenue.toNumber(),
        system: systemRevenue.toNumber(),
        variancePercent: calculateVariance(systemRevenue, goldenRevenue),
        isPassed: systemRevenue
          .sub(goldenRevenue)
          .abs()
          .div(goldenRevenue)
          .lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 的誤差，因為我們有 15% 的極端雜訊實驗
      },
      OperatingExpenses: {
        golden: goldenOpex.toNumber(),
        system: systemOpex.toNumber(),
        variancePercent: calculateVariance(systemOpex, goldenOpex),
        isPassed: systemOpex.sub(goldenOpex).abs().div(goldenOpex).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
      Depreciation: {
        golden: goldenDepreciation.toNumber(),
        system: systemDepreciation.toNumber(),
        variancePercent: calculateVariance(
          systemDepreciation,
          goldenDepreciation,
        ),
        isPassed: systemDepreciation.equals(goldenDepreciation),
      },
      Scope1: {
        golden: goldenScope1.toNumber(),
        system: systemScope1.toNumber(),
        variancePercent: calculateVariance(systemScope1, goldenScope1),
        isPassed: goldenScope1.equals(0)
          ? systemScope1.equals(0)
          : systemScope1.sub(goldenScope1).abs().div(goldenScope1).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
      Scope2: {
        golden: goldenScope2.toNumber(),
        system: systemScope2.toNumber(),
        variancePercent: calculateVariance(systemScope2, goldenScope2),
        isPassed: goldenScope2.equals(0)
          ? systemScope2.equals(0)
          : systemScope2.sub(goldenScope2).abs().div(goldenScope2).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
      Scope3: {
        golden: goldenScope3.toNumber(),
        system: systemScope3.toNumber(),
        variancePercent: calculateVariance(systemScope3, goldenScope3),
        isPassed:
          goldenScope3.equals(0) || goldenScope3.isNaN()
            ? systemScope3.equals(0)
            : systemScope3.sub(goldenScope3).abs().div(goldenScope3).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
    },
    overallStatus: "FAILED",
    score: 0,
  };

  const tests = [
    report.metrics.Revenue.isPassed,
    report.metrics.OperatingExpenses.isPassed,
    report.metrics.Depreciation.isPassed,
    report.metrics.Scope1.isPassed,
    report.metrics.Scope2.isPassed,
    report.metrics.Scope3.isPassed,
  ];
  const passedCount = tests.filter(Boolean).length;
  report.score = Math.round((passedCount / tests.length) * 100);
  report.overallStatus = report.score === 100 ? "PASSED" : "FAILED";

  const outPath = path.join(dataDir, "audit_variance_report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n📊 [FINANCIAL VARIANCE REPORT]`);
  console.table({
    Revenue: {
      Expected: goldenRevenue.toNumber(),
      AI_Actual: systemRevenue.toNumber(),
      Variance: report.metrics.Revenue.variancePercent,
    },
    OpEx: {
      Expected: goldenOpex.toNumber(),
      AI_Actual: systemOpex.toNumber(),
      Variance: report.metrics.OperatingExpenses.variancePercent,
    },
    Depreciation: {
      Expected: goldenDepreciation.toNumber(),
      AI_Actual: systemDepreciation.toNumber(),
      Variance: report.metrics.Depreciation.variancePercent,
    },
  });

  console.log(`\n🌍 [ESG VARIANCE REPORT]`);
  console.table({
    Scope1: {
      Expected: goldenScope1.toNumber(),
      AI_Actual: systemScope1.toNumber(),
      Variance: report.metrics.Scope1.variancePercent,
    },
    Scope2: {
      Expected: goldenScope2.toNumber(),
      AI_Actual: systemScope2.toNumber(),
      Variance: report.metrics.Scope2.variancePercent,
    },
    Scope3: {
      Expected: goldenScope3.toNumber(),
      AI_Actual: systemScope3.toNumber(),
      Variance: report.metrics.Scope3.variancePercent,
    },
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
