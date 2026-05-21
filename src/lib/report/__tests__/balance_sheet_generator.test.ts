import { describe, it, expect } from "@jest/globals";
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
      accountingCode: "3110",
      accounting: {
        code: "3110",
        name: "普通股股本",
        isInterestBearing: false,
      } as IAccount,
      particular: "發行股份",
      amount: 1000,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 預付費用 1410 (流動資產)
    {
      id: "3",
      accountingCode: "1410",
      accounting: {
        code: "1410",
        name: "預付費用",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 100,
      isDebit: true,
    },
    // Info: (20260520 - Tzuhan) 非流動金融資產 1510 (非流動資產)
    {
      id: "4",
      accountingCode: "1510",
      accounting: {
        code: "1510",
        name: "透過其他綜合損益按公允價值衡量之非流動金融資產",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 200,
      isDebit: true,
    },
    // Info: (20260520 - Tzuhan) 無形資產 1780 (非流動資產)
    {
      id: "5",
      accountingCode: "1780",
      accounting: {
        code: "1780",
        name: "無形資產",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 300,
      isDebit: true,
    },
    // Info: (20260520 - Tzuhan) 抵銷上面新增的資產 (600)，讓資產負債表保持平衡
    {
      id: "6",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 600,
      isDebit: false,
    },
  ];

  it("should calculate correct Net Worth Per Share with parValue = 10", () => {
    const report = generateBalanceSheet(mockLines, 10);
    // Info: (20260510 - Tzuhan) 總權益 = 1000
    // Info: (20260510 - Tzuhan) 股本 = 1000
    // Info: (20260510 - Tzuhan) 面額 = 10 -> 發行股數 = 100
    // Info: (20260510 - Tzuhan) 每股淨值 = 1000 / 100 = 10
    expect(report.metrics.netWorthPerShare).toBe("10");
    expect(report.metrics.parValue).toBe(10);
  });

  it("should calculate correct Net Worth Per Share with parValue = 1", () => {
    const report = generateBalanceSheet(mockLines, 1);
    // Info: (20260510 - Tzuhan) 面額 = 1 -> 發行股數 = 1000
    // Info: (20260510 - Tzuhan) 每股淨值 = 1000 / 1000 = 1
    expect(report.metrics.netWorthPerShare).toBe("1");
    expect(report.metrics.parValue).toBe(1);
  });

  it("should calculate correct Net Worth Per Share with parValue = 50", () => {
    const report = generateBalanceSheet(mockLines, 50);
    // Info: (20260510 - Tzuhan) 面額 = 50 -> 發行股數 = 20
    // Info: (20260510 - Tzuhan) 每股淨值 = 1000 / 20 = 50
    expect(report.metrics.netWorthPerShare).toBe("50");
    expect(report.metrics.parValue).toBe(50);
  });

  it("should correctly classify boundary accounts (1410, 1510, 1780) via tree traversal", () => {
    const report = generateBalanceSheet(mockLines, 10);

    // Info: (20260520 - Tzuhan) 預付費用 1410 應被歸入流動資產 (1101 現金 1000 - 600 + 1410 預付費用 100 = 500)
    const currentAsset = report.assets.current.items.find(
      (i) => i.code === "1410",
    );
    expect(currentAsset).toBeDefined();
    expect(report.assets.current.total).toBe("500");

    // Info: (20260520 - Tzuhan) 非流動金融資產 1510 應被歸入非流動資產
    const nonCurrentAsset1510 = report.assets.nonCurrent.items.find(
      (i) => i.code === "1510",
    );
    expect(nonCurrentAsset1510).toBeDefined();

    // Info: (20260520 - Tzuhan) 無形資產 1780 應被歸入非流動資產
    const nonCurrentAsset1780 = report.assets.nonCurrent.items.find(
      (i) => i.code === "1780",
    );
    expect(nonCurrentAsset1780).toBeDefined();

    // Info: (20260520 - Tzuhan) 非流動資產總和 = 200 + 300 = 500
    expect(report.assets.nonCurrent.total).toBe("500");

    // Info: (20260520 - Tzuhan) 總資產 = 500 + 500 = 1000 (依然平衡)
    expect(report.assets.total).toBe("1000");
  });
});
