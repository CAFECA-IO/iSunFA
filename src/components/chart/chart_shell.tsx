"use client";

import { FC, ReactNode, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize, Move } from "lucide-react";
import { useZoomPan } from "@/hooks/use_zoom_pan";
import { useTranslation } from "@/i18n/i18n_context";

interface IChartShellProps {
  children: ReactNode;
  // Info: (20260720 - Julian) 工具列動作插槽（Phase 2 注入下載 / AI 助手等按鈕；未提供則只顯示縮放控制）
  actions?: ReactNode;
}

// Info: (20260720 - Julian) 縮放範圍（與 useZoomPan 預設一致）
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const WHEEL_STEP = 0.1;

/**
 * Info: (20260720 - Julian)
 * 圖表共用外殼：灰底、可縮放（Ctrl/⌘ + 滾輪）與拖曳平移，並顯示操作提示。
 * 目前供自訂圖表（matrix/tornado/histogram/box）使用；規劃為 MermaidChart 與
 * 自訂圖表共用的容器，工具列以 actions slot 承接後續下載 / AI 助手功能。
 */
const ChartShell: FC<IChartShellProps> = ({ children, actions = <></> }) => {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const {
    scale,
    position,
    isDragging,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
    dragHandlers,
  } = useZoomPan({
    initialScale: 1,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });

  // Info: (20260720 - Julian) Ctrl/⌘ + 滾輪縮放，僅作用於此容器並阻止頁面捲動
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      setScale((prev) =>
        Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + direction * WHEEL_STEP)),
      );
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setScale]);

  const controlBtn =
    "rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";

  return (
    <div
      ref={viewportRef}
      className="relative my-4 h-[460px] min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 select-none"
    >
      {/* Info: (20260720 - Julian) 工具列：動作插槽 + 縮放控制 */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
        {actions && (
          <>
            {actions}
            <div className="mx-1 h-3 w-px bg-slate-200" />
          </>
        )}
        <button
          type="button"
          onClick={zoomIn}
          title={t("chart.mermaid.zoom_in")!}
          className={controlBtn}
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          title={t("chart.mermaid.zoom_out")!}
          className={controlBtn}
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          title={t("chart.mermaid.reset")!}
          className={controlBtn}
        >
          <Maximize size={14} />
        </button>
        <div className="mx-1 h-3 w-px bg-slate-200" />
        <span className="px-1 text-[9px] font-bold text-slate-400">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Info: (20260720 - Julian) 操作提示 */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded border border-slate-100 bg-white/70 p-1 text-[10px] text-slate-400 backdrop-blur-sm">
        <Move size={10} />
        <span>{t("chart.mermaid.hint_desktop")}</span>
      </div>

      {/* Info: (20260720 - Julian) 畫布：拖曳平移 + 縮放位移 */}
      <div
        className="flex h-full w-full items-center justify-center"
        {...dragHandlers}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export { ChartShell };
