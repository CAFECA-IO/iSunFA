import mermaid from "mermaid";
import {
  detectChartType,
  aliasNonAsciiSankeyNodes,
  restoreSankeyLabels,
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
export const renderMermaid = async (
  id: string,
  chartStr: string,
): Promise<{ svg: string }> => {
  if (detectChartType(chartStr) === MermaidChartType.SANKEY) {
    const { chart, aliases } = aliasNonAsciiSankeyNodes(chartStr);
    if (aliases.length > 0) {
      const { svg } = await mermaid.render(id, chart);
      return { svg: restoreSankeyLabels(svg, aliases) };
    }
  }

  const { svg } = await mermaid.render(id, chartStr);
  return { svg };
};
