import { describe, it, expect } from "@jest/globals";
import { buildLedgerCsv } from "@/lib/report/ledger_csv";
import { ILedger } from "@/interfaces/ledger";
import { AccountType } from "@/constants/enums";

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
        accountType: AccountType.ASSET,
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
    const lines = buildLedgerCsv(ledger).split("\r\n");
    const last = lines[lines.length - 1];
    expect(last).toContain("合計 (Total)");
    expect(last).toContain('"1000"');
  });

  it("列分隔採 RFC 4180 的 CRLF", () => {
    expect(buildLedgerCsv(ledger)).toContain("\r\n");
  });

  it('雙引號依 RFC 4180 跳脫為 ""', () => {
    const injected: ILedger = {
      currencyAlias: "TWD",
      items: [{ ...ledger.items[0], accountingTitle: '現金 "備用"' }],
      total: ledger.total,
    };
    expect(buildLedgerCsv(injected)).toContain('現金 ""備用""');
  });

  // Info: (20260728 - Julian) 安全：CSV 公式注入防護（csvText）——文字欄位以 = / @ 開頭者前置單引號中和
  it("文字欄位公式注入防護：=/@ 開頭之科目代碼與摘要前置單引號", () => {
    const injected: ILedger = {
      currencyAlias: "TWD",
      items: [{ ...ledger.items[0], code: "=1+1", particulars: "@SUM(A1:A9)" }],
      total: ledger.total,
    };
    const line = buildLedgerCsv(injected).split("\r\n")[1];
    expect(line).toContain(`"'=1+1"`);
    expect(line).toContain(`"'@SUM(A1:A9)"`);
  });

  it("金額欄不套用公式防護，負數餘額保留不被破壞", () => {
    const negative: ILedger = {
      currencyAlias: "TWD",
      items: [
        {
          ...ledger.items[0],
          debitAmount: "0",
          creditAmount: "500",
          balance: "-500",
        },
      ],
      total: { totalDebit: "0", totalCredit: "500" },
    };
    const line = buildLedgerCsv(negative).split("\r\n")[1];
    // Info: (20260728 - Julian) 餘額 -500 走 csvCell（非 csvText），負號不得被前置單引號破壞
    expect(line).toContain('"-500"');
    expect(line).not.toContain(`"'-500"`);
  });
});
