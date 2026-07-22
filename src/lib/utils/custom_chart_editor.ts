import { CustomChartType } from "@/constants/custom_chart";
import { IMatrixAction } from "@/interfaces/custom_chart";
import { applyMatrixAction } from "@/lib/utils/custom_matrix_editor";

/**
 * Info: (20260721 - Julian)
 * 自訂圖表結構化編輯的分派器：依圖表類型將動作交給對應的 apply 引擎。
 * 目前僅矩陣圖（custom-matrix）具備常用工具；其餘類型尚無工具，原樣返回（Fail Safe）。
 * 與 mermaid 的 applyChartAction 對應，供通用 AI 編輯器的 adapter 使用。
 */
export const applyCustomChartAction = (
  type: CustomChartType,
  chart: string,
  action: IMatrixAction,
): string => {
  switch (type) {
    case CustomChartType.MATRIX:
      return applyMatrixAction(chart, action);
    default:
      // Info: (20260721 - Julian) 其餘類型尚未實作工具，無結構化動作可套用
      return chart;
  }
};
