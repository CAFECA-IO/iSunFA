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
    const code = line.accountingCode || line.accounting?.code;
    if (!code || line.isDebit === null) return;

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
          depreciationAndAmortization += amount;
        }
      }
    }

    // Info: (20260330 - Julian) 只處理損益表科目（4 ~ 9 開頭）來做後續分類
    if (!code.match(/^[456789]/)) return;

    const isRevenue = code.startsWith("4");
    const isCOGS = code.startsWith("5");
    const isOpex = code.startsWith("6");
    const isTax = code.startsWith("79");
    // Info: (20260504 - Tzuhan) ⚠️修復邏輯短路：真正的非營業收支是 7 與 8，移除 9 (9 為其他綜合損益 OCI)
    const isNonOp = code.startsWith("7") || code.startsWith("8");

    // Info: (20260504 - Tzuhan) ⚠️修復：不再用中文「利息費用」判斷，改以標準代碼 (7510 利息費用, 7050 財務成本)
    if (isNonOp && (code.startsWith("751") || code.startsWith("705"))) {
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
    interestCoverageRatio: safeDivide(operatingIncome, interestExpense, null),
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
