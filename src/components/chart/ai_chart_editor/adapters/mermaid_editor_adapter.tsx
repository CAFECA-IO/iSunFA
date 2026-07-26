"use client";

import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IDonutChartData } from "@/components/common/donut_chart";
import { MermaidAiControlPanel } from "@/components/chart/mermaid_ai_control_panel";
import { MermaidAiPreviewPanel } from "@/components/chart/mermaid_ai_preview_panel";
import { MermaidChartType } from "@/constants/mermaid_chart";
import {
  IChartAction,
  MermaidActionType,
  applyChartAction,
  parsePieData,
  getChartTitle,
} from "@/lib/utils/mermaid_helpers";
import { useTranslation } from "@/i18n/i18n_context";
import { IChartEditorAdapter } from "@/interfaces/ai_chart_editor";

type TFunction = ReturnType<typeof useTranslation>["t"];

interface ICreateMermaidEditorAdapterParams {
  chartType: MermaidChartType;
  svgStr: string;
  parsedPieData: { title: string; data: IDonutChartData[] } | null;
  t: TFunction;
}

/**
 * Info: (20260721 - Julian)
 * mermaid 圖表的編輯器 adapter：把既有 MermaidAiControlPanel / MermaidAiPreviewPanel
 * 與 applyChartAction / 後端產生 / 標題邏輯包成通用 modal 可用的介面（行為與原 MermaidAiModal 一致）。
 */
export const createMermaidEditorAdapter = ({
  chartType,
  svgStr,
  parsedPieData,
  t,
}: ICreateMermaidEditorAdapterParams): IChartEditorAdapter<IChartAction> => ({
  applyAction: (chart, action) => applyChartAction(chartType, chart, action),

  getTitle: (chart, pendingActions) => {
    const changeTitleAction = pendingActions.find(
      (a) => a.type === MermaidActionType.CHANGE_TITLE,
    );
    if (
      changeTitleAction &&
      changeTitleAction.type === MermaidActionType.CHANGE_TITLE
    ) {
      return changeTitleAction.payload.title;
    }
    return getChartTitle(chart);
  },

  buildTitleAction: (title) => ({
    id: crypto.randomUUID(),
    type: MermaidActionType.CHANGE_TITLE,
    description: t("chart.mermaid.ai_editor.action_change_title", { title }),
    payload: { title },
  }),

  generate: async (baseChart, instruction, signal) => {
    const response = await request<IApiResponse<{ result: string }>>(
      "/api/v1/admin/pdf_editor/mermaid_modify",
      {
        method: "POST",
        signal,
        body: JSON.stringify({
          originalChart: baseChart, // Info: (20260708 - Julian) 已套用結構化編輯的圖表作為基底
          chartType,
          instruction,
        }),
      },
    );
    if (!response || response.code !== "SUCCESS" || !response.payload?.result) {
      // Info: (20260714 - Julian) 回應非成功 → throw，訊息顯示於預覽區
      throw new Error("AI 圖表產生失敗，請重試");
    }
    return response.payload.result;
  },

  ControlPanel: (ctx) => (
    <MermaidAiControlPanel
      chartType={chartType}
      aiInstruction={ctx.aiInstruction}
      setAiInstruction={ctx.setAiInstruction}
      chart={ctx.chart}
      pendingActions={ctx.pendingActions}
      onAddAction={ctx.onAddAction}
      onRemoveAction={ctx.onRemoveAction}
      chartTitle={ctx.chartTitle}
      onTitleChange={ctx.onTitleChange}
    />
  ),

  PreviewPanel: (ctx) => (
    <MermaidAiPreviewPanel
      svgStr={svgStr}
      parsedPieData={parsePieData(ctx.baseChart) || parsedPieData}
      aiInstruction={ctx.aiInstruction}
      isGenerating={ctx.isGenerating}
      newChartPreview={ctx.newChartPreview}
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
