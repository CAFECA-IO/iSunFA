import { describe, it, expect } from "@jest/globals";
import { Decimal } from "decimal.js";
import { generateTrialBalance } from "@/lib/report/trial_balance_generator";
import { generateLedger } from "@/lib/report/ledger_generator";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { IVoucher } from "@/interfaces/voucher";
import { ITrialBalanceItem } from "@/interfaces/trial_balance";
import { ILedger } from "@/interfaces/ledger";
import { TrialBalanceSorting, LedgerSorting } from "@/constants/sort";
import { LabelType } from "@/constants/ledger";

// Info: (20260728 - Julian) 試算表勾稽與恆等式測試（純函式、零 Mock，比照 three_statement_articulation.test.ts）
// Info: (20260728 - Julian) 同一組 SSOT 傳票餵真實 generateTrialBalance / generateLedger，斷言彙總、平衡、期初承接與試算表⇄分類帳一致

const seconds = (iso: string): number =>
  Math.floor(new Date(iso).getTime() / 1000);

interface ILineSpec {
  code: string;
  amount: string;
  isDebit: boolean;
  note?: string;
}

// Info: (20260728 - Julian) 以最小欄位組出 IVoucher（tradingDate 為 epoch 秒，比照生產資料源）
const makeVoucher = (
  id: string,
  isoDate: string,
  lines: ILineSpec[],
): IVoucher =>
  ({
    id,
    tradingDate: seconds(isoDate),
    tradingType: "transfer",
    lineItems: {
      lines: lines.map((l, idx) => ({
        id: `${id}-${idx}`,
        accountingCode: l.code,
        accounting: null,
        particular: l.note || l.code,
        amount: l.amount,
        isDebit: l.isDebit,
      })),
      totalAmount: 0,
    },
  }) as unknown as IVoucher;

// Info: (20260728 - Julian) Decimal 工具：金額字串比較，差異須精準為 0
const dec = (v: string): Decimal => new Decimal(v || "0");
const eq = (a: string, b: string): boolean => dec(a).equals(dec(b));
const sum = (...xs: string[]): string =>
  xs.reduce((acc, x) => acc.plus(dec(x)), new Decimal(0)).toString();
// Info: (20260728 - Julian) 試算表某科目對映分類帳之「正常餘額方向淨額」：借方科目 借−貸；貸方科目 貸−借
const tbDirectionalBalance = (
  item: ITrialBalanceItem,
  isDebit: boolean,
): string =>
  isDebit
    ? dec(item.endingDebit).minus(dec(item.endingCredit)).toString()
    : dec(item.endingCredit).minus(dec(item.endingDebit)).toString();

function findNode(
  items: ITrialBalanceItem[],
  code: string,
): ITrialBalanceItem | undefined {
  for (const item of items) {
    if (item.code === code) return item;
    const found = findNode(item.subAccounts, code);
    if (found) return found;
  }
  return undefined;
}

// Info: (20260728 - Julian) 分類帳某科目「最終行結餘」= 依科目排序後該科目最後一列 balance
function ledgerFinalBalance(ledger: ILedger, code: string): string | undefined {
  const rows = ledger.items.filter((i) => i.code === code);
  return rows.length > 0 ? rows[rows.length - 1].balance : undefined;
}

const FULL_YEAR = {
  startDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
  endDate: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
  currencyAlias: "TWD",
  sorting: TrialBalanceSorting.CODE_ASC,
};

describe("試算表勾稽與恆等式測試 (Trial Balance Articulation)", () => {
  // ==========================================================================
  // Info: (20260728 - Julian) 需求 1a：子科目餘額加總 == 主科目彙總金額（逐層樹狀上捲）
  // ==========================================================================
  it("主科目 1100 彙總 == 子科目 1101 + 1103，且逐層上捲一致", () => {
    const vouchers = [
      makeVoucher("R1A-1", "2026-03-01T10:00:00Z", [
        { code: "1101", amount: "3500", isDebit: true },
        { code: "3110", amount: "3500", isDebit: false },
      ]),
      makeVoucher("R1A-2", "2026-03-05T10:00:00Z", [
        { code: "1103", amount: "10000", isDebit: true },
        { code: "3110", amount: "10000", isDebit: false },
      ]),
    ];
    const tb = generateTrialBalance(vouchers, TW_ACCOUNTS, FULL_YEAR);

    const n1101 = findNode(tb.items, "1101");
    const n1103 = findNode(tb.items, "1103");
    const n1100 = findNode(tb.items, "1100");
    const n11XX = findNode(tb.items, "11XX");
    const n1XXX = findNode(tb.items, "1XXX");

    expect(n1101).toBeDefined();
    expect(n1103).toBeDefined();
    expect(n1100).toBeDefined();
    // Info: (20260728 - Julian) 1100 = 1101(3500) + 1103(10000) = 13500
    expect(
      eq(n1100!.endingDebit, sum(n1101!.endingDebit, n1103!.endingDebit)),
    ).toBe(true);
    expect(eq(n1100!.endingDebit, "13500")).toBe(true);
    // Info: (20260728 - Julian) 逐層上捲：11XX 與 1XXX 亦彙總至 13500（其餘子科目為 0）
    expect(n11XX).toBeDefined();
    expect(n1XXX).toBeDefined();
    expect(eq(n11XX!.endingDebit, "13500")).toBe(true);
    expect(eq(n1XXX!.endingDebit, "13500")).toBe(true);
  });

  // ==========================================================================
  // Info: (20260728 - Julian) 需求 1b：試算表期末餘額 == 分類帳最終行結餘（跨引擎勾稽）
  // ==========================================================================
  it("每個葉科目的試算表期末淨額 == 分類帳最終行結餘", () => {
    const vouchers = [
      makeVoucher("R1B-1", "2026-03-01T10:00:00Z", [
        { code: "1101", amount: "100000", isDebit: true },
        { code: "3110", amount: "100000", isDebit: false },
      ]),
      makeVoucher("R1B-2", "2026-03-10T10:00:00Z", [
        { code: "1101", amount: "50000", isDebit: true },
        { code: "4111", amount: "50000", isDebit: false },
      ]),
      makeVoucher("R1B-3", "2026-03-20T10:00:00Z", [
        { code: "6210", amount: "30000", isDebit: true },
        { code: "1101", amount: "30000", isDebit: false },
      ]),
    ];

    const tb = generateTrialBalance(vouchers, TW_ACCOUNTS, FULL_YEAR);
    const ledger = generateLedger(vouchers, TW_ACCOUNTS, {
      labelType: LabelType.ALL,
      sorting: LedgerSorting.CODE_ASC,
      currencyAlias: "TWD",
    });

    // Info: (20260728 - Julian) 逐一葉科目勾稽（1101 資產、3110 權益、4111 收入、6210 費用）
    for (const code of ["1101", "3110", "4111", "6210"]) {
      const tbLeaf = findNode(tb.items, code);
      const ledgerBalance = ledgerFinalBalance(ledger, code);
      const account = TW_ACCOUNTS.find((a) => a.code === code);
      expect(tbLeaf).toBeDefined();
      expect(ledgerBalance).toBeDefined();
      expect(account).toBeDefined();
      // Info: (20260728 - Julian) 試算表依科目正常餘額方向之淨額，必須等於分類帳 running balance 最終值
      expect(
        eq(tbDirectionalBalance(tbLeaf!, account!.isDebit), ledgerBalance!),
      ).toBe(true);
    }
    // Info: (20260728 - Julian) 具體值：1101 資產 = 100000 + 50000 − 30000 = 120000（借加貸減）
    expect(eq(ledgerFinalBalance(ledger, "1101")!, "120000")).toBe(true);
    // Info: (20260728 - Julian) 3110 權益（貸方科目）貸加借減，顯示為正值 100000
    expect(eq(ledgerFinalBalance(ledger, "3110")!, "100000")).toBe(true);
  });

  // ==========================================================================
  // Info: (20260728 - Julian) 需求 2：借貸絕對平衡，差異須精準為 0
  // ==========================================================================
  it("多類科目複合傳票，期初/期中/期末借貸差異皆精準為 0", () => {
    const vouchers = [
      makeVoucher("R2-1", "2026-02-01T10:00:00Z", [
        { code: "1101", amount: "100000", isDebit: true },
        { code: "3110", amount: "100000", isDebit: false },
      ]),
      makeVoucher("R2-2", "2026-03-01T10:00:00Z", [
        { code: "1101", amount: "50000", isDebit: true },
        { code: "4111", amount: "50000", isDebit: false },
      ]),
      makeVoucher("R2-3", "2026-04-01T10:00:00Z", [
        { code: "6211", amount: "20000", isDebit: true },
        { code: "6210", amount: "10000", isDebit: true },
        { code: "1101", amount: "30000", isDebit: false },
      ]),
      makeVoucher("R2-4", "2026-05-01T10:00:00Z", [
        { code: "1103", amount: "8000", isDebit: true },
        { code: "2310", amount: "8000", isDebit: false },
      ]),
    ];
    const tb = generateTrialBalance(vouchers, TW_ACCOUNTS, FULL_YEAR);

    expect(
      dec(tb.total.beginningDebit).minus(tb.total.beginningCredit).isZero(),
    ).toBe(true);
    expect(
      dec(tb.total.midtermDebit).minus(tb.total.midtermCredit).isZero(),
    ).toBe(true);
    expect(
      dec(tb.total.endingDebit).minus(tb.total.endingCredit).isZero(),
    ).toBe(true);
    // Info: (20260728 - Julian) 期末借方總額 = 188000（確有資料，非空表誤判）
    expect(eq(tb.total.endingDebit, "188000")).toBe(true);
  });

  it("極端大數與小數混合，借貸差異仍精準為 0（防浮點）", () => {
    const vouchers = [
      makeVoucher("R2C-1", "2026-03-01T10:00:00Z", [
        { code: "1101", amount: "9007199254740990", isDebit: true },
        { code: "4111", amount: "9007199254740990", isDebit: false },
      ]),
      makeVoucher("R2C-2", "2026-03-02T10:00:00Z", [
        { code: "1101", amount: "0.07", isDebit: true },
        { code: "4111", amount: "0.07", isDebit: false },
      ]),
    ];
    const tb = generateTrialBalance(vouchers, TW_ACCOUNTS, FULL_YEAR);
    expect(
      dec(tb.total.endingDebit).minus(tb.total.endingCredit).isZero(),
    ).toBe(true);
    // Info: (20260728 - Julian) 大數與小數皆保真：期末借方 = 9007199254740990.07
    expect(eq(tb.total.endingDebit, "9007199254740990.07")).toBe(true);
  });

  // ==========================================================================
  // Info: (20260728 - Julian) 需求 3：動態結轉與期間切換 —— 實帳戶期初承接上期期末
  // ==========================================================================
  it("查 2 月起試算表時，實帳戶(資產/負債/權益)期初餘額精準承接 1 月期末", () => {
    const vouchers = [
      // Info: (20260728 - Julian) 1 月：資產 1101 / 權益 3110、資產 1103 / 負債 2310
      makeVoucher("R3-JAN-1", "2026-01-10T10:00:00Z", [
        { code: "1101", amount: "1000", isDebit: true },
        { code: "3110", amount: "1000", isDebit: false },
      ]),
      makeVoucher("R3-JAN-2", "2026-01-20T10:00:00Z", [
        { code: "1103", amount: "500", isDebit: true },
        { code: "2310", amount: "500", isDebit: false },
      ]),
      // Info: (20260728 - Julian) 2 月：資產 1101 / 收入 4111（虛帳戶，不參與承接主張）
      makeVoucher("R3-FEB-1", "2026-02-10T10:00:00Z", [
        { code: "1101", amount: "400", isDebit: true },
        { code: "4111", amount: "400", isDebit: false },
      ]),
    ];

    // Info: (20260728 - Julian) 查 1 月（結算至 1/31）
    const jan = generateTrialBalance(vouchers, TW_ACCOUNTS, {
      startDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 0, 31, 23, 59, 59, 999)),
      currencyAlias: "TWD",
    });
    // Info: (20260728 - Julian) 查 2 月起（2/1 ~ 年底）
    const feb = generateTrialBalance(vouchers, TW_ACCOUNTS, {
      startDate: new Date(Date.UTC(2026, 1, 1, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
      currencyAlias: "TWD",
    });

    // Info: (20260728 - Julian) 逐一實帳戶：2 月期初 == 1 月期末
    for (const code of ["1101", "1103", "2310", "3110"]) {
      const janLeaf = findNode(jan.items, code);
      const febLeaf = findNode(feb.items, code);
      expect(janLeaf).toBeDefined();
      expect(febLeaf).toBeDefined();
      expect(eq(febLeaf!.beginningDebit, janLeaf!.endingDebit)).toBe(true);
      expect(eq(febLeaf!.beginningCredit, janLeaf!.endingCredit)).toBe(true);
    }
    // Info: (20260728 - Julian) 具體：1101 一月期末借 1000 → 二月期初借 1000
    expect(eq(findNode(feb.items, "1101")!.beginningDebit, "1000")).toBe(true);
  });

  it("動態新增 2 月傳票後即時更新，試算表仍維持借貸平衡", () => {
    const base = [
      makeVoucher("R3B-JAN", "2026-01-10T10:00:00Z", [
        { code: "1101", amount: "1000", isDebit: true },
        { code: "3110", amount: "1000", isDebit: false },
      ]),
      makeVoucher("R3B-FEB", "2026-02-10T10:00:00Z", [
        { code: "1101", amount: "400", isDebit: true },
        { code: "4111", amount: "400", isDebit: false },
      ]),
    ];
    const febOpts = {
      startDate: new Date(Date.UTC(2026, 1, 1, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
      currencyAlias: "TWD",
    };

    const before = generateTrialBalance(base, TW_ACCOUNTS, febOpts);
    const before1101 = findNode(before.items, "1101")!;
    // Info: (20260728 - Julian) 期初 1000 + 期中 400 = 期末 1400
    expect(eq(before1101.endingDebit, "1400")).toBe(true);

    // Info: (20260728 - Julian) 動態新增一筆 2 月傳票（借 1101 700 / 貸 4111 700）
    const after = generateTrialBalance(
      [
        ...base,
        makeVoucher("R3B-FEB2", "2026-02-15T10:00:00Z", [
          { code: "1101", amount: "700", isDebit: true },
          { code: "4111", amount: "700", isDebit: false },
        ]),
      ],
      TW_ACCOUNTS,
      febOpts,
    );
    const after1101 = findNode(after.items, "1101")!;

    // Info: (20260728 - Julian) 即時更新：1101 期末 1400 → 2100；且總額仍精準平衡
    expect(eq(after1101.endingDebit, "2100")).toBe(true);
    expect(eq(after1101.endingDebit, sum(before1101.endingDebit, "700"))).toBe(
      true,
    );
    expect(
      dec(after.total.endingDebit).minus(after.total.endingCredit).isZero(),
    ).toBe(true);
  });

  // ==========================================================================
  // Info: (20260728 - Julian) 需求 3（延伸）：跨科目跳轉一致性 —— 分類帳筆數/加總 == 試算表該科目
  // ==========================================================================
  it("分類帳科目的借貸發生額加總與筆數，與試算表該科目完全對得起來", () => {
    const vouchers = [
      makeVoucher("R3C-1", "2026-03-01T10:00:00Z", [
        { code: "1101", amount: "100000", isDebit: true },
        { code: "4111", amount: "100000", isDebit: false },
      ]),
      makeVoucher("R3C-2", "2026-03-10T10:00:00Z", [
        { code: "6210", amount: "30000", isDebit: true },
        { code: "1101", amount: "30000", isDebit: false },
      ]),
    ];
    const tb = generateTrialBalance(vouchers, TW_ACCOUNTS, FULL_YEAR);
    const ledger = generateLedger(vouchers, TW_ACCOUNTS, {
      labelType: LabelType.ALL,
      sorting: LedgerSorting.CODE_ASC,
      currencyAlias: "TWD",
    });

    for (const code of ["1101", "4111", "6210"]) {
      const tbLeaf = findNode(tb.items, code)!;
      const rows = ledger.items.filter((i) => i.code === code);
      const sumDebit = rows
        .reduce((acc, r) => acc.plus(dec(r.debitAmount)), new Decimal(0))
        .toString();
      const sumCredit = rows
        .reduce((acc, r) => acc.plus(dec(r.creditAmount)), new Decimal(0))
        .toString();
      // Info: (20260728 - Julian) 分類帳借貸發生額加總 == 試算表期末借貸；不對稱即代表過濾條件有漏洞
      expect(rows.length).toBeGreaterThan(0);
      expect(eq(sumDebit, tbLeaf.endingDebit)).toBe(true);
      expect(eq(sumCredit, tbLeaf.endingCredit)).toBe(true);
    }
  });
});
