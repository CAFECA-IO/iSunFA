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
import { SystemAccountNodes } from "@/constants/system_account_codes";
import { AccountUtil } from "@/lib/utils/account_util";
import { ACCOUNTS } from "@/constants/accounts";

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
  const goldenCogs = findReportValue(isList, "營業成本合計");
  const goldenSelling = findReportValue(isList, "推銷費用");
  const goldenAdmin = findReportValue(isList, "管理費用");
  const goldenRnD = findReportValue(isList, "研究發展費用");
  const goldenOpex = findReportValue(isList, "營業費用合計");
  const goldenInterestRev = findReportValue(isList, "利息收入");
  const goldenInterestExp = findReportValue(isList, "財務成本淨額");
  const goldenTax = findReportValue(isList, "所得稅費用（利益）合計");
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

  const aggregateOpexItems = (rootCode: string) => {
    return incomeStatement.sections.operatingExpenses.items
      .filter((i: { code: string; amount: string | number }) =>
        AccountUtil.isDescendantOf(i.code, rootCode, ACCOUNTS.TW),
      )
      .reduce(
        (sum: Prisma.Decimal, i: { code: string; amount: string | number }) =>
          sum.add(new Prisma.Decimal(i.amount)),
        new Prisma.Decimal(0),
      );
  };

  const systemSelling = aggregateOpexItems("6100");
  const systemAdmin = aggregateOpexItems(SystemAccountNodes.ADMIN_EXPENSE);
  const systemRnD = aggregateOpexItems("6300");

  const systemOpex = new Prisma.Decimal(
    incomeStatement.sections.operatingExpenses.total,
  );

  const systemCogs = new Prisma.Decimal(incomeStatement.sections.cogs.total);

  const systemInterestRev = incomeStatement.sections.nonOperating.items
    .filter((i: { code: string; amount: string | number }) =>
      AccountUtil.isDescendantOf(i.code, "7110", ACCOUNTS.TW),
    )
    .reduce(
      (sum: Prisma.Decimal, i: { code: string; amount: string | number }) =>
        sum.add(new Prisma.Decimal(i.amount)),
      new Prisma.Decimal(0),
    );

  const systemInterestExp = incomeStatement.sections.nonOperating.items
    .filter((i: { code: string; amount: string | number }) =>
      AccountUtil.isDescendantOf(i.code, "7510", ACCOUNTS.TW),
    )
    .reduce(
      (sum: Prisma.Decimal, i: { code: string; amount: string | number }) =>
        sum.add(new Prisma.Decimal(i.amount).abs()),
      new Prisma.Decimal(0),
    );

  const systemTax = new Prisma.Decimal(
    incomeStatement.sections.taxExpense.total,
  );

  const depreciationItem = cashFlowStatement.activities.operating.items.find(
    (i) => i.name.includes("折舊"),
  );
  const systemDepreciation = new Prisma.Decimal(
    depreciationItem ? depreciationItem.amount : 0,
  );

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
      (i: { code: string; amount: string | number }) =>
        i.code === SystemAccountNodes.CURRENT_PERIOD_EARNINGS,
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
    balanceSheet.assets.current.items
      .filter((i: { code: string; amount: string | number }) =>
        AccountUtil.isDescendantOf(
          i.code,
          SystemAccountNodes.CASH_ROOT,
          ACCOUNTS.TW,
        ),
      )
      .reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const cfEndingCash = cashFlowStatement.summary.endingBalance;

  const isCashArticulated = new Decimal(bsEndingCash).equals(cfEndingCash);
  console.log({
    isIncomeStatementNetIncome,
    bsRetainedEarnings,
    cfStartingNetIncome,
    bsEndingCash,
    cfEndingCash,
  });

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
        isPassed: systemRevenue.equals(goldenRevenue),
      },
      COGS: {
        golden: goldenCogs.toString(),
        system: systemCogs.toString(),
        variancePercent: calculateVariance(systemCogs, goldenCogs),
        isPassed: systemCogs.equals(goldenCogs),
      },
      SellingExpenses: {
        golden: goldenSelling.toString(),
        system: systemSelling.toString(),
        variancePercent: calculateVariance(systemSelling, goldenSelling),
        isPassed: systemSelling.equals(goldenSelling),
      },
      AdminExpenses: {
        golden: goldenAdmin.toString(),
        system: systemAdmin.toString(),
        variancePercent: calculateVariance(systemAdmin, goldenAdmin),
        isPassed: systemAdmin.equals(goldenAdmin),
      },
      RnDExpenses: {
        golden: goldenRnD.toString(),
        system: systemRnD.toString(),
        variancePercent: calculateVariance(systemRnD, goldenRnD),
        isPassed: systemRnD.equals(goldenRnD),
      },
      InterestRev: {
        golden: goldenInterestRev.toString(),
        system: systemInterestRev.toString(),
        variancePercent: calculateVariance(
          systemInterestRev,
          goldenInterestRev,
        ),
        isPassed: systemInterestRev.equals(goldenInterestRev),
      },
      InterestExp: {
        golden: goldenInterestExp.toString(),
        system: systemInterestExp.toString(),
        variancePercent: calculateVariance(
          systemInterestExp,
          goldenInterestExp,
        ),
        isPassed: systemInterestExp.equals(goldenInterestExp),
      },
      Tax: {
        golden: goldenTax.toString(),
        system: systemTax.toString(),
        variancePercent: calculateVariance(systemTax, goldenTax),
        isPassed: systemTax.equals(goldenTax),
      },
      OperatingExpenses: {
        golden: goldenOpex.toString(),
        system: systemOpex.toString(),
        variancePercent: calculateVariance(systemOpex, goldenOpex),
        isPassed: systemOpex.equals(goldenOpex), // Info: (20260522 - Tzuhan) [Zero Tolerance] 絕對零容忍
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
        isPassed: systemScope1.equals(goldenScope1), // Info: (20260522 - Tzuhan) [Zero Tolerance] 絕對零容忍
      },
      Scope2: {
        golden: goldenScope2.toString(),
        system: systemScope2.toString(),
        variancePercent: calculateVariance(systemScope2, goldenScope2),
        isPassed: systemScope2.equals(goldenScope2), // Info: (20260522 - Tzuhan) [Zero Tolerance] 絕對零容忍
      },
      Scope3: {
        golden: goldenScope3.toString(),
        system: systemScope3.toString(),
        variancePercent: calculateVariance(systemScope3, goldenScope3),
        isPassed: systemScope3.equals(
          goldenScope3.isNaN() ? new Prisma.Decimal(0) : goldenScope3,
        ), // Info: (20260522 - Tzuhan) [Zero Tolerance] 絕對零容忍
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
    report.metrics.COGS.isPassed,
    report.metrics.SellingExpenses.isPassed,
    report.metrics.AdminExpenses.isPassed,
    report.metrics.RnDExpenses.isPassed,
    report.metrics.InterestRev.isPassed,
    report.metrics.InterestExp.isPassed,
    report.metrics.Tax.isPassed,
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

  const outPath = path.join(dataDir, "outputs", "audit_variance_report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n📊 [FINANCIAL VARIANCE REPORT]`);
  console.table({
    Revenue: {
      Expected: goldenRevenue.toString(),
      AI_Actual: systemRevenue.toString(),
      Variance: report.metrics.Revenue.variancePercent,
    },
    COGS: {
      Expected: goldenCogs.toString(),
      AI_Actual: systemCogs.toString(),
      Variance: report.metrics.COGS.variancePercent,
    },
    Selling: {
      Expected: goldenSelling.toString(),
      AI_Actual: systemSelling.toString(),
      Variance: report.metrics.SellingExpenses.variancePercent,
    },
    Admin: {
      Expected: goldenAdmin.toString(),
      AI_Actual: systemAdmin.toString(),
      Variance: report.metrics.AdminExpenses.variancePercent,
    },
    RnD: {
      Expected: goldenRnD.toString(),
      AI_Actual: systemRnD.toString(),
      Variance: report.metrics.RnDExpenses.variancePercent,
    },
    InterestRev: {
      Expected: goldenInterestRev.toString(),
      AI_Actual: systemInterestRev.toString(),
      Variance: report.metrics.InterestRev.variancePercent,
    },
    InterestExp: {
      Expected: goldenInterestExp.toString(),
      AI_Actual: systemInterestExp.toString(),
      Variance: report.metrics.InterestExp.variancePercent,
    },
    Tax: {
      Expected: goldenTax.toString(),
      AI_Actual: systemTax.toString(),
      Variance: report.metrics.Tax.variancePercent,
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
      "Please provide a stock ID. Usage: npx tsx src/scripts/e2e_seeder/cross_validator.ts 1538",
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
