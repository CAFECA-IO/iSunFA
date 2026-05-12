import { IVoucherLineUI } from "@/interfaces/voucher";
import {
  ICashFlowStatement,
  ICashFlowStatementItem,
} from "@/interfaces/cash_flow_statement";
import { MoneyUtil } from "@/lib/utils/money";
import { Decimal } from "decimal.js";

export function generateCashFlowStatement(
  lineItems: IVoucherLineUI[],
): ICashFlowStatement {
  const operatingItems = new Map<string, { name: string; amount: Decimal }>();
  const investingItems = new Map<string, { name: string; amount: Decimal }>();
  const financingItems = new Map<string, { name: string; amount: Decimal }>();

  // Info: (20260330 - Julian) 加入項目：amount > 0 表現金流入, amount < 0 表現金流出
  const addItem = (
    map: Map<string, { name: string; amount: Decimal }>,
    name: string,
    amount: Decimal,
  ) => {
    if (amount.isZero()) return;
    const current = map.get(name)?.amount || MoneyUtil.toDecimal(0);
    map.set(name, { name, amount: current.plus(amount) });
  };

  // Info: (20260330 - Julian) 關鍵指標
  let netIncome = MoneyUtil.toDecimal(0);
  let depreciationAndAmortization = MoneyUtil.toDecimal(0);
  let nonOperatingIncomeAndExpense = MoneyUtil.toDecimal(0);
  let interestPaid = MoneyUtil.toDecimal(0);
  let taxesPaid = MoneyUtil.toDecimal(0);
  let capitalExpenditure = MoneyUtil.toDecimal(0);
  let dividendsPaid = MoneyUtil.toDecimal(0);

  // Info: (20260330 - Julian) 計算營業現金流對流動負債比率
  let currentLiabilitiesTotal = MoneyUtil.toDecimal(0);

  lineItems.forEach((line) => {
    const code = line.accountingCode || line.accounting?.code;
    if (!code || line.isDebit === null) return;

    const name = line.accounting?.name || line.particular || code;
    const { isDebit, amount } = line;

    /* Info: (20260330 - Julian)
     * 1. 資產增加(借方)代表現金流出，減少(貸方)代表現金流入
     * 2. 負債/權益/收益增加(貸方)代表現金流入，減少(借方)代表現金流出
     * 3. 費損增加(借方)代表減少淨利
     */

    // Info: (20260331 - Julian) 現金或淨利影響：貸方 = 現金流入/淨利增加 = 正向，借方 = 現金流出/淨利減少 = 負向
    const impact = isDebit
      ? MoneyUtil.toDecimal(amount).negated()
      : MoneyUtil.toDecimal(amount);

    // Info: (20260330 - Julian) 1. 計算應計基礎淨利 (Net Income)
    if (
      code.startsWith("4") ||
      code.startsWith("5") ||
      code.startsWith("6") ||
      code.startsWith("7") ||
      code.startsWith("8")
    ) {
      netIncome = netIncome.plus(impact);

      // Info: (20260504 - Tzuhan) ⚠️修復：反向調節營業外收支 (7,8 開頭)，避免與投資/籌資活動現金流重複計算
      if (code.startsWith("7") || code.startsWith("8")) {
        nonOperatingIncomeAndExpense =
          nonOperatingIncomeAndExpense.plus(impact);
      }

      // Info: (20260504 - Tzuhan) 補充揭露：使用代碼 (7510/7050 利息, 79 所得稅) 避免中文判斷失效
      if (code.startsWith("751") || code.startsWith("705"))
        interestPaid = interestPaid.plus(
          isDebit
            ? MoneyUtil.toDecimal(amount)
            : MoneyUtil.toDecimal(amount).negated(),
        );
      if (code.startsWith("79"))
        taxesPaid = taxesPaid.plus(
          isDebit
            ? MoneyUtil.toDecimal(amount)
            : MoneyUtil.toDecimal(amount).negated(),
        );
    }

    // Info: (20260330 - Julian) 2. 營業活動 - 營運營運資金變動
    if (code.startsWith("11") || code.startsWith("12")) {
      // Info: (20260331 - Julian) 排除現金
      if (!code.startsWith("110")) {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);
      }
    } else if (code.startsWith("13") || code.startsWith("14")) {
      // Info: (20260331 - Julian) 存貨
      if (code.startsWith("13")) {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);
      }
    }

    // Info: (20260330 - Julian) 流動負債變動 (營業活動)
    if (code.startsWith("21") || code.startsWith("22")) {
      // Info: (20260504 - Tzuhan) ⚠️修復：改由底層字典的 isInterestBearing 標籤統一控管有息負債，實現資料與邏輯解耦
      if (line.accounting?.isInterestBearing) {
        addItem(financingItems, `短期借款/票券及一年內到期長債變動`, impact);
      } else {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);
      }
      if (isDebit)
        currentLiabilitiesTotal = currentLiabilitiesTotal.minus(
          MoneyUtil.toDecimal(amount),
        );
      else
        currentLiabilitiesTotal = currentLiabilitiesTotal.plus(
          MoneyUtil.toDecimal(amount),
        );
    }

    // Info: (20260330 - Julian) 3. 投資活動
    if (
      code.startsWith("15") ||
      code.startsWith("16") ||
      code.startsWith("17") ||
      code.startsWith("18") ||
      code.startsWith("19")
    ) {
      // Info: (20260504 - Tzuhan) ⚠️修復：改由備抵資產 (Contra-Asset) 的變動來精準捕捉折舊攤銷，完全捨棄中文關鍵字比對
      if (line.accounting && !line.accounting.isDebit) {
        if (!isDebit) {
          // Info: (20260512 - Tzuhan) 貸方增加代表提列折舊/攤銷，加回淨利
          depreciationAndAmortization = depreciationAndAmortization.plus(
            MoneyUtil.toDecimal(amount),
          );
        } else {
          // Info: (20260512 - Tzuhan) 借方減少代表處分資產時的累計折舊沖銷，應作為投資活動現金流的減項（還原資產帳面價值）
          addItem(investingItems, `處分資產(累計折舊沖銷)`, impact);
        }
        return;
      }

      // Info: (20260330 - Julian) 粗略算資本支出 (不動產廠房設備增加=借方)
      if (isDebit && (code.startsWith("15") || code.startsWith("16"))) {
        capitalExpenditure = capitalExpenditure.plus(
          MoneyUtil.toDecimal(amount),
        );
      }
      addItem(investingItems, `取得/處分 ${name}`, impact);
    }
    // Info: (20260330 - Julian) 長期投資
    if (code.startsWith("14")) {
      addItem(investingItems, `長期投資變動`, impact);
    }

    // Info: (20260330 - Julian) 4. 籌資活動 (融資)
    if (
      code.startsWith("25") ||
      code.startsWith("26") ||
      code.startsWith("28") ||
      code.startsWith("29")
    ) {
      addItem(financingItems, `長期負債變動: ${name}`, impact);
    }
    if (code.startsWith("3")) {
      if (line.accounting?.isDividend && isDebit) {
        // Info: (20260504 - Tzuhan) 分配股利為未分配盈餘 (335) 的借方變動
        dividendsPaid = dividendsPaid.plus(MoneyUtil.toDecimal(amount));
        addItem(financingItems, `發放股利`, impact);
      } else if (!code.startsWith("33")) {
        addItem(financingItems, `權益變動: ${name}`, impact);
      }
    }
  });

  // Info: (20260330 - Julian) 轉換 Map 為 ICashFlowStatementItem[] (首項為本期淨利與折舊加回)
  const mapToArray = (
    map: Map<string, { name: string; amount: Decimal }>,
  ): ICashFlowStatementItem[] => {
    return Array.from(map.values())
      .filter((i) => !i.amount.isZero())
      .map((i) => ({ name: i.name, amount: i.amount.toString() }));
  };

  // Info: (20260331 - Julian) 組合「營業項目」數據
  const finalOperatingItems: ICashFlowStatementItem[] = [];
  finalOperatingItems.push({
    name: "本期稅後淨利",
    amount: netIncome.toString(),
  });
  if (!depreciationAndAmortization.isZero()) {
    finalOperatingItems.push({
      name: "折舊及攤銷費用(加回)",
      amount: depreciationAndAmortization.toString(),
    });
  }
  if (!nonOperatingIncomeAndExpense.isZero()) {
    finalOperatingItems.push({
      name: "營業外收支(反向排除)",
      amount: nonOperatingIncomeAndExpense.negated().toString(), // 收益(正)轉負扣除，費損(負)轉正加回
    });
  }
  finalOperatingItems.push(...mapToArray(operatingItems));

  const totalOperating = finalOperatingItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  const finalInvestingItems = mapToArray(investingItems);
  const totalInvesting = finalInvestingItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  const finalFinancingItems = mapToArray(financingItems);
  const totalFinancing = finalFinancingItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );

  // Info: (20260330 - Julian) 暫無期初/期末資訊，以本期變動為基礎，期初設為0
  const beginningBalance = MoneyUtil.toDecimal(0);
  const netIncreaseDecrease = totalOperating
    .plus(totalInvesting)
    .plus(totalFinancing);
  const endingBalance = beginningBalance.plus(netIncreaseDecrease);

  // Info: (20260330 - Julian) 計算指標
  const freeCashFlow = totalOperating.minus(capitalExpenditure); // Info: (20260330 - Julian) 自由現金流
  // Info: (20260330 - Julian) 營業現金流對流動負債比率 = 總營業現金流 / 流動負債
  const operatingCashFlowRatio = MoneyUtil.safeRatio(
    totalOperating,
    currentLiabilitiesTotal,
  );

  return {
    reportPeriod: "",
    currency: "TWD",
    activities: {
      operating: {
        items: finalOperatingItems,
        total: totalOperating.toString(),
      },
      investing: {
        items: finalInvestingItems,
        total: totalInvesting.toString(),
      },
      financing: {
        items: finalFinancingItems,
        total: totalFinancing.toString(),
      },
    },
    summary: {
      netIncreaseDecrease: netIncreaseDecrease.toString(),
      beginningBalance: beginningBalance.toString(),
      endingBalance: endingBalance.toString(),
    },
    supplementary: {
      interestPaid: interestPaid.toString(),
      taxesPaid: taxesPaid.toString(),
    },
    metrics: {
      freeCashFlow: freeCashFlow.toNumber(),
      operatingCashFlowRatio,
      cashFlowAdequacyRatio: MoneyUtil.safeRatio(
        totalOperating,
        capitalExpenditure.plus(totalFinancing.abs()),
      ),
      cashReinvestmentRatio: MoneyUtil.safeRatio(
        totalOperating.minus(dividendsPaid),
        1000000,
      ),
    },
  };
}
