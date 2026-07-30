"use client";

import { FC, useState } from "react";
import {
  CustomChartType,
  CustomChartActionType,
} from "@/constants/custom_chart";
import {
  ICustomChartAction,
  ICustomTitleAction,
} from "@/interfaces/custom_chart";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";
import { applyCustomChartActions } from "@/lib/utils/custom_chart_editor";
import { CustomChartCanvas } from "@/components/chart/custom_chart_canvas";
import { MatrixToolsSection } from "@/components/chart/matrix_tools_submenu";
import { TornadoToolsSection } from "@/components/chart/tornado_tools_submenu";
import { HistogramToolsSection } from "@/components/chart/histogram_tools_submenu";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IChartEditorAdapter,
  IChartEditorToolsContext,
} from "@/interfaces/ai_chart_editor";

type TFunction = ReturnType<typeof useTranslation>["t"];

// Info: (20260721 - Julian) mock 模擬「思考」耗時（毫秒），純前端計時，不呼叫後端
const MOCK_THINKING_MS = 800;

// Info: (20260730 - Julian) 各類型 i18n 指令範例 key（chart.custom_chart.examples.*）
const EXAMPLE_KEY_BY_TYPE: Record<CustomChartType, string> = {
  [CustomChartType.MATRIX]: "matrix",
  [CustomChartType.TORNADO]: "tornado",
  [CustomChartType.HISTOGRAM]: "histogram",
  [CustomChartType.BOXPLOT]: "boxplot",
};

// Info: (20260730 - Julian) 有常用工具的自訂圖表類型
const TOOL_TYPES = new Set<CustomChartType>([
  CustomChartType.MATRIX,
  CustomChartType.TORNADO,
  CustomChartType.HISTOGRAM,
]);

// Info: (20260730 - Julian) 左半邊常用工具：依自訂圖表類型分派工具區塊
const CustomTools: FC<
  IChartEditorToolsContext<ICustomChartAction> & { chartType: CustomChartType }
> = ({ chartType, chart, onAddAction }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const shared = { selectedTool, setSelectedTool, chart, onAddAction };
  switch (chartType) {
    case CustomChartType.MATRIX:
      return <MatrixToolsSection {...shared} />;
    case CustomChartType.TORNADO:
      return <TornadoToolsSection {...shared} />;
    case CustomChartType.HISTOGRAM:
      return <HistogramToolsSection {...shared} />;
    default:
      return null;
  }
};

interface ICreateCustomEditorAdapterParams {
  chartType: CustomChartType;
  t: TFunction;
}

/**
 * Info: (20260730 - Julian)
 * 自訂圖表的編輯器 adapter（瘦身版）：只提供常用工具、Canvas 渲染與決定論邏輯。
 * 產生流程目前為 mock（模擬思考後回報開發中）。header／分頁／按鈕由通用 modal 擁有。
 */
export const createCustomEditorAdapter = ({
  chartType,
  t,
}: ICreateCustomEditorAdapterParams): IChartEditorAdapter<ICustomChartAction> => ({
  hasTools: TOOL_TYPES.has(chartType),
  examples:
    t<string[]>(
      `chart.custom_chart.examples.${EXAMPLE_KEY_BY_TYPE[chartType]}`,
    ) || [],

  applyActions: (chart, actions) =>
    applyCustomChartActions(chartType, chart, actions),

  getTitle: (chart, pendingActions) => {
    const titleAction = pendingActions.find(
      (a) => a.type === CustomChartActionType.SET_TITLE,
    );
    if (titleAction && titleAction.type === CustomChartActionType.SET_TITLE) {
      return titleAction.payload.title;
    }
    const result = parseCustomChart(chartType, chart);
    return result.ok ? (result.ast.title ?? "") : "";
  },

  buildTitleAction: (title: string): ICustomTitleAction => ({
    id: crypto.randomUUID(),
    type: CustomChartActionType.SET_TITLE,
    description: t("chart.custom_chart.action_set_title", { title }),
    payload: { title },
  }),

  // Info: (20260730 - Julian) mock 產生：模擬思考後拋出開發中訊息（顯示於預覽區）；honor abort signal
  generate: (_baseChart, _instruction, signal) =>
    new Promise<string>((_resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error(t("chart.custom_chart.mock_notice")));
      }, MOCK_THINKING_MS);
      signal.addEventListener("abort", () => {
        window.clearTimeout(timer);
        const abortError = new Error("aborted");
        abortError.name = "AbortError";
        reject(abortError);
      });
    }),

  renderPreview: (chart) => <CustomChartCanvas type={chartType} raw={chart} />,

  Tools: (ctx) => <CustomTools chartType={chartType} {...ctx} />,

  isRenderable: (chart) => parseCustomChart(chartType, chart).ok,
});
