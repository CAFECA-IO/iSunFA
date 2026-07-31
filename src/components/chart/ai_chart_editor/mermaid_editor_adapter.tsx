"use client";

import { FC, useState, useMemo } from "react";
import { CircleX, ZoomIn, ZoomOut, Maximize, Move } from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { MermaidChartType } from "@/constants/mermaid_chart";
import {
  IChartAction,
  MermaidActionType,
  applyChartAction,
  getChartTitle,
  detectChartType,
  parsePieData,
} from "@/lib/utils/mermaid_helpers";
import { DonutChart } from "@/components/common/donut_chart";
import { FlowchartToolsSection } from "@/components/chart/flowchart_tools_submenu";
import { PieToolsSection } from "@/components/chart/pie_tools_submenu";
import { GanttToolsSection } from "@/components/chart/gantt_tools_submenu";
import { XYChartToolsSection } from "@/components/chart/xychart_tools_submenu";
import { SankeyToolsSection } from "@/components/chart/sankey_tools_submenu";
import { useZoomPan } from "@/hooks/use_zoom_pan";
import { useMermaidRender } from "@/hooks/use_mermaid_render";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IChartEditorAdapter,
  IChartEditorToolsContext,
} from "@/interfaces/ai_chart_editor";

type TFunction = ReturnType<typeof useTranslation>["t"];

// Info: (20260723 - Julian) 有常用工具的 mermaid 圖表類型
const TOOL_TYPES = new Set<MermaidChartType>([
  MermaidChartType.PIE,
  MermaidChartType.FLOWCHART,
  MermaidChartType.GANTT,
  MermaidChartType.XYCHART,
  MermaidChartType.SANKEY,
]);

// Info: (20260629 - Julian) 支援縮放與拖曳移動的 SVG 容器
const ZoomableSvgContainer: FC<{ svgContent: string }> = ({ svgContent }) => {
  const { t } = useTranslation();
  const {
    scale,
    position,
    isDragging,
    zoomIn,
    zoomOut,
    resetZoom,
    dragHandlers,
  } = useZoomPan({ initialScale: 0.8, minScale: 0.3, maxScale: 3 });

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={zoomIn}
          title={t("chart.mermaid.zoom_in")!}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          title={t("chart.mermaid.zoom_out")!}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          title={t("chart.mermaid.reset")!}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Maximize size={14} />
        </button>
        <div className="mx-1 h-3 w-px bg-slate-200" />
        <span className="px-1 text-[9px] font-bold text-slate-400">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div
        className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded border border-slate-100 bg-white/70 p-1 text-[10px] text-slate-400 backdrop-blur-sm"
        title={t("chart.mermaid.ai_editor.drag_tooltip")!}
      >
        <Move size={10} />
        <span>{t("chart.mermaid.ai_editor.drag_tip")}</span>
      </div>

      <div
        className="flex h-full w-full items-center justify-center"
        {...dragHandlers}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          className="flex h-full max-h-[95%] w-full max-w-[95%] items-center justify-center select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
};

// Info: (20260723 - Julian) 右半邊：mermaid 圖表字串 → 預覽（圓餅圖用 DonutChart，其餘客戶端渲染為可縮放 SVG）
const MermaidChartPreview: FC<{ chart: string }> = ({ chart }) => {
  const { t } = useTranslation();
  const pieData = useMemo(() => parsePieData(chart), [chart]);
  const { svg, hasError } = useMermaidRender(chart, !!pieData);

  if (pieData) {
    return <DonutChart title={pieData.title} data={pieData.data} />;
  }
  if (hasError) {
    return (
      <div className="p-4 text-center">
        <div className="mb-1 flex items-center justify-center gap-1 text-xs font-bold text-red-500">
          <CircleX size={16} className="shrink-0" />
          <span>{t("chart.mermaid.ai_editor.render_failed")}</span>
        </div>
        <span className="block max-h-[120px] overflow-y-auto font-mono text-[11px] whitespace-pre-wrap text-slate-400">
          {chart}
        </span>
      </div>
    );
  }
  return <ZoomableSvgContainer svgContent={svg} />;
};

// Info: (20260723 - Julian) 左半邊常用工具：依 mermaid 圖表類型分派工具區塊
const MermaidTools: FC<
  IChartEditorToolsContext<IChartAction> & { chartType: MermaidChartType }
> = ({ chartType, chart, onAddAction }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const shared = { selectedTool, setSelectedTool, chart, onAddAction };
  switch (chartType) {
    case MermaidChartType.PIE:
      return <PieToolsSection {...shared} />;
    case MermaidChartType.FLOWCHART:
      return <FlowchartToolsSection {...shared} />;
    case MermaidChartType.GANTT:
      return <GanttToolsSection {...shared} />;
    case MermaidChartType.XYCHART:
      return <XYChartToolsSection {...shared} />;
    case MermaidChartType.SANKEY:
      return <SankeyToolsSection {...shared} />;
    default:
      return null;
  }
};

interface ICreateMermaidEditorAdapterParams {
  chartType: MermaidChartType;
  t: TFunction;
}

/**
 * Info: (20260723 - Julian)
 * mermaid 圖表的編輯器 adapter（瘦身版）：只提供常用工具、渲染與決定論邏輯，
 * header／分頁／按鈕／預覽外殼皆由通用 modal 擁有。
 */
export const createMermaidEditorAdapter = ({
  chartType,
  t,
}: ICreateMermaidEditorAdapterParams): IChartEditorAdapter<IChartAction> => ({
  hasTools: TOOL_TYPES.has(chartType),
  examples:
    t<string[]>(
      `chart.mermaid.ai_editor.${chartType.toLowerCase()}.examples`,
    ) || [],

  applyActions: (chart, actions) =>
    actions.reduce(
      (result, action) => applyChartAction(chartType, result, action),
      chart,
    ),

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

  // Info: (20260723 - Julian) Sankey 不支援標題 → 不提供 buildTitleAction（modal 據此隱藏標題欄）
  ...(chartType !== MermaidChartType.SANKEY
    ? {
        buildTitleAction: (title: string): IChartAction => ({
          id: crypto.randomUUID(),
          type: MermaidActionType.CHANGE_TITLE,
          description: t("chart.mermaid.ai_editor.action_change_title", {
            title,
          }),
          payload: { title },
        }),
      }
    : {}),

  generate: async (baseChart, instruction, signal) => {
    const response = await request<IApiResponse<{ result: string }>>(
      "/api/v1/admin/pdf_editor/mermaid_modify",
      {
        method: "POST",
        signal,
        body: JSON.stringify({
          originalChart: baseChart,
          chartType,
          instruction,
        }),
      },
    );
    if (
      !response ||
      response.code !== ApiCode.SUCCESS ||
      !response.payload?.result
    ) {
      throw new Error(t("chart.mermaid.error_message"));
    }
    return response.payload.result;
  },

  renderPreview: (chart) => <MermaidChartPreview chart={chart} />,

  Tools: (ctx) => <MermaidTools chartType={chartType} {...ctx} />,

  isRenderable: (chart) => detectChartType(chart) !== MermaidChartType.UNKNOWN,
});
