// Info: (20260518 - Tzuhan) 建立跨報表指標計算核心，徹底解耦單一報表引擎
import { IBalanceSheet } from "@/interfaces/balance_sheet";
import { ICashFlowStatement } from "@/interfaces/cash_flow_statement";
import { IIncomeStatement } from "@/interfaces/income_statement";
import { MoneyUtil } from "@/lib/utils/money";


export interface ICrossReportMetrics {
  operatingCashFlowRatio: string | null; // Info: (20260518 - Tzuhan) 營業現金流量比率
  cashFlowAdequacyRatio: string | null; // Info: (20260518 - Tzuhan) 現金流量允當比率
  cashReinvestmentRatio: string | null; // Info: (20260518 - Tzuhan) 現金再投資比率
  eps: string | null; // Info: (20260518 - Tzuhan) 新增精確版 EPS
}

/**
 * Info: (20260518 - Tzuhan)
 * CPA 認證級別 - 跨報表高級財務指標計算引擎
 * @param balanceSheet 已結算完成之資產負債表
 * @param cashFlow 已結算完成之現金流量表
 * @param incomeStatement 已結算完成之綜合損益表
 */
export function calculateCrossReportMetrics(
  balanceSheet: IBalanceSheet,
  cashFlow: ICashFlowStatement,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _incomeStatement: IIncomeStatement,
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

  // Info: (20260518 - Tzuhan) 4. 每股盈餘 (EPS) = 本期稅後淨利 (IS) / 期末流通在外股數 (BS)
  // Info: (20260518 - Tzuhan) [CPA 正確定義] 徹底解決了 IS 單表引擎只能拿到「當期增資股數」導致 EPS 永遠為 0 的荒謬錯誤

  // Info: (20260525 - Tzuhan) [IAS 33 FIX] 阻斷直接使用期末股數相除的謬誤
  // ToDo: (20260527 - Tzuhan) 這裡原本的實作只是單純拿「期末股本」除以「面額」得到期末股數。
  // 但根據 IAS 33 財報準則，EPS 必須使用「流通在外加權平均股數 (WACSO)」作為分母。
  // 如果公司在年底才辦理現金增資，直接拿期末總股數去當分母，會導致全年的 EPS 被嚴重低估（人為稀釋）。
  // 因此在我們實作「根據增資日期進行天數加權平均」的演算法之前，寧可回傳 null，也絕對不能提供錯誤的指標。
  // 實作提示：未來開發 WACSO 時，撈取「股本餘額」可利用 `AccountUtil.isDescendantOf(item.code, SystemAccountNodes.COMMON_STOCK_ROOT, TW_ACCOUNTS)` 進行樹狀溯源，而「面額」則取自 `balanceSheet.metrics.parValue`。
  const eps = null;

  return {
    operatingCashFlowRatio,
    cashFlowAdequacyRatio,
    cashReinvestmentRatio,
    eps,
  };
}
