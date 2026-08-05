import mermaid from "mermaid";
import {
  detectChartType,
  aliasNonAsciiSankeyNodes,
  restoreSankeyLabels,
  type ISankeyAlias,
} from "@/lib/utils/mermaid_helpers";
import { MermaidChartType } from "@/constants/mermaid_chart";

/**
 * Info: (20260716 - Julian)
 * 統一的 Mermaid 渲染入口。針對 Sankey 含非 ASCII 標籤（如中文）的情況，
 * 先以 ASCII 佔位渲染以繞過 Mermaid Sankey 只支援 ASCII 的文法限制，
 * 再把 SVG 內的佔位還原成原始名稱。其餘圖表直接交給 mermaid.render。
 * @param id - 給 mermaid.render 的唯一 DOM id
 * @param chartStr - Mermaid 定義字串
 */
export const prepareMermaid = (
  chartStr: string,
): { chart: string; aliases: ISankeyAlias[] } => {
  if (detectChartType(chartStr) === MermaidChartType.SANKEY) {
    return aliasNonAsciiSankeyNodes(chartStr);
  }
  return { chart: chartStr, aliases: [] };
};

export const renderMermaid = async (
  id: string,
  chartStr: string,
): Promise<{ svg: string }> => {
  const { chart, aliases } = prepareMermaid(chartStr);
  const { svg } = await mermaid.render(id, chart);
  return aliases.length > 0
    ? { svg: restoreSankeyLabels(svg, aliases) }
    : { svg };
};

/**
 * Info: (20260803 - Tzuhan) 語法驗證。**必須驗「真正要渲染的那個字串」**。
 *
 * 實測:含中文節點的 sankey 一律顯示「Mermaid Syntax Error」。原因是元件在渲染前
 * 以原始字串 mermaid.parse 驗證,而繞過 Sankey 只支援 ASCII 的別名替換發生在 renderMermaid 裡 ——
 * 驗證先失敗就 return,永遠走不到有別名的那條路。
 *
 * 也就是說:一道後加的驗證把先前的繞道解法擋在門外,而兩者各自看起來都沒問題。
 * 修法不是拿掉驗證,是讓驗證與渲染共用同一個前處理(prepareMermaid)——
 * 驗證與渲染看到不同的輸入,驗證就失去意義。
 */
export const validateMermaid = async (chartStr: string): Promise<boolean> => {
  const { chart } = prepareMermaid(chartStr);
  const result = await mermaid.parse(chart, { suppressErrors: true });
  return Boolean(result);
};
