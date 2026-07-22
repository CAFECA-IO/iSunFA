"use client";

import { useState, useMemo, FC } from "react";
import { DonutChart, IDonutChartData } from "@/components/common/donut_chart";
import {
  Columns2,
  Loader2,
  Rows2,
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
import { PreviewDirective } from "@/constants/chart_ui";

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
  const [previewDirective, setPreviewDirective] = useState<PreviewDirective>(
    PreviewDirective.ROW,
  );

  const previewStyle =
    previewDirective === PreviewDirective.ROW
      ? "h-[48%] min-h-[220px] w-full"
      : "w-[48%] h-full";

  const previewPieData = useMemo(() => {
    return parsePieData(newChartPreview);
  }, [newChartPreview]);

  // Info: (20260714 - Julian) 圓餅圖改由 DonutChart 呈現，故略過 mermaid 渲染
  const { svg: previewSvgStr, hasError: previewHasError } = useMermaidRender(
    newChartPreview,
    !!previewPieData,
  );

  const generateButton = isGenerating ? (
    // Info: (20260708 - Julian) 停止生成按鈕
    <button
      type="button"
      onClick={onAbort}
      className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-5 py-2 text-xs font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-100"
    >
      <CircleX size={14} />
      {t("chart.mermaid.ai_editor.stop_generating")}
    </button>
  ) : (
    // Info: (20260708 - Julian) 產生新圖表按鈕
    <button
      type="button"
      onClick={onGenerate}
      disabled={!aiInstruction.trim()}
      className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
    >
      <Sparkles size={14} />
      {t("chart.mermaid.ai_editor.generate")}
    </button>
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100 md:w-3/5">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-bold text-slate-700">
          {t("chart.mermaid.ai_editor.preview_compare")}
        </p>
        {/* Info: (20260623 - Julian) 預覽排版切換 */}
        <div className="flex items-center gap-1 rounded-lg bg-gray-200 p-1">
          <button
            type="button"
            onClick={() => setPreviewDirective(PreviewDirective.ROW)}
            className={`shrink-0 rounded-sm p-1 ${
              previewDirective === PreviewDirective.ROW
                ? "bg-white text-red-400 shadow-sm"
                : "text-gray-500 hover:bg-gray-300"
            }`}
          >
            <Rows2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPreviewDirective(PreviewDirective.COLUMN)}
            className={`shrink-0 rounded-sm p-1 ${
              previewDirective === PreviewDirective.COLUMN
                ? "bg-white text-red-400 shadow-sm"
                : "text-gray-500 hover:bg-gray-300"
            }`}
          >
            <Columns2 size={16} />
          </button>
        </div>
      </div>

      <div
        className={`flex flex-1 gap-4 overflow-y-auto p-4 ${
          previewDirective === PreviewDirective.COLUMN ? "flex-row" : "flex-col"
        } `}
      >
        {/* Info: (20260623 - Julian) 原始圖表 */}
        <div className={`flex flex-col ${previewStyle}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            {t("chart.mermaid.ai_editor.before")}
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            {parsedPieData ? (
              <DonutChart
                title={parsedPieData.title}
                data={parsedPieData.data}
              />
            ) : (
              <ZoomableSvgContainer svgContent={svgStr} />
            )}
          </div>
        </div>

        {/* Info: (20260623 - Julian) 修改後預覽 */}
        <div className={`flex flex-col ${previewStyle}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500"></span>
            {t("chart.mermaid.ai_editor.after")}
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            {renderAfterPreview()}
          </div>
        </div>
      </div>

      {/* Info: (20260623 - Julian) 底部動作按鈕 */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onCancel}
          className="enable:hover:bg-slate-100 cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors disabled:text-slate-400"
        >
          {t("chart.mermaid.ai_editor.cancel")}
        </button>

        {generateButton}

        {newChartPreview && !previewHasError && (
          <button
            type="button"
            onClick={onAdopt}
            className="cursor-pointer rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-500"
          >
            {t("chart.mermaid.ai_editor.adopt")}
          </button>
        )}
      </div>
    </div>
  );
};

export { MermaidAiPreviewPanel };
