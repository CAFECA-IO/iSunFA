import { IVoucherLineUI } from "@/interfaces/voucher";
import {
  IIncomeStatement,
  IIncomeStatementItem,
} from "@/interfaces/income_statement";
import { MoneyUtil } from "@/lib/utils/money";
import { Decimal } from "decimal.js";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { AccountUtil } from "@/lib/utils/account_util";
import { SystemAccountNodes } from "@/constants/system_account_codes";

export function generateIncomeStatement(
  lineItems: IVoucherLineUI[],
  // Info: (20260518 - Tzuhan) [AUDIT FIX] 拔除 parValue，EPS 計算已移交跨表引擎
): IIncomeStatement {
  const revenueMap = new Map<string, { name: string; amount: Decimal }>();
  const cogsMap = new Map<string, { name: string; amount: Decimal }>();
  const opexMap = new Map<string, { name: string; amount: Decimal }>();
  const nonOpMap = new Map<string, { name: string; amount: Decimal }>();
  const taxMap = new Map<string, { name: string; amount: Decimal }>();

  // Info: (20260330 - Julian) 追蹤 EBITDA 相關調整項目
  let depreciationAndAmortization = MoneyUtil.toDecimal(0);
  let interestExpense = MoneyUtil.toDecimal(0);

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

    // Info: (20260520 - Tzuhan) [REFACTOR] 改由樹狀結構溯源捕捉所有非流動資產的折舊攤銷
    if (
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.NON_CURRENT_ASSETS_ROOT,
        TW_ACCOUNTS,
      )
    ) {
      if (line.accounting && !line.accounting.isDebit) {
        if (!isDebit) {
          // Info: (20260504 - Tzuhan) 貸方增加代表提列折舊/攤銷
          depreciationAndAmortization = depreciationAndAmortization.plus(
            MoneyUtil.toDecimal(amount),
          );
        }
      }
    }

    // Info: (20260520 - Tzuhan) [REFACTOR] 資料驅動樹狀溯源，完全淘汰 Regex 與魔術字串
    const isRevenue = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.INCOME_ROOT,
      TW_ACCOUNTS,
    );
    const isCOGS = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.COST_ROOT,
      TW_ACCOUNTS,
    );
    const isOpex = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.EXPENSE_ROOT,
      TW_ACCOUNTS,
    );
    const isTax = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.TAX_EXPENSE_ROOT,
      TW_ACCOUNTS,
    );
    const isNonOp =
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.NON_OP_INCOME_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.OTHER_COMPREHENSIVE_INCOME_ROOT,
        TW_ACCOUNTS,
      );

    // 如果都不屬於上述任何損益類別，就直接 return
    if (!isRevenue && !isCOGS && !isOpex && !isTax && !isNonOp) return;

    // Info: (20260520 - Tzuhan) [REFACTOR] 使用 SystemAccountNodes 錨點取代寫死的 751/705
    if (
      isNonOp &&
      (AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.INTEREST_EXPENSE_ROOT,
        TW_ACCOUNTS,
      ) ||
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.INTEREST_EXPENSE_ROOT_ALT,
          TW_ACCOUNTS,
        ))
    ) {
      // Info: (20260330 - Julian) 利息是費用，借方增加 => 借方為正
      const impact = isDebit
        ? MoneyUtil.toDecimal(amount)
        : MoneyUtil.toDecimal(amount).negated();
      interestExpense = interestExpense.plus(impact);
    }

    if (isTax) {
      // Info: (20260330 - Julian) 費用: 借方增加
      const impact = isDebit
        ? MoneyUtil.toDecimal(amount)
        : MoneyUtil.toDecimal(amount).negated();
      const currentAmount = taxMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      taxMap.set(code, { name, amount: currentAmount.plus(impact) });
    } else if (isRevenue) {
      // Info: (20260330 - Julian) 收入: 貸方增加
      const impact = isDebit
        ? MoneyUtil.toDecimal(amount).negated()
        : MoneyUtil.toDecimal(amount);
      const currentAmount =
        revenueMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      revenueMap.set(code, { name, amount: currentAmount.plus(impact) });
    } else if (isCOGS) {
      // Info: (20260330 - Julian) 成本: 借方增加
      const impact = isDebit
        ? MoneyUtil.toDecimal(amount)
        : MoneyUtil.toDecimal(amount).negated();
      const currentAmount = cogsMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      cogsMap.set(code, { name, amount: currentAmount.plus(impact) });
    } else if (isOpex) {
      // Info: (20260330 - Julian) 費用: 借方增加
      const impact = isDebit
        ? MoneyUtil.toDecimal(amount)
        : MoneyUtil.toDecimal(amount).negated();
      const currentAmount = opexMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      opexMap.set(code, { name, amount: currentAmount.plus(impact) });
    } else if (isNonOp) {
      // Info: (20260330 - Julian) 營業外: 貸方為收益(正數), 借方為費損(負數)
      const impact = isDebit
        ? MoneyUtil.toDecimal(amount).negated()
        : MoneyUtil.toDecimal(amount);
      const currentAmount =
        nonOpMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      nonOpMap.set(code, { name, amount: currentAmount.plus(impact) });
    } else {
      // Info: (20260518 - Tzuhan) [AUDIT FIX] 攔截 9 (其他綜合損益) 或任何未知 4~9 科目
      // 杜絕靜默遺失導致與資產負債表 (BS) 結轉的本期損益無法勾稽
      throw new Error(
        `[Data Integrity Violation] 損益表遇到無法歸類的代碼，可能是尚未支援的其他綜合損益科目 (Code: ${code}, Line ID: ${line.id})`,
      );
    }
  });

  // Info: (20260330 - Julian) 計算總收入
  const totalRevenue = Array.from(revenueMap.values()).reduce(
    (acc, curr) => acc.plus(curr.amount),
    MoneyUtil.toDecimal(0),
  );

  // Info: (20260330 - Julian) 轉換 Map 為 IIncomeStatementItem[]
  const mapToArray = (
    map: Map<string, { name: string; amount: Decimal }>,
    baseTotal: Decimal,
  ): IIncomeStatementItem[] => {
    return Array.from(map.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        amount: data.amount.toString(),
        percentageOfRevenue: !baseTotal.isZero()
          ? data.amount.abs().dividedBy(baseTotal).times(100).toString()
          : "0",
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  };

  // Info: (20260330 - Julian) 整理各項數據
  const revenueItems = mapToArray(revenueMap, totalRevenue);
  const cogsItems = mapToArray(cogsMap, totalRevenue);
  const opexItems = mapToArray(opexMap, totalRevenue);
  const nonOpItems = mapToArray(nonOpMap, totalRevenue);
  const taxItems = mapToArray(taxMap, totalRevenue);

  const totalCOGS = cogsItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  const totalOpex = opexItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );

  // Info: (20260330 - Julian) 非營業項目：正數為「淨收入」，負數為「淨費損」，所以在計算「稅前淨利」時要用加的
  const totalNonOp = nonOpItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  const totalTax = taxItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );

  // Info: (20260330 - Julian) 計算各項總計
  const grossProfit = totalRevenue.minus(totalCOGS);
  const operatingIncome = grossProfit.minus(totalOpex);
  const incomeBeforeTax = operatingIncome.plus(totalNonOp);
  const netIncome = incomeBeforeTax.minus(totalTax);

  // Info: (20260330 - Julian) 計算 EBITDA
  const ebitda = operatingIncome.plus(depreciationAndAmortization);

  // Info: (20260330 - Julian) 計算財務比率
  const metrics = {
    grossMargin: MoneyUtil.safeRatio(grossProfit, totalRevenue),
    operatingMargin: MoneyUtil.safeRatio(operatingIncome, totalRevenue),
    netProfitMargin: MoneyUtil.safeRatio(netIncome, totalRevenue),
    ebitda: ebitda.toString(),
    ebitdaMargin: MoneyUtil.safeRatio(ebitda, totalRevenue),
    operatingExpenseRatio: MoneyUtil.safeRatio(totalOpex, totalRevenue),
    nonOperatingIncomeRatio: MoneyUtil.safeRatio(totalNonOp, totalRevenue),
    interestCoverageRatio: interestExpense.isZero()
      ? null
      : operatingIncome.dividedBy(interestExpense).toString(),
    // Info: (20260518 - Tzuhan) [AUDIT FIX] EPS 為跨表指標 (需 BS 總股本)，已交由 CrossReportMetrics 計算
    eps: null,
    taxRate: MoneyUtil.safeRatio(totalTax, incomeBeforeTax),
  };

  return {
    sections: {
      revenue: { items: revenueItems, total: totalRevenue.toString() },
      cogs: { items: cogsItems, total: totalCOGS.toString() },
      grossProfit: { total: grossProfit.toString() },
      operatingExpenses: { items: opexItems, total: totalOpex.toString() },
      operatingIncome: { total: operatingIncome.toString() },
      nonOperating: { items: nonOpItems, total: totalNonOp.toString() },
      incomeBeforeTax: { total: incomeBeforeTax.toString() },
      taxExpense: { items: taxItems, total: totalTax.toString() },
      netIncome: { total: netIncome.toString() },
    },
    metrics,
  };
}
