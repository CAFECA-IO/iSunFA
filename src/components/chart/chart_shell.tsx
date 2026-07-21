"use client";

import { FC, ReactNode, useEffect, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Maximize2,
  Minimize2,
  Move,
  Download,
  Sparkles,
} from "lucide-react";
import { useZoomPan } from "@/hooks/use_zoom_pan";
import { useChartExport } from "@/hooks/use_chart_export";
import { useTranslation } from "@/i18n/i18n_context";

interface IChartShellProps {
  children: ReactNode;
  // Info: (20260720 - Julian) 開啟 AI 助手 Modal
  openAiModal: () => void;
  // Info: (20260720 - Julian) 提供檔名即啟用「下載 PNG / SVG」選單（匯出目前作用中的內容容器）
  exportFileName?: string;
  // Info: (20260720 - Julian) 是否顯示全螢幕切換（預設開啟）
  enableFullscreen?: boolean;
  // Info: (20260720 - Julian) 全螢幕標題文字
  fullscreenTitle?: string;
  // Info: (20260720 - Julian) 疊加於「可縮放內容容器」的額外 class（如 mermaid-container，供其專屬 CSS 生效）
  contentClassName?: string;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  wheelStep?: number;
}

// Info: (20260720 - Julian) 可縮放內容容器的穩定 class（匯出與列印皆以此為錨點）
const CONTENT_CLASS = "chart-shell-content";

/**
 * Info: (20260720 - Julian)
 * 圖表共用外殼：一般 Mermaid 與自訂圖表（matrix/tornado/histogram/boxplot）共用同一容器。
 * 提供灰底容器、Ctrl/⌘ + 滾輪縮放、拖曳平移、全螢幕、下載選單與操作提示；
 * 工具列內建 AI 助手按鈕，點擊呼叫 openAiModal 開啟各自的 AI 編輯 Modal。
 */
const ChartShell: FC<IChartShellProps> = ({
  children,
  openAiModal,
  exportFileName = "chart",
  enableFullscreen = true,
  fullscreenTitle = "",
  contentClassName = "",
  initialScale = 1,
  minScale = 0.3,
  maxScale = 3,
  wheelStep = 0.1,
}) => {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const {
    scale,
    position,
    isDragging,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
    dragHandlers,
  } = useZoomPan({ initialScale, minScale, maxScale });

  // Info: (20260720 - Julian) Ctrl/⌘ + 滾輪縮放；全螢幕時於 modal 內直接滾輪縮放
  // ToDo: (20260721 - Luphia) 每個 ChartShell 實例各自綁 window wheel 監聽，多圖表報告頁會有 N 個 handler 同時觸發，考慮共用單一監聽或改綁 viewport
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const overViewport = viewportRef.current?.contains(e.target as Node);
      const overModal = modalRef.current?.contains(e.target as Node);
      const shouldZoom = isFullscreen
        ? overModal
        : overViewport && (e.ctrlKey || e.metaKey);
      if (!shouldZoom) return;
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      setScale((prev) =>
        Math.max(minScale, Math.min(maxScale, prev + direction * wheelStep)),
      );
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isFullscreen, setScale, minScale, maxScale, wheelStep]);

  // Info: (20260720 - Julian) ESC 退出全螢幕並重置縮放
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        resetZoom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, resetZoom]);

  // Info: (20260720 - Julian) 匯出目標：全螢幕取 modal 內、否則取一般 viewport 內的內容容器
  const getContainer = (): HTMLElement | null => {
    const root = isFullscreen ? modalRef.current : viewportRef.current;
    return (root?.querySelector(`.${CONTENT_CLASS}`) as HTMLElement) ?? null;
  };
  const { exportPng, exportSvg } = useChartExport(
    getContainer,
    exportFileName ?? "chart",
  );

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsFullscreen((prev) => !prev);
    resetZoom();
  };

  const controlBtn =
    "shrink-0 cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";

  // Info: (20260720 - Julian) 工具列（一般與全螢幕共用）
  const toolbar = (
    <div className="chart-shell-toolbar absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/95 p-1 shadow-sm backdrop-blur-sm">
      <>
        <button
          type="button"
          onClick={openAiModal}
          className="shrink-0 cursor-pointer rounded-md p-1.5 text-blue-600 transition-colors hover:bg-slate-100"
          title={t("chart.mermaid.ai_edit")!}
        >
          <Sparkles size={16} />
        </button>
        <div className="mx-0.5 h-3 w-px bg-slate-200" />
      </>
      {exportFileName && (
        <>
          <div className="group/download relative shrink-0">
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-orange-600 transition-colors hover:bg-slate-100"
              title={t("chart.mermaid.download")!}
            >
              <Download size={16} />
            </button>
            <div className="absolute top-full right-0 z-20 hidden w-auto flex-col pt-1 group-hover/download:flex">
              <div className="flex flex-col rounded-md border border-slate-200 bg-white py-1 shadow-md">
                <button
                  type="button"
                  onClick={exportPng}
                  className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  {t("chart.mermaid.export_png")}
                </button>
                <button
                  type="button"
                  onClick={exportSvg}
                  className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  {t("chart.mermaid.export_svg")}
                </button>
              </div>
            </div>
          </div>
          <div className="mx-0.5 h-3 w-px bg-slate-200" />
        </>
      )}
      <button
        type="button"
        onClick={zoomIn}
        title={t("chart.mermaid.zoom_in")!}
        className={controlBtn}
      >
        <ZoomIn size={16} />
      </button>
      <button
        type="button"
        onClick={zoomOut}
        title={t("chart.mermaid.zoom_out")!}
        className={controlBtn}
      >
        <ZoomOut size={16} />
      </button>
      <button
        type="button"
        onClick={resetZoom}
        title={t("chart.mermaid.reset")!}
        className={controlBtn}
      >
        <Maximize size={16} />
      </button>
      {enableFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          title={
            isFullscreen
              ? t("chart.mermaid.close_fullscreen")!
              : t("chart.mermaid.fullscreen")!
          }
          className={controlBtn}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}
      <div className="mx-0.5 h-3 w-px bg-slate-200" />
      <span className="px-1 text-[9px] font-bold text-slate-400">
        {Math.round(scale * 100)}%
      </span>
    </div>
  );

  // Info: (20260720 - Julian) 可拖曳平移 + 縮放位移的畫布（內容容器帶 CONTENT_CLASS 供匯出/列印錨定）
  const canvas = (
    <div
      className="flex h-full w-full items-center justify-center"
      {...dragHandlers}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div
        className={`${CONTENT_CLASS} ${contentClassName} flex h-full w-full items-center justify-center`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isDragging
            ? "none"
            : "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {children}
      </div>
    </div>
  );

  const hint = (
    <div className="chart-shell-hint absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded border border-slate-100 bg-white/70 p-1 text-[10px] text-slate-400 backdrop-blur-sm">
      <Move size={10} />
      <span>
        {isFullscreen
          ? t("chart.mermaid.hint_fullscreen")
          : t("chart.mermaid.hint_desktop")}
      </span>
    </div>
  );

  return (
    <div className="relative my-4 w-full break-inside-avoid print:break-inside-avoid">
      <style>{`
        @media print {
          .chart-shell-viewport {
            border: none !important;
            background: transparent !important;
            height: auto !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }
          .chart-shell-toolbar, .chart-shell-hint, .chart-shell-backdrop {
            display: none !important;
          }
          .${CONTENT_CLASS} {
            transform: none !important;
            transition: none !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          .${CONTENT_CLASS} svg {
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div
        ref={viewportRef}
        className="chart-shell-viewport relative h-[460px] min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 select-none"
      >
        {toolbar}
        {hint}
        {canvas}
      </div>

      {/* ToDo: (20260721 - Luphia) 全螢幕 backdrop z-9999 高於 CustomChartAiModal z-8888，全螢幕下點 AI 助手會被此層蓋住而無法操作；需驗證並調整堆疊順序 */}
      {isFullscreen && enableFullscreen && (
        <div
          ref={modalRef}
          className="chart-shell-backdrop fixed inset-0 z-9999 flex items-center justify-center bg-slate-200/80 p-6 backdrop-blur-md select-none"
        >
          {/* Info: (20260720 - Julian) 全螢幕標題 */}
          <div className="absolute top-4 left-6 z-10 flex items-center gap-2 font-medium text-slate-900">
            <span className="h-5 w-1 rounded-sm bg-[#FF9800]" />
            <span>{fullscreenTitle ?? t("chart.mermaid.preview_title")}</span>
          </div>
          {toolbar}
          {hint}
          {canvas}
        </div>
      )}
    </div>
  );
};

export { ChartShell };
