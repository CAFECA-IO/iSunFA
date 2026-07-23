"use client";

import { CustomChartType } from "@/constants/custom_chart";
import { ICustomChartAction } from "@/interfaces/custom_chart";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";
import { applyCustomChartAction } from "@/lib/utils/custom_chart_editor";
import { CustomEditorControlPanel } from "@/components/chart/custom_editor_control_panel";
import { CustomEditorPreviewPanel } from "@/components/chart/custom_editor_preview_panel";
import { useTranslation } from "@/i18n/i18n_context";
import { IChartEditorAdapter } from "@/interfaces/ai_chart_editor";

type TFunction = ReturnType<typeof useTranslation>["t"];

// Info: (20260721 - Julian) mock 模擬「思考」耗時（毫秒），純前端計時，不呼叫後端
const MOCK_THINKING_MS = 800;

interface ICreateCustomEditorAdapterParams {
  chartType: CustomChartType;
  t: TFunction;
}

/**
 * Info: (20260721 - Julian)
 * 自訂圖表的編輯器 adapter（目前產生為 mock）。
 * 常用工具走 applyCustomChartAction（矩陣圖已實作），產生流程模擬思考後回報開發中；
 * 前後預覽由 CustomEditorPreviewPanel 以 CustomChartCanvas 渲染。
 * 關閉警示文案沿用 mermaid 既有 i18n key（文字與圖表別無關）。
 */
export const createCustomEditorAdapter = ({
  chartType,
  t,
}: ICreateCustomEditorAdapterParams): IChartEditorAdapter<ICustomChartAction> => ({
  isMock: true,

  applyAction: (chart, action) =>
    applyCustomChartAction(chartType, chart, action),

  // Info: (20260721 - Julian) 自訂圖表暫無標題結構化編輯，直接由 DSL 解析標題（供副標顯示）
  getTitle: (chart) => {
    const result = parseCustomChart(chartType, chart);
    return result.ok ? (result.ast.title ?? "") : "";
  },

  // Info: (20260721 - Julian) mock 產生：模擬思考後拋出開發中訊息（顯示於預覽區）；honor abort signal
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

  ControlPanel: (ctx) => (
    <CustomEditorControlPanel
      chartType={chartType}
      isMock
      chartSubtitle={ctx.chartTitle}
      chart={ctx.chart}
      aiInstruction={ctx.aiInstruction}
      setAiInstruction={ctx.setAiInstruction}
      pendingActions={ctx.pendingActions}
      onAddAction={ctx.onAddAction}
      onRemoveAction={ctx.onRemoveAction}
    />
  ),

  PreviewPanel: (ctx) => (
    <CustomEditorPreviewPanel
      chartType={chartType}
      baseChart={ctx.baseChart}
      newChartPreview={ctx.newChartPreview}
      aiInstruction={ctx.aiInstruction}
      isGenerating={ctx.isGenerating}
      apiError={ctx.apiError}
      onCancel={ctx.onCancel}
      onGenerate={ctx.onGenerate}
      onAbort={ctx.onAbort}
      onAdopt={ctx.onAdopt}
    />
  ),

  closeWarning: {
    title: t("chart.mermaid.ai_editor.close_warning_title"),
    message: t("chart.mermaid.ai_editor.close_warning_message"),
    cancelText: t("chart.mermaid.ai_editor.close_warning_cancel"),
    confirmText: t("chart.mermaid.ai_editor.close_warning_confirm"),
  },
});
