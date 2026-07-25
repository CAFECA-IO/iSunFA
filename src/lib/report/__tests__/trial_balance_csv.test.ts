import { describe, it, expect } from "@jest/globals";
import { buildTrialBalanceCsv } from "@/lib/report/trial_balance_csv";
import { ITrialBalance } from "@/interfaces/trial_balance";

describe("buildTrialBalanceCsv", () => {
  const trialBalance: ITrialBalance = {
    currencyAlias: "TWD",
    items: [
      {
        code: "1XXX",
        name: "資產",
        beginningDebit: "1000",
        beginningCredit: "0",
        midtermDebit: "300",
        midtermCredit: "0",
        endingDebit: "1300",
        endingCredit: "0",
        subAccounts: [
          {
            code: "1101",
            name: '現金 "小" 額',
            beginningDebit: "1000",
            beginningCredit: "0",
            midtermDebit: "0",
            midtermCredit: "0",
            endingDebit: "1000",
            endingCredit: "0",
            subAccounts: [],
          },
        ],
      },
    ],
    total: {
      beginningDebit: "1000",
      beginningCredit: "1000",
      midtermDebit: "300",
      midtermCredit: "300",
      endingDebit: "1300",
      endingCredit: "1300",
    },
  };

  it("表頭為 8 欄", () => {
    const lines = buildTrialBalanceCsv(trialBalance).split("\n");
    expect(lines[0].split('","')).toHaveLength(8);
  });

  it("樹狀科目深度優先攤平（父+子皆輸出）", () => {
    const lines = buildTrialBalanceCsv(trialBalance).split("\n");
    // Info: (20260724 - Julian) header + 1XXX + 1101 + 合計 = 4 列
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('"1XXX"');
    expect(lines[2]).toContain('"1101"');
  });

  it('雙引號依 RFC 4180 跳脫為 ""', () => {
    const csv = buildTrialBalanceCsv(trialBalance);
    expect(csv).toContain('現金 ""小"" 額');
  });

  it("末列為合計且金額正確", () => {
    const lines = buildTrialBalanceCsv(trialBalance).split("\n");
    const last = lines[lines.length - 1];
    expect(last).toContain("合計 (Total)");
    expect(last).toContain('"1300"');
  });
});
