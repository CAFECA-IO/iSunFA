import { describe, it, expect } from "@jest/globals";
import { buildTrialBalanceCsv } from "@/lib/report/trial_balance_csv";
import { ITrialBalance } from "@/interfaces/trial_balance";
import { AccountType } from "@/constants/enums";

describe("buildTrialBalanceCsv", () => {
  const trialBalance: ITrialBalance = {
    currencyAlias: "TWD",
    items: [
      {
        code: "1XXX",
        name: "資產",
        accountType: AccountType.ASSET,
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
            accountType: AccountType.ASSET,
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
    const header = buildTrialBalanceCsv(trialBalance).split("\r\n")[0];
    expect(header.split('","')).toHaveLength(8);
  });

  it("樹狀科目深度優先攤平（父 + 子皆輸出）加合計，共 4 列", () => {
    const lines = buildTrialBalanceCsv(trialBalance).split("\r\n");
    // Info: (20260728 - Julian) header + 1XXX + 1101 + 合計 = 4 列
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('"1XXX"');
    expect(lines[2]).toContain('"1101"');
  });

  it('雙引號依 RFC 4180 跳脫為 ""', () => {
    const csv = buildTrialBalanceCsv(trialBalance);
    expect(csv).toContain('現金 ""小"" 額');
  });

  it("末列為合計且金額正確", () => {
    const lines = buildTrialBalanceCsv(trialBalance).split("\r\n");
    const last = lines[lines.length - 1];
    expect(last).toContain("合計 (Total)");
    expect(last).toContain('"1300"');
  });

  it("列分隔採 RFC 4180 的 CRLF", () => {
    expect(buildTrialBalanceCsv(trialBalance)).toContain("\r\n");
  });

  // Info: (20260728 - Julian) 安全：CSV 公式注入防護（csvText）——文字欄位以 = + - @ 開頭者前置單引號中和
  it("文字欄位公式注入防護：=/@ 開頭之科目代碼與名稱前置單引號", () => {
    const injection: ITrialBalance = {
      currencyAlias: "TWD",
      items: [
        {
          code: "=1+1",
          name: "@SUM(A1:A9)",
          accountType: AccountType.ASSET,
          beginningDebit: "0",
          beginningCredit: "0",
          midtermDebit: "0",
          midtermCredit: "0",
          endingDebit: "0",
          endingCredit: "0",
          subAccounts: [],
        },
      ],
      total: {
        beginningDebit: "0",
        beginningCredit: "0",
        midtermDebit: "0",
        midtermCredit: "0",
        endingDebit: "0",
        endingCredit: "0",
      },
    };
    const line = buildTrialBalanceCsv(injection).split("\r\n")[1];
    expect(line).toContain(`"'=1+1"`);
    expect(line).toContain(`"'@SUM(A1:A9)"`);
  });

  it("金額欄不套用公式防護，負數金額保留不被破壞", () => {
    const negative: ITrialBalance = {
      currencyAlias: "TWD",
      items: [
        {
          code: "3110",
          name: "股本",
          accountType: AccountType.EQUITY,
          beginningDebit: "0",
          beginningCredit: "-500",
          midtermDebit: "0",
          midtermCredit: "0",
          endingDebit: "0",
          endingCredit: "-500",
          subAccounts: [],
        },
      ],
      total: {
        beginningDebit: "0",
        beginningCredit: "-500",
        midtermDebit: "0",
        midtermCredit: "0",
        endingDebit: "0",
        endingCredit: "-500",
      },
    };
    const line = buildTrialBalanceCsv(negative).split("\r\n")[1];
    // Info: (20260728 - Julian) 金額走 csvCell（非 csvText），負號不得被前置單引號破壞
    expect(line).toContain('"-500"');
    expect(line).not.toContain(`"'-500"`);
  });
});
