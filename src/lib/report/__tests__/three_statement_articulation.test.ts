import { describe, it, expect } from "@jest/globals";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { getAccountByCode } from "@/lib/utils/account";
import { SystemAccountNodes } from "@/constants/system_account_codes";
import { calculateCrossReportMetrics } from "@/lib/report/cross_report_metrics";

describe("三大財務報表恆等式連動測試 (Three Statement Articulation)", () => {
  // Info: (20260525 - Tzuhan) 單一真相來源 (SSOT)：定義唯一一組微型商業週期的傳票明細
  const mockLines: IVoucherLineUI[] = [
    // Info: (20260525 - Tzuhan) 憑證一：股東注資 100k
    {
      id: "1",
      accountingCode: "1101",
      accounting: getAccountByCode("1101")!,
      particular: "股本投入",
      amount: "100000",
      isDebit: true,
    },
    {
      id: "2",
      accountingCode: "3110",
      accounting: getAccountByCode("3110")!,
      particular: "股本投入",
      amount: "100000",
      isDebit: false,
    },
    // Info: (20260525 - Tzuhan) 憑證二：現金銷貨 50k
    {
      id: "3",
      accountingCode: "1101",
      accounting: getAccountByCode("1101")!,
      particular: "銷貨收入",
      amount: "50000",
      isDebit: true,
    },
    {
      id: "4",
      accountingCode: "4111",
      accounting: getAccountByCode("4111")!,
      particular: "銷貨收入",
      amount: "50000",
      isDebit: false,
    },
    // Info: (20260525 - Tzuhan) 憑證三：支付費用 30k
    {
      id: "5",
      accountingCode: "6211",
      accounting: getAccountByCode("6211")!,
      particular: "租金支出",
      amount: "20000",
      isDebit: true,
    },
    {
      id: "6",
      accountingCode: "6210",
      accounting: getAccountByCode("6210")!,
      particular: "薪資支出",
      amount: "10000",
      isDebit: true,
    },
    {
      id: "7",
      accountingCode: "1101",
      accounting: getAccountByCode("1101")!,
      particular: "支付費用",
      amount: "30000",
      isDebit: false,
    },
  ];

  it("應精準達成 IFRS 損益表、資產負債表與現金流量表之恆等式連動斷言", () => {
    // Info: (20260525 - Tzuhan) 1. 無 Mock 引擎呼叫：將同一組資料餵給三大引擎
    const is = generateIncomeStatement(mockLines);
    const bs = generateBalanceSheet(mockLines, 10);
    const cf = generateCashFlowStatement(mockLines, "0"); // Info: (20260525 - Tzuhan) 期初現金嚴格帶 0

    // Info: (20260525 - Tzuhan) 2. 會計恆等式斷言 (Accounting Equation Assertions)

    // Info: (20260525 - Tzuhan) A. 斷言 IS 的淨利等於 BS 的本期損益
    const isNetIncome = is.sections.netIncome.total;
    const bsCurrentPeriodEarnings = bs.equity.items.find(
      (i) => i.code === SystemAccountNodes.CURRENT_PERIOD_EARNINGS,
    );
    expect(bsCurrentPeriodEarnings).toBeDefined();
    expect(bsCurrentPeriodEarnings?.amount).toBe(isNetIncome); // Info: (20260525 - Tzuhan) $20,000

    // Info: (20260525 - Tzuhan) B. 斷言 IS 的淨利等於 CF 營業活動的起點 (本期稅後淨利)
    const cfNetIncomeItem = cf.activities.operating.items.find(
      (i) => i.name === "本期稅後淨利",
    );
    expect(cfNetIncomeItem).toBeDefined();
    expect(cfNetIncomeItem?.amount).toBe(isNetIncome); // Info: (20260525 - Tzuhan) $20,000

    // Info: (20260525 - Tzuhan) C. 斷言 CF 的期末現金餘額精準等於 BS 資產端的現金餘額
    const cfEndingCash = cf.summary.endingBalance;
    const bsCashItem = bs.assets.current.items.find((i) => i.code === "1101");
    expect(bsCashItem).toBeDefined();
    expect(bsCashItem?.amount).toBe(cfEndingCash); // Info: (20260525 - Tzuhan) $120,000

    // Info: (20260525 - Tzuhan) (由於只有現金資產，總資產也必須等於期末現金)
    expect(bs.assets.total).toBe(cfEndingCash);

    // Info: (20260525 - Tzuhan) D. 斷言 BS 的 A = L + E 完美配平
    const assets = BigInt(bs.assets.total);
    const liabilities = BigInt(bs.liabilities.total);
    const equity = BigInt(bs.equity.total);
    expect(assets.toString()).toBe((liabilities + equity).toString()); // Info: (20260525 - Tzuhan) 120000 = 0 + 120000

    // Info: (20260525 - Tzuhan) E. 斷言 CF 籌資活動包含股本
    expect(cf.activities.financing.total).toBe("100000");

    // ----------------------------------------------------------------------
    // Info: (20260525 - Tzuhan) 5. 跨表指標斷言 (Cross Report Metrics)
    // ----------------------------------------------------------------------
    const metrics = calculateCrossReportMetrics(bs, cf, is);

    // Info: (20260525 - Tzuhan) [IAS 33] 由於我們封印了 EPS 期末股數相除，目前應回傳 null
    expect(metrics.eps).toBeNull();

    // Info: (20260525 - Tzuhan) 營業現金流量比率 = 營業活動現金流(20,000) / 流動負債(0) -> 依防禦邏輯回傳 0 或 null (取決於實作)
    // Info: (20260525 - Tzuhan) 這裡流動負債為 0，所以若實作安全除法應回傳 0
    expect(metrics.operatingCashFlowRatio).toBe("0");
  });

  it("應能優雅處理無傳票的邊界情況 (Zero Division & Empty State Graceful Degradation)", () => {
    // Info: (20260525 - Tzuhan) 1. 完全沒有任何傳票 (Empty Array)
    const emptyLines: IVoucherLineUI[] = [];

    const is = generateIncomeStatement(emptyLines);
    const bs = generateBalanceSheet(emptyLines, 10);
    const cf = generateCashFlowStatement(emptyLines, "0");

    // Info: (20260525 - Tzuhan) 2. 跨表指標除以零防禦測試
    const metrics = calculateCrossReportMetrics(bs, cf, is);

    // Info: (20260525 - Tzuhan) 所有需要除法的指標，若分母為 0 都必須安全地回傳 '0' (或系統定義的 fallback)
    expect(metrics.eps).toBeNull(); // Info: (20260525 - Tzuhan) IAS 33 WACSO 阻斷
    expect(metrics.operatingCashFlowRatio).toBe("0"); // Info: (20260525 - Tzuhan) 流動負債為 0
    expect(metrics.cashFlowAdequacyRatio).toBe("0"); // Info: (20260525 - Tzuhan) 資本支出等為 0
    expect(metrics.cashReinvestmentRatio).toBe("0"); // Info: (20260525 - Tzuhan) 總資產/營運資金為 0

    // Info: (20260525 - Tzuhan) 三表核心也應該都是 0
    expect(is.sections.netIncome.total).toBe("0");
    expect(bs.assets.total).toBe("0");
    expect(cf.summary.endingBalance).toBe("0");
  });

  it("應正確處理處分資產之現金流與損益調節 (IAS 7 Disposal of Asset)", () => {
    const disposalLines: IVoucherLineUI[] = [
      // Info: (20260525 - Tzuhan) 借：現金 100k, 貸：固定資產 80k, 貸：處分利益 20k
      {
        id: "1",
        accountingCode: "1101",
        accounting: getAccountByCode("1101")!,
        particular: "收回現金",
        amount: "100000",
        isDebit: true,
      },
      {
        id: "2",
        accountingCode: "1600",
        accounting: getAccountByCode("1600")!,
        particular: "沖銷設備",
        amount: "80000",
        isDebit: false,
      },
      {
        id: "3",
        accountingCode: "7140",
        accounting: getAccountByCode("7140")!,
        particular: "處分利益",
        amount: "20000",
        isDebit: false,
      },
    ];

    const is = generateIncomeStatement(disposalLines);
    const bs = generateBalanceSheet(disposalLines, 10);
    const cf = generateCashFlowStatement(disposalLines, "0");

    // Info: (20260525 - Tzuhan) 1. IS Net Income is 20000
    expect(is.sections.netIncome.total).toBe("20000");

    // Info: (20260525 - Tzuhan) 2. CF Operating should reverse the gain (Net Income 20000 - Gain 20000 = 0)
    expect(cf.activities.operating.total).toBe("0");

    // Info: (20260525 - Tzuhan) 3. CF Investing should include the 80k decrease in asset + 20k gain = 100k
    expect(cf.activities.investing.total).toBe("100000");

    // Info: (20260525 - Tzuhan) 4. Ending Cash should match BS
    expect(cf.summary.endingBalance).toBe("100000");

    // Info: (20260525 - Tzuhan) 5. BS should balance (Total Asset = Cash 100k - Fixed Asset 80k = 20k)
    const assets = BigInt(bs.assets.total);
    const liabilities = BigInt(bs.liabilities.total);
    const equity = BigInt(bs.equity.total);
    expect(assets.toString()).toBe((liabilities + equity).toString());
    expect(bs.assets.total).toBe("20000");
  });
});
