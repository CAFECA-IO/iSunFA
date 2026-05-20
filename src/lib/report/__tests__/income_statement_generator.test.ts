import { describe, it, expect } from "@jest/globals";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { IAccount } from "@/constants/accounts";

describe("generateIncomeStatement", () => {
  const mockLines: IVoucherLineUI[] = [
    // Info: (20260520 - Tzuhan) 銷貨收入 (4111) 貸方 10000
    {
      id: "1",
      accountingCode: "4111",
      accounting: {
        code: "4111",
        name: "銷貨收入",
        isInterestBearing: false,
      } as IAccount,
      particular: "產品銷售",
      amount: 10000,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 銷貨成本 (5111) 借方 4000
    {
      id: "2",
      accountingCode: "5111",
      accounting: {
        code: "5111",
        name: "銷貨成本",
        isInterestBearing: false,
      } as IAccount,
      particular: "產品成本",
      amount: 4000,
      isDebit: true,
    },
    // Info: (20260520 - Tzuhan) 薪資支出 (6111) 借方 2000
    {
      id: "3",
      accountingCode: "6111",
      accounting: {
        code: "6111",
        name: "薪資支出",
        isInterestBearing: false,
      } as IAccount,
      particular: "員工薪資",
      amount: 2000,
      isDebit: true,
    },
    // Info: (20260520 - Tzuhan) 利息收入 (7110) 貸方 500
    {
      id: "4",
      accountingCode: "7110",
      accounting: {
        code: "7110",
        name: "利息收入",
        isInterestBearing: false,
      } as IAccount,
      particular: "銀行利息",
      amount: 500,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 利息費用 (7510) 借方 200
    {
      id: "5",
      accountingCode: "7510",
      accounting: {
        code: "7510",
        name: "利息費用",
        isInterestBearing: false,
      } as IAccount,
      particular: "貸款利息",
      amount: 200,
      isDebit: true,
    },
    // Info: (20260520 - Tzuhan) 所得稅費用 (7950) 借方 800
    {
      id: "6",
      accountingCode: "7950",
      accounting: {
        code: "7950",
        name: "所得稅費用",
        isInterestBearing: false,
      } as IAccount,
      particular: "營所稅",
      amount: 800,
      isDebit: true,
    },
  ];

  it("should calculate correct gross profit and operating income", () => {
    const report = generateIncomeStatement(mockLines);

    // Info: (20260520 - Tzuhan) 毛利 = 收入(10000) - 成本(4000) = 6000
    expect(report.sections.grossProfit.total).toBe("6000");

    // Info: (20260520 - Tzuhan) 營業利益 = 毛利(6000) - 營業費用(2000) = 4000
    expect(report.sections.operatingIncome.total).toBe("4000");
  });

  it("should calculate correct non-operating income and net income", () => {
    const report = generateIncomeStatement(mockLines);

    // Info: (20260520 - Tzuhan) 營業外收支 = 利息收入(500) - 利息費用(200) = 300
    expect(report.sections.nonOperating.total).toBe("300");

    // Info: (20260520 - Tzuhan) 稅前淨利 = 營業利益(4000) + 營業外收支(300) = 4300
    expect(report.sections.incomeBeforeTax.total).toBe("4300");

    // Info: (20260520 - Tzuhan) 本期稅後淨利 = 稅前淨利(4300) - 所得稅費用(800) = 3500
    expect(report.sections.netIncome.total).toBe("3500");
  });

  it("should throw error for unclassified accounts or missing directions to prevent silent data loss", () => {
    expect(() => {
      generateIncomeStatement([
        {
          id: "999",
          accountingCode: "4111",
          accounting: {
            code: "4111",
            name: "銷貨收入",
            isInterestBearing: false,
          } as IAccount,
          particular: "測試用",
          amount: 100,
          isDebit: null, // Info: (20260520 - Tzuhan) 模擬異常遺失借貸方向
        },
      ]);
    }).toThrow(/缺乏會計代碼或借貸方向/);
  });
});
