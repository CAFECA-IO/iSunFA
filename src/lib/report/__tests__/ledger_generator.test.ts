import { describe, it, expect } from "@jest/globals";
import { generateLedger } from "@/lib/report/ledger_generator";
import { IAccount } from "@/constants/accounts";
import { IVoucher } from "@/interfaces/voucher";
import { LabelType, BalanceComparator } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

// Info: (20260727 - Julian) COA 字典：1100 為 1101/1102 之父、31XX 為 3110 之父（皆非葉）；1101/1102/3110 為葉節點
// Info: (20260727 - Julian) GENERAL 上捲需父科目存在於字典，故父節點 1100 / 31XX 皆須納入
const dictionary: IAccount[] = [
  { code: "1100", name: "現金及約當現金", parentCode: "11XX" },
  { code: "1101", name: "庫存現金", parentCode: "1100" },
  { code: "1102", name: "零用金", parentCode: "1100" },
  { code: "31XX", name: "股本", parentCode: "3XXX" },
  { code: "3110", name: "普通股股本", parentCode: "31XX" },
].map((a) => ({ ...a, description: "", type: "", level: 0, isDebit: true }));

const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const makeVoucher = (
  id: string,
  isoDate: string,
  lines: { code: string; name: string; amount: number; isDebit: boolean }[],
): IVoucher =>
  ({
    id,
    tradingDate: seconds(isoDate),
    tradingType: "income",
    lineItems: {
      lines: lines.map((l, idx) => ({
        id: `${id}-${idx}`,
        accountingCode: l.code,
        accounting: { code: l.code, name: l.name } as IAccount,
        particular: l.name,
        amount: l.amount,
        isDebit: l.isDebit,
      })),
      totalAmount: 0,
    },
  }) as unknown as IVoucher;

describe("generateLedger", () => {
  const vouchers: IVoucher[] = [
    makeVoucher("A", "2026-03-05", [
      { code: "1101", name: "庫存現金", amount: 1000, isDebit: true },
      { code: "3110", name: "普通股股本", amount: 1000, isDebit: false },
    ]),
    makeVoucher("B", "2026-03-10", [
      { code: "1101", name: "庫存現金", amount: 400, isDebit: false },
      { code: "1102", name: "零用金", amount: 400, isDebit: true },
    ]),
  ];

  const baseOptions = {
    labelType: LabelType.ALL,
    sorting: LedgerSorting.CODE_ASC,
    currencyAlias: "TWD",
  };

  it("running balance 依科目累計正確", () => {
    const ledger = generateLedger(vouchers, dictionary, baseOptions);
    const cash = ledger.items.filter((i) => i.code === "1101");
    // Info: (20260727 - Julian) 1101：借 1000 -> 餘 1000；貸 400 -> 餘 600
    expect(cash[0].balance).toBe("1000");
    expect(cash[1].balance).toBe("600");
  });

  it("借貸總額正確且平衡", () => {
    const ledger = generateLedger(vouchers, dictionary, baseOptions);
    // Info: (20260727 - Julian) 借: 1000 + 400 = 1400；貸: 1000 + 400 = 1400
    expect(ledger.total.totalDebit).toBe("1400");
    expect(ledger.total.totalCredit).toBe("1400");
  });

  it("科目區間過濾 (1101 ~ 1101)", () => {
    const ledger = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      startAccountNo: "1101",
      endAccountNo: "1101",
    });
    expect(ledger.items.every((i) => i.code === "1101")).toBe(true);
    expect(ledger.items).toHaveLength(2);
  });

  it("帳別 DETAILED 僅保留葉節點科目", () => {
    // Info: (20260727 - Julian) 過帳明細共 4 筆 (A:1101,3110 / B:1101,1102)，皆為葉節點，故 DETAILED 全保留
    const detailed = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      labelType: LabelType.DETAILED,
    });
    expect(detailed.items.length).toBe(4);
    expect(
      detailed.items.every((i) => ["1101", "1102", "3110"].includes(i.code)),
    ).toBe(true);
  });

  it("帳別 GENERAL 將明細過帳上捲至父（總帳）科目", () => {
    const general = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      labelType: LabelType.GENERAL,
    });
    // Info: (20260727 - Julian) 4 筆過帳全數保留，但科目歸屬至父：1101/1102 → 1100，3110 → 31XX
    expect(general.items.length).toBe(4);
    expect(general.items.every((i) => ["1100", "31XX"].includes(i.code))).toBe(
      true,
    );
    expect(
      general.items.some((i) => ["1101", "1102", "3110"].includes(i.code)),
    ).toBe(false);

    // Info: (20260727 - Julian) 1100 累計：+1000(A) −400(B/1101) +400(B/1102) = 1000
    const cash1100 = general.items.filter((i) => i.code === "1100");
    expect(cash1100.length).toBe(3);
    expect(cash1100[cash1100.length - 1].balance).toBe("1000");

    // Info: (20260727 - Julian) 借貸總額與 ALL 相同（僅重新歸屬，未增減）
    expect(general.total.totalDebit).toBe("1400");
    expect(general.total.totalCredit).toBe("1400");
  });

  it("空期間（無傳票）回傳空清單且總計為零", () => {
    const ledger = generateLedger([], dictionary, baseOptions);
    expect(ledger.items).toHaveLength(0);
    expect(ledger.total.totalDebit).toBe("0");
    expect(ledger.total.totalCredit).toBe("0");
  });

  it("多科目 running balance 互不干擾", () => {
    const ledger = generateLedger(vouchers, dictionary, baseOptions);
    // Info: (20260727 - Julian) 1102 僅一筆借 400，餘額應為 400（不受 1101 影響）
    const petty = ledger.items.filter((i) => i.code === "1102");
    expect(petty).toHaveLength(1);
    expect(petty[0].balance).toBe("400");
  });

  it("排序 DATE_DESC：依傳票日期由新到舊", () => {
    const ledger = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      sorting: LedgerSorting.DATE_DESC,
    });
    // Info: (20260727 - Julian) B(03-10) 應排在 A(03-05) 之前
    expect(ledger.items[0].voucherDate).toBeGreaterThanOrEqual(
      ledger.items[ledger.items.length - 1].voucherDate,
    );
  });

  it("科目區間單邊（僅 startAccountNo=1102）", () => {
    const ledger = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      startAccountNo: "1102",
    });
    // Info: (20260727 - Julian) 僅保留 code >= 1102 者：1102 與 3110
    expect(ledger.items.every((i) => i.code >= "1102")).toBe(true);
    expect(ledger.items.some((i) => i.code === "1101")).toBe(false);
  });

  it("關鍵字過濾：僅保留符合科目/摘要/傳票編號之列，餘額仍為真實累計", () => {
    const ledger = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      keyword: "零用金",
    });
    // Info: (20260727 - Julian) 僅 1102 零用金該列命中
    expect(ledger.items.length).toBe(1);
    expect(ledger.items[0].code).toBe("1102");
    expect(ledger.items[0].balance).toBe("400");
    // Info: (20260727 - Julian) 總額取顯示列
    expect(ledger.total.totalDebit).toBe("400");
    expect(ledger.total.totalCredit).toBe("0");
  });

  it("缺乏會計代碼或借貸方向時阻斷輸出", () => {
    const broken = [
      {
        id: "D",
        tradingDate: seconds("2026-03-10"),
        tradingType: null,
        lineItems: {
          lines: [
            {
              id: "D-0",
              accountingCode: "",
              accounting: null,
              particular: "缺代碼",
              amount: 100,
              isDebit: null,
            },
          ],
          totalAmount: 0,
        },
      } as unknown as IVoucher,
    ];
    expect(() => generateLedger(broken, dictionary, baseOptions)).toThrow(
      /Data Integrity Violation/,
    );
  });

  // Info: (20260727 - Julian) rootCode 子樹過濾（試算表統馭科目 drill-down）：以 AccountUtil.isDescendantOf 沿 parentCode 判定，涵蓋該科目及所有子孫，解決點統馭科目「查無分錄」
  describe("rootCode 子樹過濾", () => {
    it("統馭科目 1100：僅保留其子孫 1101/1102，排除他樹的 3110", () => {
      const ledger = generateLedger(vouchers, dictionary, {
        ...baseOptions,
        rootCode: "1100",
      });
      expect(ledger.items.every((i) => ["1101", "1102"].includes(i.code))).toBe(
        true,
      );
      expect(ledger.items.some((i) => i.code === "3110")).toBe(false);
      // Info: (20260727 - Julian) 1101 兩筆(A,B) + 1102 一筆(B) = 3 筆
      expect(ledger.items).toHaveLength(3);
    });

    it("虛擬集計根 11XX（不在字典）：仍能沿 parentCode 命中子樹 1101/1102", () => {
      // Info: (20260727 - Julian) 1101→1100→11XX 命中；3110→31XX→3XXX 無 11XX，故排除
      const ledger = generateLedger(vouchers, dictionary, {
        ...baseOptions,
        rootCode: "11XX",
      });
      expect(ledger.items.every((i) => ["1101", "1102"].includes(i.code))).toBe(
        true,
      );
      expect(ledger.items.some((i) => i.code === "3110")).toBe(false);
      expect(ledger.items.length).toBeGreaterThan(0);
    });

    it("GENERAL 上捲後仍以子樹歸屬：rootCode=1100 只留上捲後的 1100（含自身），排除 31XX", () => {
      const ledger = generateLedger(vouchers, dictionary, {
        ...baseOptions,
        labelType: LabelType.GENERAL,
        rootCode: "1100",
      });
      expect(ledger.items.every((i) => i.code === "1100")).toBe(true);
      expect(ledger.items.some((i) => i.code === "31XX")).toBe(false);
      // Info: (20260727 - Julian) 1101/1102 三筆過帳上捲至 1100
      expect(ledger.items).toHaveLength(3);
      // Info: (20260727 - Julian) 1100 最終累計 +1000 −400 +400 = 1000
      expect(ledger.items[ledger.items.length - 1].balance).toBe("1000");
    });

    it("末階葉節點 1101 作為 rootCode：僅回傳自身、不含同層 1102", () => {
      const ledger = generateLedger(vouchers, dictionary, {
        ...baseOptions,
        rootCode: "1101",
      });
      expect(ledger.items.every((i) => i.code === "1101")).toBe(true);
      expect(ledger.items).toHaveLength(2);
    });

    it("rootCode 無任何子孫（不存在的科目）→ 空清單且總計為零", () => {
      const ledger = generateLedger(vouchers, dictionary, {
        ...baseOptions,
        rootCode: "9999",
      });
      expect(ledger.items).toHaveLength(0);
      expect(ledger.total.totalDebit).toBe("0");
      expect(ledger.total.totalCredit).toBe("0");
    });
  });
});

// Info: (20260728 - Julian) 篩選與排序：accountType 過濾與欄位傳播、餘額區間（絕對值語意）、餘額排序、關鍵字
describe("generateLedger — 篩選與排序", () => {
  // Info: (20260728 - Julian) 具科目類別的字典（type 有值），供 accountType 過濾與欄位傳播驗證
  const typedDict: IAccount[] = [
    { code: "1101", name: "庫存現金", parentCode: "1100", type: "asset" },
    { code: "1102", name: "零用金", parentCode: "1100", type: "asset" },
    { code: "4111", name: "銷貨收入", parentCode: "4100", type: "revenue" },
  ].map((a) => ({ ...a, description: "", level: 0, isDebit: true }));

  // Info: (20260728 - Julian) 1102：借 400、再借 600（餘額 400→1000）；4111：貸 400、貸 600（餘額 -400→-1000）
  const vouchers: IVoucher[] = [
    makeVoucher("F1", "2026-03-01", [
      { code: "1102", name: "零用金", amount: 400, isDebit: true },
      { code: "4111", name: "銷貨收入", amount: 400, isDebit: false },
    ]),
    makeVoucher("F2", "2026-03-05", [
      { code: "1102", name: "零用金", amount: 600, isDebit: true },
      { code: "4111", name: "銷貨收入", amount: 600, isDebit: false },
    ]),
  ];

  const base = {
    labelType: LabelType.ALL,
    sorting: LedgerSorting.CODE_ASC,
    currencyAlias: "TWD",
  };

  it("accountType 過濾：僅保留該類別科目，且 accountType 欄位正確傳播", () => {
    const asset = generateLedger(vouchers, typedDict, {
      ...base,
      accountType: "asset",
    });
    expect(asset.items.length).toBe(2);
    expect(asset.items.every((i) => i.code === "1102")).toBe(true);
    // Info: (20260728 - Julian) 欄位傳播：由字典帶出的 type
    expect(asset.items.every((i) => i.accountType === "asset")).toBe(true);

    const revenue = generateLedger(vouchers, typedDict, {
      ...base,
      accountType: "revenue",
    });
    expect(revenue.items.every((i) => i.code === "4111")).toBe(true);
    expect(revenue.items.every((i) => i.accountType === "revenue")).toBe(true);
  });

  it("餘額區間 LTE 採絕對值語意：|餘額| ≤ 值 才保留（負餘額以絕對值判定）", () => {
    // Info: (20260728 - Julian) 各列餘額：1102=400,1000；4111=-400,-1000。|·|≤500 → 僅 400 與 -400 保留
    const ledger = generateLedger(vouchers, typedDict, {
      ...base,
      balanceOp: BalanceComparator.LTE,
      balanceValue: "500",
    });
    const balances = ledger.items.map((i) => i.balance).sort();
    expect(balances).toEqual(["-400", "400"]);
    // Info: (20260728 - Julian) 關鍵：-1000 若用原值比較會被 LTE 500 誤收，絕對值語意下必須排除
    expect(ledger.items.some((i) => i.balance === "-1000")).toBe(false);
  });

  it("餘額區間 EQ 採絕對值語意：|餘額| = 值（正負同額皆命中）", () => {
    const ledger = generateLedger(vouchers, typedDict, {
      ...base,
      balanceOp: BalanceComparator.EQ,
      balanceValue: "1000",
    });
    const balances = ledger.items.map((i) => i.balance).sort();
    expect(balances).toEqual(["-1000", "1000"]);
  });

  it("餘額區間 GTE 採絕對值語意：|餘額| ≥ 值", () => {
    const ledger = generateLedger(vouchers, typedDict, {
      ...base,
      balanceOp: BalanceComparator.GTE,
      balanceValue: "500",
    });
    const balances = ledger.items.map((i) => i.balance).sort();
    expect(balances).toEqual(["-1000", "1000"]);
  });

  it("餘額排序採原值（非絕對值）：BALANCE_ASC 由負至正、BALANCE_DESC 反之", () => {
    const asc = generateLedger(vouchers, typedDict, {
      ...base,
      sorting: LedgerSorting.BALANCE_ASC,
    });
    expect(asc.items.map((i) => i.balance)).toEqual([
      "-1000",
      "-400",
      "400",
      "1000",
    ]);

    const desc = generateLedger(vouchers, typedDict, {
      ...base,
      sorting: LedgerSorting.BALANCE_DESC,
    });
    expect(desc.items.map((i) => i.balance)).toEqual([
      "1000",
      "400",
      "-400",
      "-1000",
    ]);
  });

  it("關鍵字比對會計科目名稱：僅保留命中列，餘額仍為真實累計", () => {
    const ledger = generateLedger(vouchers, typedDict, {
      ...base,
      keyword: "銷貨",
    });
    expect(ledger.items.length).toBe(2);
    expect(ledger.items.every((i) => i.code === "4111")).toBe(true);
  });
});
