import { describe, it, expect } from "@jest/globals";
import { calculateCrossReportMetrics } from "@/lib/report/cross_report_metrics";
import { IBalanceSheet } from "@/interfaces/balance_sheet";
import { ICashFlowStatement } from "@/interfaces/cash_flow_statement";
import { IIncomeStatement } from "@/interfaces/income_statement";

describe("calculateCrossReportMetrics", () => {
  it("should calculate correct operating cash flow ratio and eps with dynamic par value", () => {
    const mockBalanceSheet = {
      liabilities: { current: { total: "5000" } },
      metrics: {
        parValue: 10,
        fixedAssetsTotal: "1000",
        longTermInvestmentsTotal: "1000",
        otherAssetsTotal: "1000",
        workingCapital: "2000",
      },
      equity: {
        items: [{ code: "3110", amount: "10000", particular: "普通股股本" }],
      },
    } as unknown as IBalanceSheet;

    const mockCashFlow = {
      activities: { operating: { total: "10000" } },
      supplementary: {
        capitalExpenditure: "2000",
        inventoryChange: "1000",
        dividendsPaid: "2000",
      },
    } as unknown as ICashFlowStatement;

    const mockIncomeStatement = {
      sections: { netIncome: { total: "5000" } },
    } as unknown as IIncomeStatement;

    const metrics = calculateCrossReportMetrics(
      mockBalanceSheet,
      mockCashFlow,
      mockIncomeStatement,
    );

    // Info: (20260520 - Tzuhan) 營業現金流量比率 = 營業現金流(10000) / 流動負債(5000) * 100 = 200
    expect(metrics.operatingCashFlowRatio).toBe("200");

    // Info: (20260520 - Tzuhan) 現金流量允當比率 = 營業現金流(10000) / (資本支出 2000 + 存貨增加 1000 + 現金股利 2000) * 100 = 10000 / 5000 * 100 = 200
    expect(metrics.cashFlowAdequacyRatio).toBe("200");

    // Info: (20260520 - Tzuhan) 現金再投資比率 = (營業現金流 10000 - 現金股利 2000) / (固定資產 1000 + 長期投資 1000 + 其他資產 1000 + 營運資金 2000) * 100 = 8000 / 5000 * 100 = 160
    expect(metrics.cashReinvestmentRatio).toBe("160");

    // Info: (20260520 - Tzuhan) EPS = 淨利 5000 / 發行股數 (股本 10000 / 面額 10) = 5000 / 1000 = 5
    expect(metrics.eps).toBe("5");
  });

  it("should handle division by zero gracefully and return '0'", () => {
    const zeroBalanceSheet = {
      liabilities: { current: { total: "0" } }, // Info: (20260520 - Tzuhan) 分母為 0
      metrics: {
        parValue: 10,
        fixedAssetsTotal: "0",
        longTermInvestmentsTotal: "0",
        otherAssetsTotal: "0",
        workingCapital: "0",
      },
      equity: {
        items: [{ code: "3110", amount: "0", particular: "普通股股本" }],
      }, // Info: (20260520 - Tzuhan) 股本為 0
    } as unknown as IBalanceSheet;

    const zeroCashFlow = {
      activities: { operating: { total: "10000" } },
      supplementary: {
        capitalExpenditure: "0",
        inventoryChange: "0",
        dividendsPaid: "0",
      },
    } as unknown as ICashFlowStatement;

    const zeroIncomeStatement = {
      sections: { netIncome: { total: "5000" } },
    } as unknown as IIncomeStatement;

    const metrics = calculateCrossReportMetrics(
      zeroBalanceSheet,
      zeroCashFlow,
      zeroIncomeStatement,
    );

    expect(metrics.operatingCashFlowRatio).toBe("0"); // Info: (20260520 - Tzuhan) 10000 / 0 => 0
    expect(metrics.cashFlowAdequacyRatio).toBe("0"); // Info: (20260520 - Tzuhan) 10000 / 0 => 0
    expect(metrics.cashReinvestmentRatio).toBe("0"); // Info: (20260520 - Tzuhan) 10000 / 0 => 0
    expect(metrics.eps).toBe("0"); // Info: (20260520 - Tzuhan) 5000 / 0 => 0
  });
});
