import { describe, it, expect } from "@jest/globals";
import { generateLedger } from "@/lib/report/ledger_generator";
import { IAccount } from "@/constants/accounts";
import { IVoucher } from "@/interfaces/voucher";
import { LabelType } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

// Info: (20260724 - Julian) COA 字典：1100 為 1101/1102 之父（非葉）；1101/1102/3110 為葉節點
const dictionary: IAccount[] = [
  { code: "1100", name: "現金及約當現金", parentCode: "11XX" },
  { code: "1101", name: "庫存現金", parentCode: "1100" },
  { code: "1102", name: "零用金", parentCode: "1100" },
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
    // Info: (20260724 - Julian) 1101：借 1000 -> 餘 1000；貸 400 -> 餘 600
    expect(cash[0].balance).toBe("1000");
    expect(cash[1].balance).toBe("600");
  });

  it("借貸總額正確且平衡", () => {
    const ledger = generateLedger(vouchers, dictionary, baseOptions);
    // Info: (20260724 - Julian) 借: 1000 + 400 = 1400；貸: 1000 + 400 = 1400
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
    // Info: (20260724 - Julian) 過帳明細共 4 筆 (A:1101,3110 / B:1101,1102)，皆為葉節點，故 DETAILED 全保留
    const detailed = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      labelType: LabelType.DETAILED,
    });
    expect(detailed.items.length).toBe(4);

    // Info: (20260724 - Julian) GENERAL 僅保留非葉科目；本例過帳科目皆為葉，故為空
    const general = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      labelType: LabelType.GENERAL,
    });
    expect(general.items.length).toBe(0);
  });

  it("空期間（無傳票）回傳空清單且總計為零", () => {
    const ledger = generateLedger([], dictionary, baseOptions);
    expect(ledger.items).toHaveLength(0);
    expect(ledger.total.totalDebit).toBe("0");
    expect(ledger.total.totalCredit).toBe("0");
  });

  it("多科目 running balance 互不干擾", () => {
    const ledger = generateLedger(vouchers, dictionary, baseOptions);
    // Info: (20260724 - Julian) 1102 僅一筆借 400，餘額應為 400（不受 1101 影響）
    const petty = ledger.items.filter((i) => i.code === "1102");
    expect(petty).toHaveLength(1);
    expect(petty[0].balance).toBe("400");
  });

  it("排序 DATE_DESC：依傳票日期由新到舊", () => {
    const ledger = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      sorting: LedgerSorting.DATE_DESC,
    });
    // Info: (20260724 - Julian) B(03-10) 應排在 A(03-05) 之前
    expect(ledger.items[0].voucherDate).toBeGreaterThanOrEqual(
      ledger.items[ledger.items.length - 1].voucherDate,
    );
  });

  it("科目區間單邊（僅 startAccountNo=1102）", () => {
    const ledger = generateLedger(vouchers, dictionary, {
      ...baseOptions,
      startAccountNo: "1102",
    });
    // Info: (20260724 - Julian) 僅保留 code >= 1102 者：1102 與 3110
    expect(ledger.items.every((i) => i.code >= "1102")).toBe(true);
    expect(ledger.items.some((i) => i.code === "1101")).toBe(false);
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
});
