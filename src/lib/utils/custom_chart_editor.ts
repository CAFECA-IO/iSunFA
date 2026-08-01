import {
  CustomChartType,
  CustomChartActionType,
  CustomChartConfigKey,
} from "@/constants/custom_chart";
import {
  ICustomChartAction,
  IMatrixAction,
  ITornadoAction,
  IHistogramAction,
} from "@/interfaces/custom_chart";
import {
  applyMatrixAction,
  applyMatrixActions,
} from "@/lib/utils/custom_matrix_editor";
import {
  applyTornadoAction,
  applyTornadoActions,
} from "@/lib/utils/custom_tornado_editor";
import {
  applyHistogramAction,
  applyHistogramActions,
} from "@/lib/utils/custom_histogram_editor";

/**
 * Info: (20260721 - Julian)
 * 自訂圖表結構化編輯的分派器：依圖表類型將動作交給對應的 apply 引擎。
 * 目前矩陣圖與龍捲風圖具備常用工具；其餘類型尚無工具，原樣返回（Fail Safe）。
 * 與 mermaid 的 applyChartAction 對應，供通用 AI 編輯器的 adapter 使用。
 * 註：動作型別為聯集，型別由 chartType 對應（adapter 依 chartType 建立，兩者恆一致），故此處以 chartType 分派。
 */
/**
 * Info: (20260723 - Julian)
 * 設定「標題」設定列（跨類型共用）：upsert `title: value`；空字串則移除該列。
 * 標題為設定列，不影響資料列的 lineIndex，但插入新列會位移後續行號，
 * 故批次套用時務必於資料類動作之後才處理標題（見 applyCustomChartActions）。
 */
const applyCustomTitle = (chart: string, title: string): string => {
  const lines = chart.split("\n");
  const idx = lines.findIndex((line) => {
    const clean = line.trim();
    const colonIdx = clean.indexOf(":");
    return (
      colonIdx !== -1 &&
      clean.slice(0, colonIdx).trim().toLowerCase() ===
        CustomChartConfigKey.TITLE
    );
  });
  const trimmed = title.trim();
  if (trimmed === "") {
    if (idx !== -1) lines.splice(idx, 1);
    return lines.join("\n");
  }
  const newLine = `${CustomChartConfigKey.TITLE}: ${trimmed}`;
  if (idx !== -1) {
    lines[idx] = newLine;
    return lines.join("\n");
  }
  lines.unshift(newLine);
  return lines.join("\n");
};

export const applyCustomChartAction = (
  type: CustomChartType,
  chart: string,
  action: ICustomChartAction,
): string => {
  // Info: (20260723 - Julian) 標題為跨類型共用動作，優先處理
  if (action.type === CustomChartActionType.SET_TITLE) {
    return applyCustomTitle(chart, action.payload.title);
  }
  switch (type) {
    case CustomChartType.MATRIX:
      return applyMatrixAction(chart, action as IMatrixAction);
    case CustomChartType.TORNADO:
      return applyTornadoAction(chart, action as ITornadoAction);
    case CustomChartType.HISTOGRAM:
      return applyHistogramAction(chart, action as IHistogramAction);
    default:
      // Info: (20260721 - Julian) 其餘類型尚未實作工具，無結構化動作可套用
      return chart;
  }
};

/**
 * Info: (20260728 - Julian)
 * 批次版分派器：依圖表類型將「一整批」動作交給對應的 apply 引擎，回傳新字串（不變更輸入）。
 * 動作的 lineIndex 皆以「原始 chart」行號為準（工具面板以原始 chart 解析選單），故：
 * 矩陣圖、龍捲風圖、直方圖皆採 tombstone 穩定索引策略：動作 lineIndex 以「原始 chart」為準，
 * 套用期間不位移原始行，避免「先刪後編」打錯資料列。其餘類型尚無工具，原樣返回（Fail Safe）。
 */
export const applyCustomChartActions = (
  type: CustomChartType,
  chart: string,
  actions: readonly ICustomChartAction[],
): string => {
  // Info: (20260723 - Julian) 標題動作抽出、最後才套用：避免插入 title 列位移資料列 lineIndex
  const titleActions = actions.filter(
    (a) => a.type === CustomChartActionType.SET_TITLE,
  );
  const dataActions = actions.filter(
    (a) => a.type !== CustomChartActionType.SET_TITLE,
  );

  let result = chart;
  switch (type) {
    case CustomChartType.MATRIX:
      result = applyMatrixActions(
        chart,
        dataActions as readonly IMatrixAction[],
      );
      break;
    case CustomChartType.TORNADO:
      result = applyTornadoActions(
        chart,
        dataActions as readonly ITornadoAction[],
      );
      break;
    case CustomChartType.HISTOGRAM:
      result = applyHistogramActions(
        chart,
        dataActions as readonly IHistogramAction[],
      );
      break;
    default:
      result = chart;
  }

  // Info: (20260723 - Julian) 標題於資料類動作之後套用（多筆則最後一筆生效）
  for (const action of titleActions) {
    if (action.type === CustomChartActionType.SET_TITLE) {
      result = applyCustomTitle(result, action.payload.title);
    }
  }
  return result;
};
