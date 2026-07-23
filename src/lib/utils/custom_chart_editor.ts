import { CustomChartType } from "@/constants/custom_chart";
import {
  ICustomChartAction,
  IMatrixAction,
  ITornadoAction,
} from "@/interfaces/custom_chart";
import { applyMatrixAction } from "@/lib/utils/custom_matrix_editor";
import { applyTornadoAction } from "@/lib/utils/custom_tornado_editor";

/**
 * Info: (20260721 - Julian)
 * 自訂圖表結構化編輯的分派器：依圖表類型將動作交給對應的 apply 引擎。
 * 目前矩陣圖與龍捲風圖具備常用工具；其餘類型尚無工具，原樣返回（Fail Safe）。
 * 與 mermaid 的 applyChartAction 對應，供通用 AI 編輯器的 adapter 使用。
 * 註：動作型別為聯集，型別由 chartType 對應（adapter 依 chartType 建立，兩者恆一致），故此處以 chartType 分派。
 */
export const applyCustomChartAction = (
  type: CustomChartType,
  chart: string,
  action: ICustomChartAction,
): string => {
  switch (type) {
    case CustomChartType.MATRIX:
      return applyMatrixAction(chart, action as IMatrixAction);
    case CustomChartType.TORNADO:
      return applyTornadoAction(chart, action as ITornadoAction);
    default:
      // Info: (20260721 - Julian) 其餘類型尚未實作工具，無結構化動作可套用
      return chart;
  }
};
