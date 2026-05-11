import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { IAccount } from "@/constants/accounts";

describe("generateBalanceSheet", () => {
  const mockLines: IVoucherLineUI[] = [
    // Info: (20260510 - Tzuhan) 借方 資產 1000
    {
      id: "1",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "初始資金",
      amount: 1000,
      isDebit: true,
    },
    // Info: (20260510 - Tzuhan) 貸方 股本 1000
    {
      id: "2",
      accountingCode: "3111",
      accounting: {
        code: "3111",
        name: "普通股股本",
        isInterestBearing: false,
      } as IAccount,
      particular: "發行股份",
      amount: 1000,
      isDebit: false,
    },
  ];

  it("should calculate correct Net Worth Per Share with parValue = 10", () => {
    const report = generateBalanceSheet(mockLines, 10);
    // Info: (20260510 - Tzuhan) 總權益 = 1000
    // Info: (20260510 - Tzuhan) 股本 = 1000
    // Info: (20260510 - Tzuhan) 面額 = 10 -> 發行股數 = 100
    // Info: (20260510 - Tzuhan) 每股淨值 = 1000 / 100 = 10
    expect(report.metrics.netWorthPerShare).toBe(10);
    expect(report.metrics.parValue).toBe(10);
  });

  it("should calculate correct Net Worth Per Share with parValue = 1", () => {
    const report = generateBalanceSheet(mockLines, 1);
    // Info: (20260510 - Tzuhan) 面額 = 1 -> 發行股數 = 1000
    // Info: (20260510 - Tzuhan) 每股淨值 = 1000 / 1000 = 1
    expect(report.metrics.netWorthPerShare).toBe(1);
    expect(report.metrics.parValue).toBe(1);
  });

  it("should calculate correct Net Worth Per Share with parValue = 50", () => {
    const report = generateBalanceSheet(mockLines, 50);
    // Info: (20260510 - Tzuhan) 面額 = 50 -> 發行股數 = 20
    // Info: (20260510 - Tzuhan) 每股淨值 = 1000 / 20 = 50
    expect(report.metrics.netWorthPerShare).toBe(50);
    expect(report.metrics.parValue).toBe(50);
  });
});
