import { IVoucherLineUI } from "@/interfaces/voucher";
import {
  IIncomeStatement,
  IIncomeStatementItem,
} from "@/interfaces/income_statement";
import { MoneyUtil } from "@/lib/utils/money";
import { Decimal } from "decimal.js";

export function generateIncomeStatement(
  lineItems: IVoucherLineUI[],
  parValue: number = 10,
): IIncomeStatement {
  // Info: (20260331 - Julian) 建立會計科目分類的 Map
  const revenueMap = new Map<string, { name: string; amount: Decimal }>();
  const cogsMap = new Map<string, { name: string; amount: Decimal }>();
  const opexMap = new Map<string, { name: string; amount: Decimal }>();
  const nonOpMap = new Map<string, { name: string; amount: Decimal }>();
  const taxMap = new Map<string, { name: string; amount: Decimal }>();

  // Info: (20260331 - Julian) 用於 EBITDA 和利息保障倍數計算的變數
  let depreciationAndAmortization = MoneyUtil.toDecimal(0);
  let interestExpense = MoneyUtil.toDecimal(0);

  // Info: (20260512 - Tzuhan) 計算股本總額以計算 EPS
  let commonStockCapitalTotal = MoneyUtil.toDecimal(0);

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

    // Info: (20260504 - Tzuhan) ⚠️修復：改由備抵資產 (Contra-Asset) 的變動來精準捕捉折舊攤銷，完全捨棄中文關鍵字比對
    if (
      code.startsWith("15") ||
      code.startsWith("16") ||
      code.startsWith("17") ||
      code.startsWith("18") ||
      code.startsWith("19")
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

    // Info: (20260512 - Tzuhan) 擷取股本科目(31開頭)計算在外流通股數
    if (code.startsWith("31")) {
      const amountDec = MoneyUtil.toDecimal(amount);
      const impact = isDebit ? amountDec : amountDec.negated();
      commonStockCapitalTotal = commonStockCapitalTotal.minus(impact);
    }

    // Info: (20260330 - Julian) 只處理損益表科目（4 ~ 9 開頭）來做後續分類
    if (!code.match(/^[456789]/)) return;

    // Info: (20260518 - Tzuhan) [AUDIT FIX] 修正邏輯短路悖論，將 79 與其他 7 開頭徹底互斥
    const isRevenue = code.startsWith("4");
    const isCOGS = code.startsWith("5");
    const isOpex = code.startsWith("6");
    const isTax = code.startsWith("79");
    // Info: (20260518 - Tzuhan) [AUDIT FIX] 必須排除 isTax，否則 79 會讓 isNonOp 變成 true
    const isNonOp = (code.startsWith("7") && !isTax) || code.startsWith("8");

    // Info: (20260504 - Tzuhan) ⚠️修復：不再用中文「利息費用」判斷，改以標準代碼 (7510 利息費用, 7050 財務成本)
    if (isNonOp && (code.startsWith("751") || code.startsWith("705"))) {
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
          ? data.amount.abs().dividedBy(baseTotal).times(100).toNumber()
          : 0,
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

  // Info: (20260512 - Tzuhan) 結合面額與股本，計算流通在外股數與每股盈餘(EPS)
  // Info: (20260518 - Tzuhan) [AUDIT FIX] 增加對 parValue <= 0 (無面額股) 的防禦，避免 Decimal 拋出 Division by zero
  const outstandingShares =
    parValue > 0
      ? commonStockCapitalTotal.dividedBy(parValue)
      : MoneyUtil.toDecimal(0);

  const eps = outstandingShares.gt(0)
    ? netIncome.dividedBy(outstandingShares).toNumber()
    : 0;

  // Info: (20260330 - Julian) 計算財務比率
  const metrics = {
    grossMargin: MoneyUtil.safeRatio(grossProfit, totalRevenue),
    operatingMargin: MoneyUtil.safeRatio(operatingIncome, totalRevenue),
    netProfitMargin: MoneyUtil.safeRatio(netIncome, totalRevenue),
    ebitda: ebitda.toNumber(),
    ebitdaMargin: MoneyUtil.safeRatio(ebitda, totalRevenue),
    operatingExpenseRatio: MoneyUtil.safeRatio(totalOpex, totalRevenue),
    nonOperatingIncomeRatio: MoneyUtil.safeRatio(totalNonOp, totalRevenue),
    interestCoverageRatio: interestExpense.isZero()
      ? null
      : operatingIncome.dividedBy(interestExpense).toNumber(),
    eps,
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
