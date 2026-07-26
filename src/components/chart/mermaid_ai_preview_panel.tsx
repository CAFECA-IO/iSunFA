"use client";

import { useMemo, FC } from "react";
import { DonutChart, IDonutChartData } from "@/components/common/donut_chart";
import {
  Loader2,
  Sparkles,
  CircleX,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
} from "lucide-react";
import { parsePieData } from "@/lib/utils/mermaid_helpers";
import { useZoomPan } from "@/hooks/use_zoom_pan";
import { useMermaidRender } from "@/hooks/use_mermaid_render";
import { useTranslation } from "@/i18n/i18n_context";
import { ChartEditorPreviewShell } from "@/components/chart/ai_chart_editor/chart_editor_preview_shell";

// ==========================================
// Info: (20260629 - Julian) 支援縮放與拖曳移動的 SVG 容器
// ==========================================
interface IZoomableSvgContainerProps {
  svgContent: string;
}

const ZoomableSvgContainer: FC<IZoomableSvgContainerProps> = ({
  svgContent,
}) => {
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
      {/* Info: (20260629 - Julian) 縮放控制器組件 */}
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

      {/* Info: (20260629 - Julian) 拖曳提示標籤 */}
      <div
        className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded border border-slate-100 bg-white/70 p-1 text-[10px] text-slate-400 backdrop-blur-sm"
        title={t("chart.mermaid.ai_editor.drag_tooltip")!}
      >
        <Move size={10} />
        <span>{t("chart.mermaid.ai_editor.drag_tip")}</span>
      </div>

      {/* Info: (20260629 - Julian) 渲染畫布區域 */}
      <div
        className="flex h-full w-full items-center justify-center"
        {...dragHandlers}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
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

// ==========================================
// Info: (20260629 - Julian) Main Component
// ==========================================
interface IMermaidAiPreviewPanelProps {
  svgStr: string;
  parsedPieData: { title: string; data: IDonutChartData[] } | null;
  aiInstruction: string;
  isGenerating: boolean;
  newChartPreview: string;
  apiError: string | null;
  onCancel: () => void;
  onGenerate: () => void;
  onAbort: () => void;
  onAdopt: () => void;
}

const MermaidAiPreviewPanel: FC<IMermaidAiPreviewPanelProps> = ({
  svgStr,
  parsedPieData,
  aiInstruction,
  isGenerating,
  newChartPreview,
  apiError,
  onCancel,
  onGenerate,
  onAbort,
  onAdopt,
}) => {
  const { t } = useTranslation();

  const previewPieData = useMemo(() => {
    return parsePieData(newChartPreview);
  }, [newChartPreview]);

  // Info: (20260714 - Julian) 圓餅圖改由 DonutChart 呈現，故略過 mermaid 渲染
  const { svg: previewSvgStr, hasError: previewHasError } = useMermaidRender(
    newChartPreview,
    !!previewPieData,
  );

  // Info: (20260714 - Julian) 「修改後」預覽區內容：以優先序早退，取代多層巢狀三元運算
  const renderAfterPreview = () => {
    // Info: (20260714 - Julian) 生成中
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 size={32} className="animate-spin text-orange-600" />
          <span className="text-xs font-bold text-orange-600">
            {t("chart.mermaid.ai_editor.generating")}
          </span>
        </div>
      );
    }

    // Info: (20260714 - Julian) API 產生失敗
    if (apiError) {
      return (
        <div className="p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-xs font-bold text-orange-500">
            <TriangleAlert size={16} className="shrink-0" />
            <span>{t("chart.mermaid.ai_editor.generate_failed")}</span>
          </div>
          <span className="block text-[11px] leading-normal text-slate-500">
            {apiError}
          </span>
        </div>
      );
    }

    // Info: (20260714 - Julian) 尚無預覽內容
    if (!newChartPreview) {
      return (
        <div className="text-center text-slate-400">
          <Sparkles
            size={24}
            className="mx-auto mb-2 animate-pulse text-slate-300"
          />
          <span className="text-xs">
            {t("chart.mermaid.ai_editor.placeholder")}
          </span>
        </div>
      );
    }

    // Info: (20260714 - Julian) 圓餅圖改由 DonutChart 呈現
    if (previewPieData) {
      return (
        <DonutChart title={previewPieData.title} data={previewPieData.data} />
      );
    }

    // Info: (20260714 - Julian) Mermaid 渲染失敗，顯示原始定義供除錯
    if (previewHasError) {
      return (
        <div className="p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-xs font-bold text-red-500">
            <CircleX size={16} className="shrink-0" />
            <span>{t("chart.mermaid.ai_editor.render_failed")}</span>
          </div>
          <span className="block max-h-[120px] overflow-y-auto font-mono text-[11px] whitespace-pre-wrap text-slate-400">
            {newChartPreview}
          </span>
        </div>
      );
    }

    // Info: (20260714 - Julian) 正常渲染的 SVG
    return <ZoomableSvgContainer svgContent={previewSvgStr} />;
  };

  const before = parsedPieData ? (
    <DonutChart title={parsedPieData.title} data={parsedPieData.data} />
  ) : (
    <ZoomableSvgContainer svgContent={svgStr} />
  );

  return (
    <ChartEditorPreviewShell
      before={before}
      after={renderAfterPreview()}
      previewCompareLabel={t("chart.mermaid.ai_editor.preview_compare")}
      beforeLabel={t("chart.mermaid.ai_editor.before")}
      afterLabel={t("chart.mermaid.ai_editor.after")}
      cancelLabel={t("chart.mermaid.ai_editor.cancel")}
      generateLabel={t("chart.mermaid.ai_editor.generate")}
      stopGeneratingLabel={t("chart.mermaid.ai_editor.stop_generating")}
      adoptLabel={t("chart.mermaid.ai_editor.adopt")}
      aiInstruction={aiInstruction}
      isGenerating={isGenerating}
      canAdopt={!!newChartPreview && !previewHasError}
      onCancel={onCancel}
      onGenerate={onGenerate}
      onAbort={onAbort}
      onAdopt={onAdopt}
    />
  );
};

export { MermaidAiPreviewPanel };
