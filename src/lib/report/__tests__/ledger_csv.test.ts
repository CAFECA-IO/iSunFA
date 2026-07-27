import { describe, it, expect } from "@jest/globals";
import { buildLedgerCsv } from "@/lib/report/ledger_csv";
import { ILedger } from "@/interfaces/ledger";

describe("buildLedgerCsv", () => {
  const ledger: ILedger = {
    currencyAlias: "TWD",
    items: [
      {
        voucherId: "A",
        voucherDate: Math.floor(
          new Date("2026-03-05T00:00:00Z").getTime() / 1000,
        ),
        voucherNumber: "A",
        voucherType: "income",
        code: "1101",
        accountType: "asset",
        accountingTitle: "庫存現金",
        particulars: "初始, 資金",
        debitAmount: "1000",
        creditAmount: "0",
        balance: "1000",
      },
    ],
    total: { totalDebit: "1000", totalCredit: "1000" },
  };

  it("表頭為 9 欄", () => {
    const lines = buildLedgerCsv(ledger).split("\n");
    expect(lines[0].split('","')).toHaveLength(9);
  });

  it("日期由 epoch 秒轉為 YYYY-MM-DD", () => {
    const csv = buildLedgerCsv(ledger);
    expect(csv).toContain('"2026-03-05"');
  });

  it("含逗號的欄位以雙引號包夾", () => {
    const csv = buildLedgerCsv(ledger);
    expect(csv).toContain('"初始, 資金"');
  });

  it("末列為合計且借貸總額正確", () => {
    const lines = buildLedgerCsv(ledger).split("\n");
    const last = lines[lines.length - 1];
    expect(last).toContain("合計 (Total)");
    expect(last).toContain('"1000"');
  });
});
