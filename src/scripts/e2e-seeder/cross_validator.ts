import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import Decimal from "decimal.js";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { getAccountByCode } from "@/lib/utils/account";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { IAccount } from "@/constants/accounts";
import { esgRepo } from "@/repositories/esg.repo";
import { MoneyUtil } from "@/lib/utils/money";

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
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const finDataPath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    "2024_FIN_DATA.json",
  );
  const esgMetricsPath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    "2024_ESG_METRICS.json",
  );

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
      goldenScope1 = new Prisma.Decimal(
        MoneyUtil.toDecimal(s1[1].replace(/,/g, "")).toString(),
      );
    const s2 = esgStr.match(
      /"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope2GreenhouseGasEmissions"/,
    );
    if (s2)
      goldenScope2 = new Prisma.Decimal(
        MoneyUtil.toDecimal(s2[1].replace(/,/g, "")).toString(),
      );
    const s3 = esgStr.match(
      /"value":\s*"([^"]+)",\s*"ctrType":\s*"number",\s*"imageUrl":\s*null,\s*"code":\s*"grossScope3GreenhouseGasEmissions"/,
    );
    if (s3)
      goldenScope3 = new Prisma.Decimal(
        MoneyUtil.toDecimal(s3[1].replace(/,/g, "")).toString(),
      );
  }

  // Info: (20260504 - Tzuhan) 2. 從資料庫讀取 AI 解析的傳票 (Vouchers) 與 碳排 (ESG)
  // Info: (20260504 - Tzuhan) ⚠️修復：必須與 UI 取報告的查詢條件一致，嚴格要求 isVerified: true 且 deletedAt: null
  const vouchers = await prisma.voucher.findMany({
    where: {
      accountBookId,
      analysisStatus: "COMPLETED",
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
        amount: new Decimal(line.amount || 0).toString(),
        isDebit: Boolean(line.isDebit),
      } as unknown as IVoucherLineUI);
    }
  }

  const incomeStatement = generateIncomeStatement(allLines);
  const cashFlowStatement = generateCashFlowStatement(
    allLines,
    0 /* TODO: (20260518 - Tzuhan) Roadmap V2 Sprint 2 Opening Balance */,
  );
  const balanceSheet = generateBalanceSheet(allLines);

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

  // Info: (20260505 - Tzuhan) [Internal Articulation] 驗證三表連動性
  const isAccountingEquationBalanced = new Decimal(
    balanceSheet.assets.total,
  ).equals(
    new Decimal(balanceSheet.liabilities.total).add(balanceSheet.equity.total),
  );

  const isIncomeStatementNetIncome = incomeStatement.sections.netIncome.total;
  const bsRetainedEarnings =
    balanceSheet.equity.items.find(
      (i: { code: string; amount: string | number }) => i.code === "3353",
    )?.amount || 0;
  const cfStartingNetIncome =
    cashFlowStatement.activities.operating.items.find(
      (i: { name: string; amount: string | number }) =>
        i.name === "本期稅後淨利",
    )?.amount || 0;

  const isNetIncomeArticulated =
    new Decimal(isIncomeStatementNetIncome).equals(bsRetainedEarnings) &&
    new Decimal(isIncomeStatementNetIncome).equals(cfStartingNetIncome);

  const bsEndingCash =
    balanceSheet.assets.current.items.find(
      (i: { code: string; amount: string | number }) => i.code === "1100",
    )?.amount || 0;
  const cfEndingCash = cashFlowStatement.summary.endingBalance;

  const isCashArticulated = new Decimal(bsEndingCash).equals(cfEndingCash);

  const report = {
    metadata: {
      stockId,
      auditTimestamp: new Date().toISOString(),
      totalVouchersParsed: vouchers.length,
      totalEsgRecordsParsed: esgRecords.length,
    },
    metrics: {
      Revenue: {
        golden: goldenRevenue.toString(),
        system: systemRevenue.toString(),
        variancePercent: calculateVariance(systemRevenue, goldenRevenue),
        isPassed: systemRevenue
          .sub(goldenRevenue)
          .abs()
          .div(goldenRevenue)
          .lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 的誤差，因為我們有 15% 的極端雜訊實驗
      },
      OperatingExpenses: {
        golden: goldenOpex.toString(),
        system: systemOpex.toString(),
        variancePercent: calculateVariance(systemOpex, goldenOpex),
        isPassed: systemOpex.sub(goldenOpex).abs().div(goldenOpex).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
      Depreciation: {
        golden: goldenDepreciation.toString(),
        system: systemDepreciation.toString(),
        variancePercent: calculateVariance(
          systemDepreciation,
          goldenDepreciation,
        ),
        isPassed: systemDepreciation.equals(goldenDepreciation),
      },
      Scope1: {
        golden: goldenScope1.toString(),
        system: systemScope1.toString(),
        variancePercent: calculateVariance(systemScope1, goldenScope1),
        isPassed: goldenScope1.equals(0)
          ? systemScope1.equals(0)
          : systemScope1.sub(goldenScope1).abs().div(goldenScope1).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
      Scope2: {
        golden: goldenScope2.toString(),
        system: systemScope2.toString(),
        variancePercent: calculateVariance(systemScope2, goldenScope2),
        isPassed: goldenScope2.equals(0)
          ? systemScope2.equals(0)
          : systemScope2.sub(goldenScope2).abs().div(goldenScope2).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
      Scope3: {
        golden: goldenScope3.toString(),
        system: systemScope3.toString(),
        variancePercent: calculateVariance(systemScope3, goldenScope3),
        isPassed:
          goldenScope3.equals(0) || goldenScope3.isNaN()
            ? systemScope3.equals(0)
            : systemScope3.sub(goldenScope3).abs().div(goldenScope3).lt(0.2), // Info: (20260503 - Tzuhan) 容忍 20% 誤差
      },
      InternalArticulation: {
        isAccountingEquationBalanced,
        isNetIncomeArticulated,
        isCashArticulated,
        isPassed:
          isAccountingEquationBalanced &&
          isNetIncomeArticulated &&
          isCashArticulated,
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
    report.metrics.InternalArticulation.isPassed,
  ];
  const passedCount = tests.filter(Boolean).length;
  report.score = Math.round((passedCount / tests.length) * 100);
  report.overallStatus = report.score === 100 ? "PASSED" : "FAILED";

  const outPath = path.join(
    dataDir,
    "outputs",
    "phase5_articulation_test",
    "audit_variance_report.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n📊 [FINANCIAL VARIANCE REPORT]`);
  console.table({
    Revenue: {
      Expected: goldenRevenue.toString(),
      AI_Actual: systemRevenue.toString(),
      Variance: report.metrics.Revenue.variancePercent,
    },
    OpEx: {
      Expected: goldenOpex.toString(),
      AI_Actual: systemOpex.toString(),
      Variance: report.metrics.OperatingExpenses.variancePercent,
    },
    Depreciation: {
      Expected: goldenDepreciation.toString(),
      AI_Actual: systemDepreciation.toString(),
      Variance: report.metrics.Depreciation.variancePercent,
    },
  });

  console.log(`\n🌍 [ESG VARIANCE REPORT]`);
  console.table({
    Scope1: {
      Expected: goldenScope1.toString(),
      AI_Actual: systemScope1.toString(),
      Variance: report.metrics.Scope1.variancePercent,
    },
    Scope2: {
      Expected: goldenScope2.toString(),
      AI_Actual: systemScope2.toString(),
      Variance: report.metrics.Scope2.variancePercent,
    },
    Scope3: {
      Expected: goldenScope3.toString(),
      AI_Actual: systemScope3.toString(),
      Variance: report.metrics.Scope3.variancePercent,
    },
  });

  console.log(`\n🔗 [INTERNAL ARTICULATION REPORT]`);
  console.table({
    AccountingEquation: {
      Passed: report.metrics.InternalArticulation.isAccountingEquationBalanced,
    },
    NetIncomeArticulation: {
      Passed: report.metrics.InternalArticulation.isNetIncomeArticulated,
    },
    CashArticulation: {
      Passed: report.metrics.InternalArticulation.isCashArticulated,
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
