import { describe, it, expect } from "@jest/globals";
import { generateTrialBalance } from "@/lib/report/trial_balance_generator";
import { IAccount } from "@/constants/accounts";
import { IVoucher } from "@/interfaces/voucher";
import { TrialBalanceSorting } from "@/constants/sort";

// Info: (20260724 - Julian) 測試用 COA 字典（以 parentCode 建立父子關係，供樹狀上捲）
const dictionary: IAccount[] = [
  { code: "1XXX", name: "資產", parentCode: "" },
  { code: "11XX", name: "流動資產", parentCode: "1XXX" },
  { code: "1100", name: "現金及約當現金", parentCode: "11XX" },
  { code: "1101", name: "庫存現金", parentCode: "1100" },
  { code: "1102", name: "零用金", parentCode: "1100" },
  { code: "3XXX", name: "權益", parentCode: "" },
  { code: "31XX", name: "股本", parentCode: "3XXX" },
  { code: "3110", name: "普通股股本", parentCode: "31XX" },
].map((a) => ({ ...a, description: "", type: "", level: 0, isDebit: true }));

const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

// Info: (20260724 - Julian) 建立最小可用的 IVoucher（僅填產生器會讀取的欄位）
const makeVoucher = (
  id: string,
  isoDate: string,
  lines: {
    code: string;
    name: string;
    amount: number;
    isDebit: boolean;
  }[],
): IVoucher =>
  ({
    id,
    tradingDate: seconds(isoDate),
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

describe("generateTrialBalance", () => {
  const options = {
    startDate: new Date("2026-03-01T00:00:00"),
    endDate: new Date("2026-04-30T23:59:59"),
    currencyAlias: "TWD",
    sorting: TrialBalanceSorting.CODE_ASC,
  };

  const vouchers: IVoucher[] = [
    // Info: (20260724 - Julian) 期初（分界日之前）：現金 1000 / 股本 1000
    makeVoucher("A", "2026-01-15", [
      { code: "1101", name: "庫存現金", amount: 1000, isDebit: true },
      { code: "3110", name: "普通股股本", amount: 1000, isDebit: false },
    ]),
    // Info: (20260724 - Julian) 期中（分界日之後）：零用金 300 / 股本 300
    makeVoucher("B", "2026-03-15", [
      { code: "1102", name: "零用金", amount: 300, isDebit: true },
      { code: "3110", name: "普通股股本", amount: 300, isDebit: false },
    ]),
  ];

  it("三個期間的借貸總額皆平衡", () => {
    const tb = generateTrialBalance(vouchers, dictionary, options);
    expect(tb.total.beginningDebit).toBe("1000");
    expect(tb.total.beginningCredit).toBe("1000");
    expect(tb.total.midtermDebit).toBe("300");
    expect(tb.total.midtermCredit).toBe("300");
    expect(tb.total.endingDebit).toBe("1300");
    expect(tb.total.endingCredit).toBe("1300");
  });

  it("沿 parentCode 樹狀上捲：父科目彙總子科目金額", () => {
    const tb = generateTrialBalance(vouchers, dictionary, options);

    // Info: (20260724 - Julian) 頂層應為 1XXX 資產 與 3XXX 權益
    const asset = tb.items.find((i) => i.code === "1XXX");
    expect(asset).toBeDefined();
    expect(asset!.endingDebit).toBe("1300");

    // Info: (20260724 - Julian) 1100 現金及約當現金 = 1101(1000) + 1102(300)
    const cashParent = asset!.subAccounts
      .find((i) => i.code === "11XX")!
      .subAccounts.find((i) => i.code === "1100")!;
    expect(cashParent.endingDebit).toBe("1300");
    expect(cashParent.beginningDebit).toBe("1000");
    expect(cashParent.midtermDebit).toBe("300");

    // Info: (20260724 - Julian) 葉節點 1101 / 1102
    const leaves = cashParent.subAccounts;
    expect(leaves.find((i) => i.code === "1101")!.endingDebit).toBe("1000");
    expect(leaves.find((i) => i.code === "1102")!.endingDebit).toBe("300");
  });

  it("借貸不平衡時依決定論護欄拋錯 (Fail Fast)", () => {
    const unbalanced: IVoucher[] = [
      makeVoucher("C", "2026-03-10", [
        { code: "1101", name: "庫存現金", amount: 500, isDebit: true },
      ]),
    ];
    expect(() => generateTrialBalance(unbalanced, dictionary, options)).toThrow(
      /Imbalance/,
    );
  });

  it("缺乏會計代碼或借貸方向時阻斷輸出", () => {
    const broken = [
      {
        id: "D",
        tradingDate: seconds("2026-03-10"),
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
    expect(() => generateTrialBalance(broken, dictionary, options)).toThrow(
      /Data Integrity Violation/,
    );
  });

  it("空期間（無傳票）回傳空清單且總計為零並平衡", () => {
    const tb = generateTrialBalance([], dictionary, options);
    expect(tb.items).toHaveLength(0);
    expect(tb.total.endingDebit).toBe("0");
    expect(tb.total.endingCredit).toBe("0");
  });

  it("邊界日：交易日等於分界日應歸入期中（beginning 為 date < start）", () => {
    const boundaryVouchers: IVoucher[] = [
      makeVoucher("E", "2026-03-01T00:00:00", [
        { code: "1101", name: "庫存現金", amount: 500, isDebit: true },
        { code: "3110", name: "普通股股本", amount: 500, isDebit: false },
      ]),
    ];
    const tb = generateTrialBalance(boundaryVouchers, dictionary, options);
    expect(tb.total.beginningDebit).toBe("0");
    expect(tb.total.midtermDebit).toBe("500");
    expect(tb.total.endingDebit).toBe("500");
  });

  it("前綴陷阱：科目 1410 依 parentCode 上捲至 11XX，而非以代碼前綴歸類", () => {
    // Info: (20260724 - Julian) 1410 前綴為 "14"，但 parentCode 指向 11XX 流動資產
    const trapDict: IAccount[] = [
      { code: "1XXX", name: "資產", parentCode: "" },
      { code: "11XX", name: "流動資產", parentCode: "1XXX" },
      { code: "1410", name: "預付費用", parentCode: "11XX" },
      { code: "3XXX", name: "權益", parentCode: "" },
      { code: "3110", name: "普通股股本", parentCode: "3XXX" },
    ].map((a) => ({
      ...a,
      description: "",
      type: "",
      level: 0,
      isDebit: true,
    }));

    const trapVouchers: IVoucher[] = [
      makeVoucher("F", "2026-03-15", [
        { code: "1410", name: "預付費用", amount: 800, isDebit: true },
        { code: "3110", name: "普通股股本", amount: 800, isDebit: false },
      ]),
    ];

    const tb = generateTrialBalance(trapVouchers, trapDict, options);
    const asset = tb.items.find((i) => i.code === "1XXX")!;
    const currentAssets = asset.subAccounts.find((i) => i.code === "11XX")!;
    // Info: (20260724 - Julian) 1410 應計入 11XX，且不存在任何 "14XX" 前綴桶
    expect(currentAssets.endingDebit).toBe("800");
    expect(
      currentAssets.subAccounts.find((i) => i.code === "1410"),
    ).toBeDefined();
    expect(tb.items.find((i) => i.code === "14XX")).toBeUndefined();
  });

  it("排序 ENDING_DEBIT_DESC：頂層依期末借方由大到小", () => {
    const tb = generateTrialBalance(vouchers, dictionary, {
      ...options,
      sorting: TrialBalanceSorting.ENDING_DEBIT_DESC,
    });
    // Info: (20260724 - Julian) 1XXX(1300 借) 應排在 3XXX(0 借) 之前
    expect(tb.items[0].code).toBe("1XXX");
  });
});
