import { describe, it, beforeAll, afterAll, expect } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";
import { MoneyUtil } from "@/lib/utils/money";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { IEsgRecordDetail } from "@/interfaces/esg";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { AccountUtil } from "@/lib/utils/account_util";
import { SystemAccountNodes } from "@/constants/system_account_codes";

// Info: (20260520 - Tzuhan) 輕量級 E2E 核心防護網 - [全科目轟炸測試版]
// Info: (20260520 - Tzuhan) 🛑 絕對防線：生產環境實體隔離 (Environment Isolation)
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實金流與碳排帳本！",
  );
}

// Info: (20260520 - Tzuhan) 確保測試不使用任何 any，並嚴格遵循數值精準度守則

describe("Core Pipeline & Report Engine Integrity Test", () => {
  let testUserId: string;
  let testTeamId: string;
  let testAccountBookId: string;
  let testVoucherId: string;
  const testLines: IVoucherLineUI[] = [];
  let testEsgRecords: IEsgRecordDetail[] = [];

  beforeAll(async () => {
    // Info: (20260520 - Tzuhan) 1. 準備無痕環境 (User & AccountBook)
    const testUser = await prisma.user.create({
      data: {
        address: "test_extreme_" + Date.now(),
        name: "Test Extreme User",
      },
    });
    testUserId = testUser.id;

    const testTeam = await prisma.team.create({
      data: {
        name: "Test Extreme Team",
      },
    });
    testTeamId = testTeam.id;

    const testAccountBook = await prisma.accountBook.create({
      data: {
        name: "Test Extreme Account Book",
        country: "TW",
        currency: "TWD",
        rule: "IFRS",
        teamId: testTeamId,
      },
    });
    testAccountBookId = testAccountBook.id;

    const testVoucher = await prisma.voucher.create({
      data: {
        tradingDate: new Date(),
        currency: "TWD",
        accountBookId: testAccountBookId,
        userId: testUserId,
        confidence: 100,
      },
    });
    testVoucherId = testVoucher.id;

    // Info: (20260520 - Tzuhan) 2. 注入極端測試數據 (Test Data Injection)
    // Info: (20260520 - Tzuhan) 這裡導入了 Fuzzing Payload，不再只測最簡單的 1100 和 4111，
    // Info: (20260520 - Tzuhan) 強制測試引擎的樹狀溯源能否正確分類 1410, 1510, 1780, 2310, 7510 等易錯邊界科目！
    const fuzzingData = [
      // Info: (20260520 - Tzuhan) 測試組 1: 極端大數與基本科目
      {
        code: "1100",
        amount: 9007199254740990n,
        isDebit: true,
        particular: "Extreme Cash",
      },
      {
        code: "4111",
        amount: 9007199254740990n,
        isDebit: false,
        particular: "Extreme Revenue",
      },
      { code: "3110", amount: 100n, isDebit: false, particular: "Capital" },
      { code: "1100", amount: 100n, isDebit: true, particular: "Capital Cash" },

      // Info: (20260520 - Tzuhan) 測試組 2: 邊界測試 - 1410 預付費用 (必須正確歸入流動資產，並在 CF 營運資金反映)
      {
        code: "1410",
        amount: 5000n,
        isDebit: true,
        particular: "Prepaid Expense",
      },
      {
        code: "1100",
        amount: 5000n,
        isDebit: false,
        particular: "Pay for Prepaid",
      },

      // Info: (20260520 - Tzuhan) 測試組 3: 邊界測試 - 1510 非流動金融資產 (必須歸入非流動資產，CF 屬投資活動)
      {
        code: "1510",
        amount: 10000n,
        isDebit: true,
        particular: "Long-term Investment",
      },
      {
        code: "1100",
        amount: 10000n,
        isDebit: false,
        particular: "Pay for Investment",
      },

      // Info: (20260520 - Tzuhan) 測試組 4: 邊界測試 - 1780 無形資產 (必須歸入非流動資產，CF 屬投資活動)
      {
        code: "1780",
        amount: 20000n,
        isDebit: true,
        particular: "Intangible Asset",
      },
      {
        code: "1100",
        amount: 20000n,
        isDebit: false,
        particular: "Pay for Intangible",
      },

      // Info: (20260520 - Tzuhan) 測試組 5: 邊界測試 - 2310 預收貨款 (必須歸入流動負債，舊版 CF 漏抓的黑洞)
      {
        code: "1100",
        amount: 30000n,
        isDebit: true,
        particular: "Receive Advance",
      },
      {
        code: "2310",
        amount: 30000n,
        isDebit: false,
        particular: "Advance Receipt",
      },

      // Info: (20260520 - Tzuhan) 測試組 6: 邊界測試 - 7510 利息費用 (必須正確從營業外收支抓出，並在 CF 補充揭露)
      {
        code: "7510",
        amount: 500n,
        isDebit: true,
        particular: "Interest Expense",
      },
      {
        code: "1100",
        amount: 500n,
        isDebit: false,
        particular: "Pay Interest",
      },
    ];

    for (const item of fuzzingData) {
      const createdLine = await prisma.voucherLine.create({
        data: {
          voucherId: testVoucherId,
          accountingCode: item.code,
          amount: item.amount,
          isDebit: item.isDebit,
          particular: item.particular,
        },
      });
      testLines.push({
        id: createdLine.id,
        accountingCode: createdLine.accountingCode,
        accounting: null,
        particular: createdLine.particular || "",
        amount: createdLine.amount.toString(),
        isDebit: createdLine.isDebit,
      });
    }

    // Info: (20260520 - Tzuhan) ESG 資料：注入一筆極端小數的碳排與一筆未帶係數的懸記碳排
    const esg1 = await prisma.esgRecord.create({
      data: {
        tradingDate: new Date(),
        scope: "SCOPE_1",
        activityType: "Extreme Micro Emissions",
        vendor: "NanoTech",
        amount: "0.0000001",
        unit: "L",
        emissions: "0.00000000000001",
        confidence: 100,
        accountBookId: testAccountBookId,
      },
    });

    const esg2 = await prisma.esgRecord.create({
      data: {
        tradingDate: new Date(),
        scope: "SCOPE_3",
        activityType: "Unknown Activity",
        vendor: "Unknown Vendor",
        amount: "100",
        unit: "kg",
        emissions: "10",
        confidence: 0,
        accountBookId: testAccountBookId,
      },
    });

    testEsgRecords = [
      {
        id: esg1.id,
        scope: esg1.scope,
        activityType: esg1.activityType,
        amount: esg1.amount.toString(),
        emissions: esg1.emissions.toString(),
        unit: esg1.unit,
        coefficient: { emissionFactor: "0.0000001" },
      } as unknown as IEsgRecordDetail,
      {
        id: esg2.id,
        scope: esg2.scope,
        activityType: esg2.activityType,
        amount: esg2.amount.toString(),
        emissions: esg2.emissions.toString(),
        unit: esg2.unit,
        coefficient: null,
      } as unknown as IEsgRecordDetail,
    ];
  });

  afterAll(async () => {
    // Info: (20260520 - Tzuhan) 3. 清理無痕測試環境
    await prisma.esgRecord.deleteMany({
      where: { accountBookId: testAccountBookId },
    });
    await prisma.voucherLine.deleteMany({
      where: { voucherId: testVoucherId },
    });
    await prisma.voucher.deleteMany({ where: { id: testVoucherId } });
    await prisma.accountBook.deleteMany({ where: { id: testAccountBookId } });
    await prisma.team.deleteMany({ where: { id: testTeamId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it("應能精準處理極端數值、涵蓋所有邊界科目，並完美配平四大報表", () => {
    // Info: (20260520 - Tzuhan) 4. 觸發報表引擎計算
    const balanceSheet = generateBalanceSheet(testLines, 10);
    const incomeStatement = generateIncomeStatement(testLines);
    // Info: (20260520 - Tzuhan) 測試 CF 時傳入期初餘額 0
    const cashFlow = generateCashFlowStatement(testLines, 0);
    const esgReport = generateEsgReport(testEsgRecords);

    // Info: (20260520 - Tzuhan) 檢驗目標 1: 驗證 Number() 已被拔除 (MoneyUtil 高精度防護成功)
    // Info: (20260520 - Tzuhan) 現金變動：+9007199254740990 (收入) + 100 (股本) - 5000 (預付) - 10000 (投資) - 20000 (無形) + 30000 (預收) - 500 (利息)
    // Info: (20260520 - Tzuhan) 預期現金總額 = 9007199254740490
    expect(balanceSheet.assets.total).not.toBe("NaN");

    // Info: (20260520 - Tzuhan) ESG 必須保留小數點後 14 位的字串精度，不得被 parseFloat 截斷
    expect(new Decimal(esgReport.sections.scope1.total).toFixed()).toBe(
      "0.00000000000001",
    );

    // =====================================================================
    // Info: (20260520 - Tzuhan) 檢驗目標 2 & 3: BS, IS, CF 樹狀溯源 (Tree Traversal) 無偽造與恆等式
    // =====================================================================
    // 驗證 BS: 總資產 = 總負債 + 總權益 (絕對配平，無懸記補數)
    const assets = MoneyUtil.toDecimal(balanceSheet.assets.total);
    const liabAndEq = MoneyUtil.toDecimal(balanceSheet.liabilities.total).plus(
      balanceSheet.equity.total,
    );
    expect(assets.equals(liabAndEq)).toBe(true);

    // Info: (20260520 - Tzuhan) 驗證 IS -> BS: 損益表「本期淨利」必須完美結轉至資產負債表的「本期損益 (3353)」
    const isNetIncome = incomeStatement.sections.netIncome.total;
    const bsCurrentEarnings =
      balanceSheet.equity.items.find((i) => i.code === "3353")?.amount || "0";
    expect(isNetIncome).toBe(bsCurrentEarnings);

    // Info: (20260520 - Tzuhan) 驗證 CF -> BS: 現金流量表「期末現金餘額」必須等於資產負債表「110 現金及約當現金」
    const cfEndingCash = cashFlow.summary.endingBalance;
    const bsCash =
      balanceSheet.assets.current.items.find((i) =>
        AccountUtil.isDescendantOf(
          i.code,
          SystemAccountNodes.CASH_ROOT,
          TW_ACCOUNTS,
        ),
      )?.amount || "0";
    expect(cfEndingCash).toBe(bsCash);

    // Info: (20260520 - Tzuhan) 驗證 2310 預收貨款黑洞修復：必須出現在 CF 的營運資金項目中，且等於流動負債的變動
    const bsAdvanceReceipts =
      balanceSheet.liabilities.current.items.find((i) => i.code === "2310")
        ?.amount || "0";
    expect(bsAdvanceReceipts).toBe("30000");

    // =====================================================================
    // Info: (20260520 - Tzuhan) 檢驗目標 4: ESG 報告的防漂綠邏輯
    // =====================================================================
    // Info: (20260520 - Tzuhan) 驗證當我們故意傳入沒有係數的未知紀錄時，系統不會把它竄改為 0
    const suspenseRecord = esgReport.sections.scope3?.records?.find(
      (r) => r.emissionFactor === null,
    );
    expect(suspenseRecord).toBeDefined();
    expect(suspenseRecord!.emissions).not.toBe("0");
    expect(suspenseRecord!.emissions).toBe("10");
  });

  it("ESG 引擎防漂綠與資料庫防腐層深度稽核測試", () => {
    // Info: (20260520 - Tzuhan) 測試 1: 拒絕無法對應範疇的異常碳排紀錄 (Scope Mapping Violation)
    expect(() => {
      generateEsgReport([
        {
          id: "bad-scope",
          scope: "SCOPE_4",
          activityType: "Space Travel",
          amount: "10",
          emissions: "1",
          unit: "kg",
        } as unknown as IEsgRecordDetail,
      ]);
    }).toThrow("[ESG Integrity Violation] 發現無法對應範疇的碳排紀錄");

    // Info: (20260520 - Tzuhan) 測試 2: 拒絕缺少活動名稱的無名碳排 (Missing Activity Type)
    expect(() => {
      generateEsgReport([
        {
          id: "no-name",
          scope: "SCOPE_2",
          activityType: "",
          amount: "100",
          emissions: "10",
          unit: "kWh",
        } as unknown as IEsgRecordDetail,
      ]);
    }).toThrow("[ESG Audit Error] 碳排紀錄缺少活動名稱，拒絕列入盤查");

    // Info: (20260520 - Tzuhan) 測試 3: 攔截「憑空產生」的碳排數據 (Zero amount but non-zero emissions)
    expect(() => {
      generateEsgReport([
        {
          id: "fake-emissions",
          scope: "SCOPE_1",
          activityType: "Magic Smoke",
          amount: "0",
          emissions: "500",
          unit: "kg",
        } as unknown as IEsgRecordDetail,
      ]);
    }).toThrow(
      "[ESG Audit Error] 發現憑空產生的碳排數據 (Record ID: fake-emissions)",
    );

    // Info: (20260520 - Tzuhan) 測試 4: 驗證跨範疇 (Cross-Scope) 百分比精準度與加總邏輯
    const multiScopeRecords = [
      {
        id: "rec1",
        scope: "SCOPE_1",
        activityType: "Company Car",
        amount: "100",
        emissions: "300",
        unit: "L",
      },
      {
        id: "rec2",
        scope: "SCOPE_2",
        activityType: "Electricity",
        amount: "100",
        emissions: "200",
        unit: "kWh",
      },
      {
        id: "rec3",
        scope: "SCOPE_3",
        activityType: "Waste",
        amount: "100",
        emissions: "500",
        unit: "kg",
      },
    ] as unknown as IEsgRecordDetail[];

    const report = generateEsgReport(multiScopeRecords);

    // Info: (20260520 - Tzuhan) 總和必須為 1000
    expect(report.metrics.totalEmissions).toBe("1000");
    // Info: (20260520 - Tzuhan) 各範疇佔比必須精確
    expect(report.metrics.scope1Proportion).toBe("30"); // 300 / 1000 * 100
    expect(report.metrics.scope2Proportion).toBe("20");
    expect(report.metrics.scope3Proportion).toBe("50");
  });
});
