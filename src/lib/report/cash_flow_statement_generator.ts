import { IVoucherLineUI } from "@/interfaces/voucher";
import {
  ICashFlowStatement,
  ICashFlowStatementItem,
} from "@/interfaces/cash_flow_statement";
import { MoneyUtil } from "@/lib/utils/money";
import { Decimal } from "decimal.js";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { AccountUtil } from "@/lib/utils/account_util";
import { SystemAccountNodes } from "@/constants/system_account_codes";

// Info: (20260518 - Tzuhan) [AUDIT FIX] 強制要求外部傳入期初餘額，不准在內部虛擬補數
export function generateCashFlowStatement(
  lineItems: IVoucherLineUI[],
  beginningCashBalance: number | string | Decimal,
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
  // Info: (20260518 - Tzuhan) [AUDIT FIX] 拔除 nonOperatingIncomeAndExpense，禁止破壞恆等式的反向排除
  let interestPaid = MoneyUtil.toDecimal(0);
  let taxesPaid = MoneyUtil.toDecimal(0);
  let capitalExpenditure = MoneyUtil.toDecimal(0);
  let dividendsPaid = MoneyUtil.toDecimal(0);
  let inventoryIncrease = MoneyUtil.toDecimal(0);

  lineItems.forEach((line) => {
    const code = line.accountingCode || line.accounting?.code;

    // Info: (20260518 - Tzuhan) [AUDIT FIX] 拔除沉默丟失，改為 CPA 級別阻斷防護
    if (!code || line.isDebit === null) {
      throw new Error(
        `[Data Integrity Violation] 發現無法勾稽的傳票明細，缺乏會計代碼或借貸方向 (Line ID: ${line.id})`,
      );
    }

    const name = line.accounting?.name || line.particular || code;
    const { isDebit, amount } = line;

    // Info: (20260331 - Julian) 現金或淨利影響：貸方 = 現金流入/淨利增加 = 正向，借方 = 現金流出/淨利減少 = 負向
    const impact = isDebit
      ? MoneyUtil.toDecimal(amount).negated()
      : MoneyUtil.toDecimal(amount);

    // Info: (20260520 - Tzuhan) [REFACTOR] 1. 樹狀溯源計算應計基礎淨利 (Net Income)
    const isIncomeOrExpense =
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.INCOME_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.COST_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.EXPENSE_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.NON_OP_INCOME_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.OTHER_COMPREHENSIVE_INCOME_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.TAX_EXPENSE_ROOT,
        TW_ACCOUNTS,
      );

    if (isIncomeOrExpense) {
      netIncome = netIncome.plus(impact);

      // Info: (20260520 - Tzuhan) [REFACTOR] 補充揭露：精確錨點定位利息與所得稅
      if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.INTEREST_EXPENSE_ROOT,
          TW_ACCOUNTS,
        ) ||
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.INTEREST_EXPENSE_ROOT_ALT,
          TW_ACCOUNTS,
        )
      ) {
        interestPaid = interestPaid.plus(
          isDebit
            ? MoneyUtil.toDecimal(amount)
            : MoneyUtil.toDecimal(amount).negated(),
        );
      }
      if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.TAX_EXPENSE_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        taxesPaid = taxesPaid.plus(
          isDebit
            ? MoneyUtil.toDecimal(amount)
            : MoneyUtil.toDecimal(amount).negated(),
        );
      }
    }

    // Info: (20260520 - Tzuhan) [REFACTOR] 2. 營業活動 - 營運資金變動 (動態適應，不再漏接)
    if (
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.CURRENT_ASSETS_ROOT,
        TW_ACCOUNTS,
      )
    ) {
      if (
        !AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.CASH_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);

        if (
          AccountUtil.isDescendantOf(
            code,
            SystemAccountNodes.INVENTORY_ROOT,
            TW_ACCOUNTS,
          )
        ) {
          // Info: (20260518 - Tzuhan) [AUDIT FIX] 資產借方增加 = 現金流負向(impact 為負)。
          inventoryIncrease = inventoryIncrease.plus(impact.negated());
        }
      }
    }

    // Info: (20260520 - Tzuhan) [REFACTOR] 流動負債變動 (營業活動，包含 23 預收款徹底防漏)
    if (
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.CURRENT_LIABILITIES_ROOT,
        TW_ACCOUNTS,
      )
    ) {
      // Info: (20260504 - Tzuhan) 改由底層字典的 isInterestBearing 標籤統一控管有息負債
      if (line.accounting?.isInterestBearing) {
        addItem(financingItems, `短期借款/票券及一年內到期長債變動`, impact);
      } else {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);
      }
    }

    // Info: (20260520 - Tzuhan) [REFACTOR] 3. 投資活動 (非流動資產)
    if (
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.NON_CURRENT_ASSETS_ROOT,
        TW_ACCOUNTS,
      )
    ) {
      // Info: (20260504 - Tzuhan) 改由備抵資產 (Contra-Asset) 的變動來精準捕捉折舊攤銷，完全捨棄中文關鍵字比對
      const accountInfo = AccountUtil.getAccount(code, TW_ACCOUNTS);
      if (accountInfo && accountInfo.isDebit === false) {
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
      if (
        isDebit &&
        !AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.INTANGIBLE_ASSETS_ROOT,
          TW_ACCOUNTS,
        ) &&
        !AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.OTHER_ASSETS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        // 為了相容原本判斷 15, 16 但排除其他，簡化為只要是非流動且不是無形/其他，就算資本支出
        capitalExpenditure = capitalExpenditure.plus(
          MoneyUtil.toDecimal(amount),
        );
      }
      addItem(investingItems, `取得/處分 ${name}`, impact);
    }

    // Info: (20260520 - Tzuhan) [REFACTOR] 4. 籌資活動 (非流動負債與權益)
    if (
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.NON_CURRENT_LIABILITIES_ROOT,
        TW_ACCOUNTS,
      )
    ) {
      addItem(financingItems, `長期負債變動: ${name}`, impact);
    }
    if (
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.EQUITY_ROOT,
        TW_ACCOUNTS,
      )
    ) {
      if (line.accounting?.isDividend && isDebit) {
        // Info: (20260504 - Tzuhan) 分配股利為未分配盈餘 (335) 的借方變動
        dividendsPaid = dividendsPaid.plus(MoneyUtil.toDecimal(amount));
        addItem(financingItems, `發放股利`, impact);
      } else if (
        !AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.RETAINED_EARNINGS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
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
  // Info: (20260518 - Tzuhan) [AUDIT FIX] 拔除導致總現金流蒸發的「營業外收支反向排除」

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

  // Info: (20260518 - Tzuhan) 使用外部傳入的精準期初餘額
  const beginningBalance = MoneyUtil.toDecimal(beginningCashBalance);
  const netIncreaseDecrease = totalOperating
    .plus(totalInvesting)
    .plus(totalFinancing);
  const endingBalance = beginningBalance.plus(netIncreaseDecrease);

  // Info: (20260330 - Julian) 計算指標
  const freeCashFlow = totalOperating.minus(capitalExpenditure); // Info: (20260330 - Julian) 自由現金流

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
      // Info: (20260518 - Tzuhan) [AUDIT FIX] 顯式輸出跨表指標所需之補充揭露明細，拒絕外部依賴字串解析
      capitalExpenditure: capitalExpenditure.toString(),
      inventoryChange: inventoryIncrease.toString(),
      dividendsPaid: dividendsPaid.toString(),
    },
    metrics: {
      freeCashFlow: freeCashFlow.toString(),
      /**Info: (20260518 - Tzuhan) [AUDIT FIX]
       * 以下比率需依賴「資產負債表期末餘額」或跨表存貨明細。
       * 現金流量表引擎僅持有當期傳票變動數，無權單獨捏造計算。為堅守「零捏造與絕對精準」鐵律，全數回傳 null。
       * 應交由更高層的綜合財務分析服務 (Analysis Service) 進行跨表計算。
       */
      operatingCashFlowRatio: null,
      cashFlowAdequacyRatio: null,
      cashReinvestmentRatio: null,
    },
  };
}
