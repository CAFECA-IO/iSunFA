import { CustomChartType } from "@/constants/custom_chart";
import {
  ICustomChartAction,
  IMatrixAction,
  ITornadoAction,
} from "@/interfaces/custom_chart";
import {
  applyMatrixAction,
  applyMatrixActions,
} from "@/lib/utils/custom_matrix_editor";
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

/**
 * Info: (20260728 - Julian)
 * 批次版分派器：依圖表類型將「一整批」動作交給對應的 apply 引擎，回傳新字串（不變更輸入）。
 * 動作的 lineIndex 皆以「原始 chart」行號為準（工具面板以原始 chart 解析選單），故：
 * - 矩陣圖走 applyMatrixActions 的 tombstone 穩定索引策略，避免「先刪後編」的行號位移打錯資料列。
 * - 龍捲風圖尚無批次引擎，暫以 reduce 逐一套用（其 apply 已為 Fail Safe）。
 * 其餘類型尚無工具，原樣返回（Fail Safe）。
 */
// ToDo: (20260728 - Julian) 龍捲風圖缺批次引擎，stacked-actions 仍有行號位移風險；補 applyTornadoActions 後改走批次
export const applyCustomChartActions = (
  type: CustomChartType,
  chart: string,
  actions: readonly ICustomChartAction[],
): string => {
  switch (type) {
    case CustomChartType.MATRIX:
      return applyMatrixActions(chart, actions as readonly IMatrixAction[]);
    case CustomChartType.TORNADO:
      return actions.reduce(
        (result, action) =>
          applyTornadoAction(result, action as ITornadoAction),
        chart,
      );
    default:
      return chart;
  }
};
