import { IVoucherLineUI } from "@/interfaces/voucher";
import {
  IIncomeStatement,
  IIncomeStatementItem,
} from "@/interfaces/income_statement";
import { safeDivide } from "@/lib/utils/math";

export function generateIncomeStatement(
  lineItems: IVoucherLineUI[],
): IIncomeStatement {
  // Info: (20260331 - Julian) 建立會計科目分類的 Map
  const revenueMap = new Map<string, { name: string; amount: number }>();
  const cogsMap = new Map<string, { name: string; amount: number }>();
  const opexMap = new Map<string, { name: string; amount: number }>();
  const nonOpMap = new Map<string, { name: string; amount: number }>();
  const taxMap = new Map<string, { name: string; amount: number }>();

  // Info: (20260331 - Julian) 用於 EBITDA 和利息保障倍數計算的變數
  let depreciationAndAmortization = 0;
  let interestExpense = 0;

  lineItems.forEach((line) => {
    // Info: (20260330 - Julian) 確保有會計科目且借貸方有值
    if (!line.accounting || line.isDebit === null) return;

    // Info: (20260331 - Julian) 解構
    const {
      accounting: { code, name },
      isDebit,
      amount,
    } = line;

    // Info: (20260330 - Julian) 只處理損益表科目（4 ~ 9 開頭）
    if (!code.match(/^[456789]/)) return;

    const isRevenue = code.startsWith("4");
    const isCOGS = code.startsWith("5");
    const isOpex = code.startsWith("6");
    const isTax =
      code.startsWith("8") || code.startsWith("9") || name.includes("所得稅");
    // Info: (20260330 - Julian) 「非營業收支」通常是 7 開頭；若 8 或 9 不是所得稅，也可能歸為「非營業」
    const isNonOp =
      code.startsWith("7") ||
      (!isTax && (code.startsWith("8") || code.startsWith("9")));

    // Info: (20260330 - Julian) 提取「折舊」與「攤銷」用於 EBITDA 計算
    if (
      (isCOGS || isOpex || isNonOp) &&
      (name.includes("折舊") || name.includes("攤銷"))
    ) {
      // Info: (20260330 - Julian) 折舊/攤銷是費用，借方增加 => 借方為正
      depreciationAndAmortization += isDebit ? amount : -amount;
    }

    // Info: (20260330 - Julian) 提取「利息費用」用於「利息保障倍數」計算
    if (isNonOp && name.includes("利息費用")) {
      // Info: (20260330 - Julian) 利息是費用，借方增加 => 借方為正
      interestExpense += isDebit ? amount : -amount;
    }

    if (isTax && !isNonOp) {
      // Info: (20260330 - Julian) 費用: 借方增加
      const impact = isDebit ? amount : -amount;
      const currentAmount = taxMap.get(code)?.amount || 0;
      taxMap.set(code, { name, amount: currentAmount + impact });
    } else if (isRevenue) {
      // Info: (20260330 - Julian) 收入: 貸方增加
      const impact = isDebit ? -amount : amount;
      const currentAmount = revenueMap.get(code)?.amount || 0;
      revenueMap.set(code, { name, amount: currentAmount + impact });
    } else if (isCOGS) {
      // Info: (20260330 - Julian) 成本: 借方增加
      const impact = isDebit ? amount : -amount;
      const currentAmount = cogsMap.get(code)?.amount || 0;
      cogsMap.set(code, { name, amount: currentAmount + impact });
    } else if (isOpex) {
      // Info: (20260330 - Julian) 費用: 借方增加
      const impact = isDebit ? amount : -amount;
      const currentAmount = opexMap.get(code)?.amount || 0;
      opexMap.set(code, { name, amount: currentAmount + impact });
    } else if (isNonOp) {
      // Info: (20260330 - Julian) 營業外: 貸方為收益(正數), 借方為費損(負數)
      // TODO: 在 UI 呈現時，可以加總後看是正數淨收入還是負數淨費損
      const impact = isDebit ? -amount : amount;
      const currentAmount = nonOpMap.get(code)?.amount || 0;
      nonOpMap.set(code, { name, amount: currentAmount + impact });
    }
  });

  // Info: (20260330 - Julian) 計算總收入
  const totalRevenue = Array.from(revenueMap.values()).reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );

  // Info: (20260330 - Julian) 轉換 Map 為 IIncomeStatementItem[]
  const mapToArray = (
    map: Map<string, { name: string; amount: number }>,
    baseTotal: number,
  ): IIncomeStatementItem[] => {
    return Array.from(map.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        amount: data.amount,
        percentageOfRevenue:
          baseTotal !== 0 ? (Math.abs(data.amount) / baseTotal) * 100 : 0,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  };

  // Info: (20260330 - Julian) 整理各項數據
  const revenueItems = mapToArray(revenueMap, totalRevenue);
  const cogsItems = mapToArray(cogsMap, totalRevenue);
  const opexItems = mapToArray(opexMap, totalRevenue);
  const nonOpItems = mapToArray(nonOpMap, totalRevenue);
  const taxItems = mapToArray(taxMap, totalRevenue);

  const totalCOGS = cogsItems.reduce((acc, curr) => acc + curr.amount, 0);
  const totalOpex = opexItems.reduce((acc, curr) => acc + curr.amount, 0);

  // Info: (20260330 - Julian) 非營業項目：正數為「淨收入」，負數為「淨費損」，所以在計算「稅前淨利」時要用加的
  const totalNonOp = nonOpItems.reduce((acc, curr) => acc + curr.amount, 0);
  const totalTax = taxItems.reduce((acc, curr) => acc + curr.amount, 0);

  // Info: (20260330 - Julian) 計算各項總計
  const grossProfit = totalRevenue - totalCOGS;
  const operatingIncome = grossProfit - totalOpex;
  const incomeBeforeTax = operatingIncome + totalNonOp;
  const netIncome = incomeBeforeTax - totalTax;

  // Info: (20260330 - Julian) 計算 EBITDA
  const ebitda = operatingIncome + depreciationAndAmortization;

  // Info: (20260330 - Julian) 計算財務比率
  const metrics = {
    grossMargin: safeDivide(grossProfit, totalRevenue) * 100,
    operatingMargin: safeDivide(operatingIncome, totalRevenue) * 100,
    netProfitMargin: safeDivide(netIncome, totalRevenue) * 100,
    ebitda,
    ebitdaMargin: safeDivide(ebitda, totalRevenue) * 100,
    operatingExpenseRatio: safeDivide(totalOpex, totalRevenue) * 100,
    nonOperatingIncomeRatio: safeDivide(totalNonOp, totalRevenue) * 100,
    interestCoverageRatio: safeDivide(operatingIncome, interestExpense),
    eps: 0, // TODO: (20260330 - Julian) 外部資料，目前預設為 0
    taxRate: safeDivide(totalTax, incomeBeforeTax) * 100,
  };

  return {
    sections: {
      revenue: { items: revenueItems, total: totalRevenue },
      cogs: { items: cogsItems, total: totalCOGS },
      grossProfit: { total: grossProfit },
      operatingExpenses: { items: opexItems, total: totalOpex },
      operatingIncome: { total: operatingIncome },
      nonOperating: { items: nonOpItems, total: totalNonOp },
      incomeBeforeTax: { total: incomeBeforeTax },
      taxExpense: { items: taxItems, total: totalTax },
      netIncome: { total: netIncome },
    },
    metrics,
  };
}
