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

// Info: (20260520 - Tzuhan) 輕量級 E2E 核心防護網
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
  let testLines: IVoucherLineUI[] = [];
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
    // Info: (20260520 - Tzuhan) 財務資料：注入一筆借貸平衡的傳票（借：現金 9,007,199,254,740,990 / 貸：銷貨收入 9,007,199,254,740,990）
    const line1 = await prisma.voucherLine.create({
      data: {
        voucherId: testVoucherId,
        accountingCode: "1100", // Info: (20260520 - Tzuhan) Cash
        amount: 9007199254740990n,
        isDebit: true,
        particular: "Extreme Cash",
      },
    });

    const line2 = await prisma.voucherLine.create({
      data: {
        voucherId: testVoucherId,
        accountingCode: "4111", // Info: (20260520 - Tzuhan) Sales Revenue
        amount: 9007199254740990n,
        isDebit: false,
        particular: "Extreme Revenue",
      },
    });

    // Info: (20260520 - Tzuhan) 加上股本 (3111) 以確保有 equity 產生本期損益
    const line3 = await prisma.voucherLine.create({
      data: {
        voucherId: testVoucherId,
        accountingCode: "3111",
        amount: 100n,
        isDebit: false,
        particular: "Capital",
      },
    });

    const line4 = await prisma.voucherLine.create({
      data: {
        voucherId: testVoucherId,
        accountingCode: "1100",
        amount: 100n,
        isDebit: true,
        particular: "Capital",
      },
    });

    testLines = [
      {
        id: line1.id,
        accountingCode: line1.accountingCode,
        accounting: null,
        particular: line1.particular || "",
        amount: line1.amount.toString(),
        isDebit: line1.isDebit,
      },
      {
        id: line2.id,
        accountingCode: line2.accountingCode,
        accounting: null,
        particular: line2.particular || "",
        amount: line2.amount.toString(),
        isDebit: line2.isDebit,
      },
      {
        id: line3.id,
        accountingCode: line3.accountingCode,
        accounting: null,
        particular: line3.particular || "",
        amount: line3.amount.toString(),
        isDebit: line3.isDebit,
      },
      {
        id: line4.id,
        accountingCode: line4.accountingCode,
        accounting: null,
        particular: line4.particular || "",
        amount: line4.amount.toString(),
        isDebit: line4.isDebit,
      },
    ];

    // Info: (20260520 - Tzuhan) ESG 資料：注入一筆極端小數的碳排（活動數據 0.0000001 × 係數 0.0000001 = 0.00000000000001）
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

    // Info: (20260520 - Tzuhan) 故意傳入沒有係數的未知紀錄
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

  it("應能精準處理極端數值並完美配平四大報表 (驗證 Sprint 1 目標)", () => {
    // Info: (20260520 - Tzuhan) 3. 觸發報表引擎計算
    const balanceSheet = generateBalanceSheet(testLines, 10);
    const incomeStatement = generateIncomeStatement(testLines);
    const cashFlow = generateCashFlowStatement(testLines, 0);
    const esgReport = generateEsgReport(testEsgRecords);

    // =====================================================================
    // Info: (20260520 - Tzuhan) 🎯 檢驗目標 1: 驗證 Number() 已被拔除 (MoneyUtil 高精度防護成功)
    // =====================================================================
    // Info: (20260520 - Tzuhan) 總資產 = 9007199254740990 + 100 = 9007199254741090
    expect(balanceSheet.assets.total).toBe("9007199254741090");
    // Info: (20260520 - Tzuhan) ESG 必須保留小數點後 14 位的字串精度，不得被 parseFloat 截斷
    // Info: (20260520 - Tzuhan) 透過 Decimal.toFixed() 展現完整數值，避免直接比較科學記號字串
    expect(new Decimal(esgReport.sections.scope1.total).toFixed()).toBe(
      "0.00000000000001",
    );

    // =====================================================================
    // Info: (20260520 - Tzuhan) 🎯 檢驗目標 2 & 3 & 5: BS, IS, CF 的無偽造與恆等式邏輯
    // =====================================================================
    // Info: (20260520 - Tzuhan) 驗證 BS: 總資產 = 總負債 + 總權益 (絕對配平，無懸記補數)
    const assets = MoneyUtil.toDecimal(balanceSheet.assets.total);
    const liabAndEq = MoneyUtil.toDecimal(balanceSheet.liabilities.total).plus(
      balanceSheet.equity.total,
    );
    expect(assets.equals(liabAndEq)).toBe(true);

    // Info: (20260520 - Tzuhan) 驗證 IS -> BS: 損益表「本期淨利」必須完美結轉至資產負債表的「本期損益 (3200)」
    const isNetIncome = incomeStatement.sections.netIncome.total;
    const bsCurrentEarnings =
      balanceSheet.equity.items.find((i) => i.code === "3200")?.amount || "0";
    expect(isNetIncome).toBe(bsCurrentEarnings);

    // Info: (20260520 - Tzuhan) 驗證 CF -> BS: 現金流量表「期末現金餘額」必須等於資產負債表「110 現金及約當現金」
    const cfEndingCash = cashFlow.summary.endingBalance;
    const bsCash =
      balanceSheet.assets.current.items.find((i) => i.code.startsWith("110"))
        ?.amount || "0";
    expect(cfEndingCash).toBe(bsCash);

    // =====================================================================
    // Info: (20260520 - Tzuhan) 🎯 檢驗目標 4: ESG 報告的防漂綠邏輯
    // =====================================================================
    // Info: (20260520 - Tzuhan) 驗證當我們故意傳入沒有係數的未知紀錄時，系統不會把它竄改為 0
    const suspenseRecord = esgReport.sections.scope3?.records?.find(
      (r) => r.emissionFactor === null,
    );
    expect(suspenseRecord).toBeDefined();
    // Info: (20260520 - Tzuhan) 確保未驗證的碳排維持其原貌，沒有被漂綠成 0
    expect(suspenseRecord!.emissions).not.toBe("0");
    expect(suspenseRecord!.emissions).toBe("10");
  });
});
