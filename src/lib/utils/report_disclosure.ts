// Info: (20260801 - Luphia) 報告對自身數值的揭露(純函數)。
//
// Info: (20260801 - Luphia) 為什麼一份報告需要對自己勾稽:本報告頁尾印出計算公式
// Info: (20260801 - Luphia) (`Leg CO2e = Distance × (Weight / 1000) × Factor`),等於邀請查核者逐列重算。
// Info: (20260801 - Luphia) 而逐段數值四捨五入至小數 2 位顯示,總計卻取自上游未捨入的 total_co2eKg ——
// Info: (20260801 - Luphia) 兩者本來就可能差幾分錢。實測 R01(台北→曼徹斯特)逐列相加 5,880.96
// Info: (20260801 - Luphia) 對上總計 5,880.97 差 0.01;R02(東京→巴黎)恰好對上。
// Info: (20260801 - Luphia) 也就是「查核者會不會發現對不上」取決於運氣,而報告完全沒有揭露這件事。
//
// Info: (20260801 - Luphia) 對審計文件而言「加總對不上」是必被提問的一項。做法是揭露而非改數字:
// Info: (20260801 - Luphia) 把總計改成逐列的和會讓 PDF 與 CSV、與資料庫出現三套數字,
// Info: (20260801 - Luphia) 那正是 logistics_report_html 開頭警告的「避免 CSV 與 PDF 各說各話」。

/**
 * Info: (20260801 - Luphia) 顯示用的小數位數。與 formatNumber 的 maximumFractionDigits 必須一致 ——
 * 容差是由它推導的,兩處不同步會讓容差算錯。
 */
export const REPORT_DISPLAY_DECIMALS = 2;

/**
 * Info: (20260801 - Luphia) 單一數值因四捨五入至 REPORT_DISPLAY_DECIMALS 位可能產生的最大偏差。
 * 2 位小數 → 0.005。
 */
const MAX_ROUNDING_ERROR = 0.5 * 10 ** -REPORT_DISPLAY_DECIMALS;

export enum ReconciliationVerdictEnum {
  /** Info: (20260801 - Luphia) 逐列相加與總計完全一致(顯示位數下) */
  EXACT = "EXACT",
  /** Info: (20260801 - Luphia) 有差異,但完全落在四捨五入可解釋的範圍內 */
  WITHIN_ROUNDING = "WITHIN_ROUNDING",
  /**
   * Info: (20260801 - Luphia) 差異超出四捨五入可解釋的範圍 —— 這不是顯示問題,
   * 代表逐段與總計這兩套推導真的不一致。逐段來自 buildPlanLegs,總計來自上游的
   * total_co2eKg,兩者各自獨立,確實有可能分歧。
   */
  DIVERGENT = "DIVERGENT",
  /** Info: (20260801 - Luphia) 缺值,無法勾稽(例如上游未提供總計) */
  INDETERMINATE = "INDETERMINATE",
}

export interface IReconciliation {
  verdict: ReconciliationVerdictEnum;
  /** Info: (20260801 - Luphia) 顯示值逐列相加的結果 */
  displayedSum: number;
  /** Info: (20260801 - Luphia) 報告印出的總計 */
  displayedTotal: number;
  /** Info: (20260801 - Luphia) 兩者之差(總計 − 逐列和) */
  difference: number;
  /** Info: (20260801 - Luphia) 純四捨五入可解釋的最大差異 */
  tolerance: number;
}

/**
 * Info: (20260801 - Luphia) 把字串或數字轉為顯示值(四捨五入至顯示位數)。
 * 回 null 表示無法解析 —— 不以 0 充數,那會讓一個缺值看起來像一筆零排放。
 */
function toDisplayValue(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const factor = 10 ** REPORT_DISPLAY_DECIMALS;
  return Math.round(parsed * factor) / factor;
}

/**
 * Info: (20260801 - Luphia) 勾稽逐段排放與方案總計。
 *
 * 容差取 (段數 + 1) × 0.005:每段各自四捨五入最多偏 0.005,總計自身的顯示也偏最多 0.005。
 * 超出此界就不是四捨五入能解釋的,而是兩套推導真的分歧 —— 那是資料問題不是排版問題。
 *
 * **刻意不 throw。** 上游總計與逐段和分歧有可能是合理的(例如總計含逐段未涵蓋的項目),
 * 我沒有證據證明它一定是錯的;而先前的字形偵測已經示範過「一個判斷過嚴的護欄
 * 會在根本問題修好之後才開始擋人」。此處回報判定,由呼叫端決定揭露方式。
 */
export function reconcileLegTotals(
  legCo2eValues: (string | number | undefined)[],
  planTotalCo2e: string | number | undefined,
): IReconciliation {
  const tolerance = (legCo2eValues.length + 1) * MAX_ROUNDING_ERROR;
  const displayedTotal = toDisplayValue(planTotalCo2e);
  const legValues = legCo2eValues.map(toDisplayValue);

  if (displayedTotal === null || legValues.some((value) => value === null)) {
    return {
      verdict: ReconciliationVerdictEnum.INDETERMINATE,
      displayedSum: 0,
      displayedTotal: displayedTotal ?? 0,
      difference: 0,
      tolerance,
    };
  }

  const factor = 10 ** REPORT_DISPLAY_DECIMALS;
  // Info: (20260801 - Luphia) 以整數分位相加再還原,避免浮點累加自己引入誤差
  const sumMinor = (legValues as number[]).reduce(
    (accumulator, value) => accumulator + Math.round(value * factor),
    0,
  );
  const displayedSum = sumMinor / factor;
  const difference =
    Math.round((displayedTotal - displayedSum) * factor) / factor;

  const verdict =
    difference === 0
      ? ReconciliationVerdictEnum.EXACT
      : Math.abs(difference) <= tolerance
        ? ReconciliationVerdictEnum.WITHIN_ROUNDING
        : ReconciliationVerdictEnum.DIVERGENT;

  return { verdict, displayedSum, displayedTotal, difference, tolerance };
}
