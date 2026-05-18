// Info: (20260518 - Tzuhan) 建立跨報表指標計算核心，徹底解耦單一報表引擎
import { IBalanceSheet } from "@/interfaces/balance_sheet";
import { ICashFlowStatement } from "@/interfaces/cash_flow_statement";
import { MoneyUtil } from "@/lib/utils/money";

export interface ICrossReportMetrics {
  operatingCashFlowRatio: number | null; // Info: (20260518 - Tzuhan) 營業現金流量比率
  cashFlowAdequacyRatio: number | null; // Info: (20260518 - Tzuhan) 現金流量允當比率
  cashReinvestmentRatio: number | null; // Info: (20260518 - Tzuhan) 現金再投資比率
}

/**
 * Info: (20260518 - Tzuhan)
 * CPA 認證級別 - 跨報表高級財務指標計算引擎
 * @param balanceSheet 已結算完成之資產負債表
 * @param cashFlow 已結算完成之現金流量表
 */
export function calculateCrossReportMetrics(
  balanceSheet: IBalanceSheet,
  cashFlow: ICashFlowStatement,
): ICrossReportMetrics {
  // Info: (20260518 - Tzuhan) 1. 營業現金流量比率 = 營業活動現金流量 (CF) / 流動負債期末總額 (BS)
  // Info: (20260518 - Tzuhan) [CPA 正確定義] 解決了舊版拿傳票變動數當分母的重大錯誤
  const operatingCashFlow = MoneyUtil.toDecimal(
    cashFlow.activities.operating.total,
  );
  const endingCurrentLiabilities = MoneyUtil.toDecimal(
    balanceSheet.liabilities.current.total,
  );

  const operatingCashFlowRatio = MoneyUtil.safeRatio(
    operatingCashFlow,
    endingCurrentLiabilities,
  );

  // Info: (20260518 - Tzuhan) 2. 現金流量允當比率 = 近期營業現金流總和 / (資本支出 + 存貨增加額 + 現金股利)
  // Info: (20260518 - Tzuhan) [CPA 正確定義] 拔除了原本瞎湊的 totalFinancing.abs()
  // Info: (20260518 - Tzuhan) 註：在單一年度分析中，我們以當期數值作為基準測試
  const capitalExpenditure = MoneyUtil.toDecimal(
    cashFlow.supplementary?.capitalExpenditure || 0,
  ); // Info: (20260518 - Tzuhan) 需從 CF 補強揭露拉出
  const inventoryChange = MoneyUtil.toDecimal(
    cashFlow.supplementary?.inventoryChange || 0,
  );
  const dividendsPaid = MoneyUtil.toDecimal(
    cashFlow.supplementary?.dividendsPaid || 0,
  );

  const denominatorAdequacy = capitalExpenditure
    .plus(inventoryChange)
    .plus(dividendsPaid);
  const cashFlowAdequacyRatio = MoneyUtil.safeRatio(
    operatingCashFlow,
    denominatorAdequacy,
  );

  // Info: (20260518 - Tzuhan) 3. 現金再投資比率 = (營業現金流 - 現金股利) / (固定資產毛額 + 長期投資 + 其他資產 + 營運資金)
  // Info: (20260518 - Tzuhan) [CPA 正確定義] 徹底終結「百萬虛擬分母造假」，完美連動資產負債表科目
  const fixedAssetsGross = MoneyUtil.toDecimal(
    balanceSheet.metrics.fixedAssetsTotal || 0,
  );
  const longTermInvestments = MoneyUtil.toDecimal(
    balanceSheet.metrics.longTermInvestmentsTotal || 0,
  );
  const otherAssets = MoneyUtil.toDecimal(
    balanceSheet.metrics.otherAssetsTotal || 0,
  );
  const workingCapital = MoneyUtil.toDecimal(
    balanceSheet.metrics.workingCapital || 0,
  );

  const denominatorReinvestment = fixedAssetsGross
    .plus(longTermInvestments)
    .plus(otherAssets)
    .plus(workingCapital);

  const cashReinvestmentRatio = MoneyUtil.safeRatio(
    operatingCashFlow.minus(dividendsPaid),
    denominatorReinvestment,
  );

  return {
    operatingCashFlowRatio,
    cashFlowAdequacyRatio,
    cashReinvestmentRatio,
  };
}
