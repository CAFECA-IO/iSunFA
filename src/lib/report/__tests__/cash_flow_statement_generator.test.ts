import { describe, it, expect } from "@jest/globals";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { IAccount } from "@/constants/accounts";

describe("generateCashFlowStatement", () => {
  const mockLines: IVoucherLineUI[] = [
    // Info: (20260520 - Tzuhan) 銷貨收入 (4111) 帶來現金流入 10000
    {
      id: "1",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "收現",
      amount: 10000,
      isDebit: true,
    },
    {
      id: "2",
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
    // Info: (20260520 - Tzuhan) 購買固定資產 (1600) 帶來現金流出 3000
    {
      id: "3",
      accountingCode: "1600",
      accounting: {
        code: "1600",
        name: "不動產、廠房及設備",
        isInterestBearing: false,
      } as IAccount,
      particular: "買設備",
      amount: 3000,
      isDebit: true,
    },
    {
      id: "4",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "付設備款",
      amount: 3000,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 預收貨款 (2310) 帶來現金流入 2000
    {
      id: "5",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "收預付款",
      amount: 2000,
      isDebit: true,
    },
    {
      id: "6",
      accountingCode: "2310",
      accounting: {
        code: "2310",
        name: "預收貨款",
        isInterestBearing: false,
      } as IAccount,
      particular: "客戶預付",
      amount: 2000,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 發行普通股 (3110) 帶來籌資流入 5000
    {
      id: "7",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 5000,
      isDebit: true,
    },
    {
      id: "8",
      accountingCode: "3110",
      accounting: {
        code: "3110",
        name: "普通股股本",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 5000,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 發放現金股利 (3350) 帶來籌資流出 1000
    {
      id: "9",
      accountingCode: "3350",
      accounting: {
        code: "3350",
        name: "待分配盈餘",
        isInterestBearing: false,
        isDividend: true,
      } as IAccount,
      particular: "測試用",
      amount: 1000,
      isDebit: true,
    },
    {
      id: "10",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 1000,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 支付利息 (7510) 帶來營業外流出 200
    {
      id: "11",
      accountingCode: "7510",
      accounting: {
        code: "7510",
        name: "利息費用",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 200,
      isDebit: true,
    },
    {
      id: "12",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 200,
      isDebit: false,
    },
    // Info: (20260520 - Tzuhan) 支付所得稅 (7950) 帶來所得稅流出 800
    {
      id: "13",
      accountingCode: "7950",
      accounting: {
        code: "7950",
        name: "所得稅費用",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 800,
      isDebit: true,
    },
    {
      id: "14",
      accountingCode: "1101",
      accounting: {
        code: "1101",
        name: "現金",
        isInterestBearing: false,
      } as IAccount,
      particular: "測試用",
      amount: 800,
      isDebit: false,
    },
  ];

  it("should categorize cash flows correctly with tree traversal", () => {
    // Info: (20260520 - Tzuhan) 期初現金 5000
    const report = generateCashFlowStatement(mockLines, 5000);

    // 營業活動現金流 = 淨利 10000 (銷貨) + 預收貨款增加 2000 - 支付利息 200 - 支付所得稅 800 = 11000
    expect(report.activities.operating.total).toBe("11000");

    // 投資活動現金流 = 購買設備 -3000
    expect(report.activities.investing.total).toBe("-3000");

    // 籌資活動現金流 = 發行股本 5000 - 發放股利 1000 = 4000
    expect(report.activities.financing.total).toBe("4000");

    // 淨現金流量 = 11000 - 3000 + 4000 = 12000
    expect(report.summary.netIncreaseDecrease).toBe("12000");

    // 期末現金餘額 = 5000 + 12000 = 17000
    expect(report.summary.endingBalance).toBe("17000");

    // 驗證補充揭露項目 (7510 利息, 7950 所得稅, 3350 股利)
    expect(report.supplementary?.interestPaid).toBe("200");
    expect(report.supplementary?.taxesPaid).toBe("800");
    expect(report.supplementary?.dividendsPaid).toBe("1000");
  });
});
