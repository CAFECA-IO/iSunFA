"use client";

import { useEffect, useState, useMemo, FC, useRef } from "react";
import { useZoomPan } from "@/hooks/use_zoom_pan";
import mermaid from "mermaid";
import { DonutChart, DEFAULT_COLORS } from "@/components/common/donut_chart";
import {
  Download,
  Maximize,
  Maximize2,
  Minimize2,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useChartExport } from "@/hooks/use_chart_export";
import { MermaidAiModal } from "@/components/chart/mermaid_ai_modal";
import {
  parsePieColors,
  detectChartType,
  parseFlowchartNodes,
  parsePieItems,
  parsePieData,
} from "@/lib/utils/mermaid_helpers";
import { MermaidChartType } from "@/constants/mermaid_chart";

interface IMermaidChartProps {
  chart: string;
  onChartChange?: (newChart: string) => void;
}

const MermaidChart: FC<IMermaidChartProps> = ({
  chart,
  onChartChange = undefined,
}) => {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Info: (20260623 - Julian) 維持當前作用的圖表內容 state
  const [currentChart, setCurrentChart] = useState<string>(chart || "");
  useEffect(() => {
    setCurrentChart(chart || "");
  }, [chart]);

  const [svgStr, setSvgStr] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);

  // Info: (20260623 - Julian) AI Modal Open State
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Info: (20260623 - Julian) 自動判別目前是哪種圖表類型
  const chartType = useMemo(() => {
    return detectChartType(currentChart);
  }, [currentChart]);

  // Info: (20260623 - Julian) 解析當前 flowchart/graph 中現有的所有節點
  const parsedNodes = useMemo(() => {
    if (chartType !== MermaidChartType.FLOWCHART) return [];
    return parseFlowchartNodes(currentChart);
  }, [currentChart, chartType]);

  // Info: (20260623 - Julian) 解析當前 pie chart 中現有的所有資料項目
  const parsedPieItems = useMemo(() => {
    if (chartType !== MermaidChartType.PIE) return [];
    return parsePieItems(currentChart);
  }, [currentChart, chartType]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Info: (20260629 - Julian) 使用 Hook 管理縮放與位移狀態
  const {
    scale,
    setScale,
    position,
    isDragging,
    zoomIn,
    zoomOut,
    resetZoom,
    startDrag,
    updateDrag,
    endDrag,
  } = useZoomPan({ initialScale: 1, minScale: 0.5, maxScale: 4 });

  // Info: (20260418 - Tzuhan) Intercept Mermaid Pie charts and render using our premium Recharts Donut instead
  const parsedPieData = useMemo(() => {
    return parsePieData(currentChart);
  }, [currentChart]);

  useEffect(() => {
    if (parsedPieData) return; // Info: (20260418 - Tzuhan) Skip mermaid rendering if we intercepted a pie chart

    // Info: (20260615 - Julian) 加入 isCurrent 變數，防止在更新過程中重新渲染（競態問題）
    let isCurrent = true;

    // Info: (20260418 - Tzuhan) Applied premium aesthetic color palette for Mermaid charts to avoid muddy default dark theme
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        background: "transparent",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

        // Info: (20260418 - Tzuhan) Unified Premium Flowchart Palette matching DonutChart (Navy & Orange)
        primaryColor: "#ffffff",
        primaryTextColor: "#152C5B",
        primaryBorderColor: "#152C5B",
        lineColor: "#FF9800",
        secondaryColor: "#f8fafc",
        tertiaryColor: "#ffffff",
        mainBkg: "#ffffff",
        nodeBorder: "#152C5B",
        clusterBkg: "#ffffff",
        clusterBorder: "#E2E8F0",
        defaultLinkColor: "#FF9800",
        titleColor: "#152C5B",
        edgeLabelBackground: "#FFF3E0", // Info: (20260615 - Julian) 節點標籤底色（淺橘色）
        nodeTextColor: "#152C5B",

        // Info: (20260418 - Tzuhan) Vibrant Palette for Pie Charts
        pie1: "#4F46E5",
        pie2: "#10B981",
        pie3: "#F59E0B",
        pie4: "#EC4899",
        pie5: "#8B5CF6",
        pie6: "#06B6D4",
        pie7: "#EF4444",
        pie8: "#84CC16",
        pie9: "#F97316",
        pie10: "#3B82F6",

        pieTitleTextSize: "20px",
        pieTitleTextColor: "#1E293B",
        pieSectionTextSize: "15px",
        pieSectionTextColor: "#FFFFFF",
        pieLegendTextSize: "14px",
        pieLegendTextColor: "#475569",
        pieStrokeColor: "#FFFFFF",
        pieStrokeWidth: "3px",
        pieOuterStrokeWidth: "0px",
        pieOuterStrokeColor: "transparent",
        pieOpacity: "0.95",
      },
      securityLevel: "loose",
    });

    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, currentChart);

        // Info: (20260615 - Julian) 只有當組件仍處於活躍狀態時，才更新 svg 狀態，防止競態
        if (isCurrent) {
          setSvgStr(svg);
          setHasError(false);
        }
      } catch (error) {
        console.error("Mermaid rendering failed", error);
        if (isCurrent) {
          setHasError(true);
        }
      }
    };

    if (
      currentChart &&
      currentChart.trim() !== "" &&
      currentChart !== "undefined" &&
      typeof window !== "undefined"
    ) {
      renderChart();
    }

    return () => {
      isCurrent = false; // Info: (20260615 - Julian) 清除 isCurrent（組件卸載或依賴更新時）
    };
  }, [currentChart, parsedPieData]);

  // Info: (20260615 - Julian) 透過 false 監聽器來控制縮放與平移滾輪
  useEffect(() => {
    const handleWheelEvent = (e: WheelEvent) => {
      const isOverViewport = viewportRef.current?.contains(e.target as Node);
      const isOverModal = modalRef.current?.contains(e.target as Node);

      const shouldZoom = isFullscreen
        ? isOverModal
        : isOverViewport && (e.ctrlKey || e.metaKey);

      if (shouldZoom) {
        e.preventDefault();
        const zoomFactor = 0.05;
        const direction = e.deltaY < 0 ? 1 : -1;
        setScale((prev) =>
          Math.max(0.5, Math.min(4, prev + direction * zoomFactor)),
        );
      }
    };

    window.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheelEvent);
    };
  }, [isFullscreen, setScale]);

  // Info: (20260615 - Julian) 按下 ESC 鍵退出全螢幕
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

  const toggleFullscreen = (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    setIsFullscreen((prev) => !prev);
    // Info: (20260615 - Julian) 重置尺寸與位移
    resetZoom();
  };

  // Info: (20260615 - Julian) 獲取目前作用中的 Mermaid SVG 容器
  const getContainer = () => {
    if (isFullscreen && modalRef.current) {
      return modalRef.current.querySelector(
        ".mermaid-container",
      ) as HTMLElement | null;
    }
    return viewportRef.current?.querySelector(
      ".mermaid-container",
    ) as HTMLElement | null;
  };

  // Info: (20260615 - Julian) 使用共享 Hook 管理 PNG / SVG 匯出
  const { exportPng, exportSvg } = useChartExport(
    () => getContainer(),
    "mermaid-chart",
  );

  // Info: (20260615 - Julian) 綁定 Viewport 事件，避免 JSX-a11y 警告
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleMouseDownNative = (e: MouseEvent) => {
      if (e.button !== 0) return; // Info: (20260615 - Julian) 僅允許左鍵
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      startDrag(e.clientX, e.clientY);
    };

    const handleMouseMoveNative = (e: MouseEvent) => {
      updateDrag(e.clientX, e.clientY);
    };

    const handleDoubleClickNative = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      resetZoom();
    };

    viewport.addEventListener("mousedown", handleMouseDownNative);
    viewport.addEventListener("mousemove", handleMouseMoveNative);
    viewport.addEventListener("mouseup", endDrag);
    viewport.addEventListener("mouseleave", endDrag);
    viewport.addEventListener("dblclick", handleDoubleClickNative);

    return () => {
      viewport.removeEventListener("mousedown", handleMouseDownNative);
      viewport.removeEventListener("mousemove", handleMouseMoveNative);
      viewport.removeEventListener("mouseup", endDrag);
      viewport.removeEventListener("mouseleave", endDrag);
      viewport.removeEventListener("dblclick", handleDoubleClickNative);
    };
  }, [startDrag, updateDrag, endDrag, resetZoom]);

  // Info: (20260615 - Julian) 綁定 Modal 事件，避免 JSX-a11y 警告
  useEffect(() => {
    if (!isFullscreen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const handleMouseDownNative = (e: MouseEvent) => {
      if (e.button !== 0) return; // Info: (20260615 - Julian) 僅允許左鍵
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      startDrag(e.clientX, e.clientY);
    };

    const handleMouseMoveNative = (e: MouseEvent) => {
      updateDrag(e.clientX, e.clientY);
    };

    const handleDoubleClickNative = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      resetZoom();
    };

    modal.addEventListener("mousedown", handleMouseDownNative);
    modal.addEventListener("mousemove", handleMouseMoveNative);
    modal.addEventListener("mouseup", endDrag);
    modal.addEventListener("mouseleave", endDrag);
    modal.addEventListener("dblclick", handleDoubleClickNative);

    return () => {
      modal.removeEventListener("mousedown", handleMouseDownNative);
      modal.removeEventListener("mousemove", handleMouseMoveNative);
      modal.removeEventListener("mouseup", endDrag);
      modal.removeEventListener("mouseleave", endDrag);
      modal.removeEventListener("dblclick", handleDoubleClickNative);
    };
  }, [isFullscreen, startDrag, updateDrag, endDrag, resetZoom]);

  const handleAdopt = (newChart: string) => {
    setCurrentChart(newChart);
    if (onChartChange) {
      onChartChange(newChart);
    }
  };

  if (!parsedPieData) {
    if (hasError) {
      return (
        <div className="my-4 overflow-x-auto rounded-md border border-red-500/30 bg-[#1E1E1E] p-4 text-sm">
          <p className="mb-2 font-semibold text-red-500">
            Mermaid Syntax Error
          </p>
          <pre className="whitespace-pre-wrap text-gray-300">
            {currentChart}
          </pre>
        </div>
      );
    }

    if (!svgStr) {
      return (
        <div className="my-6 flex animate-pulse justify-center p-10 text-gray-500">
          {t("chart.mermaid.rendering")}
        </div>
      );
    }
  }

  return (
    <div className="relative w-full break-inside-avoid print:break-inside-avoid">
      <style>{`
        /* 1. Subgraph Clusters Styling */
        .mermaid-container .cluster rect {
          fill: #F8FAFC !important;
          stroke: #E2E8F0 !important;
          stroke-width: 1px !important;
          rx: 10px !important;
          ry: 10px !important;
        }
        .mermaid-container .cluster-label span,
        .mermaid-container .cluster-label text,
        .mermaid-container .cluster-label foreignObject {
          color: #64748B !important;
          fill: #64748B !important;
          font-family: inherit !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }

        /* 2. Process Nodes Styling */
        .mermaid-container .node rect,
        .mermaid-container .node circle,
        .mermaid-container .node polygon,
        .mermaid-container .node path,
        .mermaid-container .node .label-container,
        .mermaid-container .node .basic {
          fill: #ffffff !important;
          stroke: #152C5B !important;
          stroke-width: 1.5px !important;
          filter: drop-shadow(0px 2px 4px rgba(21, 44, 91, 0.05)) !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .mermaid-container .node rect {
          rx: 8px !important;
          ry: 8px !important;
        }

        /* Hover Node Styling on interactive screen */
        @media screen {
          .mermaid-container .node:hover rect,
          .mermaid-container .node:hover circle,
          .mermaid-container .node:hover polygon,
          .mermaid-container .node:hover path,
          .mermaid-container .node:hover .label-container {
            fill: #F8FAFF !important;
            stroke: #2563EB !important;
            filter: drop-shadow(0px 4px 6px rgba(37, 99, 235, 0.15)) !important;
          }
          .mermaid-container .node:hover span,
          .mermaid-container .node:hover tspan {
            color: #2563EB !important;
            fill: #2563EB !important;
          }
        }

        /* 3. Text & Colors Inside Nodes */
        .mermaid-container .node .label,
        .mermaid-container .node span,
        .mermaid-container .node foreignObject,
        .mermaid-container .node tspan {
          color: #152C5B !important;
          fill: #152C5B !important;
          font-family: inherit !important;
          font-weight: 500 !important;
        }

        /* 4. Connection Lines Styling */
        .mermaid-container .edgePath .path {
          stroke: #F97316 !important; /* Amber Orange */
          stroke-width: 1.8px !important;
          transition: stroke-width 0.2s ease !important;
        }

        /* Highlight path on hover */
        @media screen {
          .mermaid-container .edgePath:hover .path {
            stroke-width: 2.5px !important;
            stroke: #EA580C !important;
          }
        }

        .mermaid-container .edgePath .arrowheadPath,
        .mermaid-container .edgePath marker path {
          fill: #F97316 !important;
          stroke: #F97316 !important;
          stroke-width: 1px !important;
        }

        /* 5. Edge Label Badges */
        .mermaid-container .edgeLabel rect {
          fill: #FFF7ED !important;
          stroke: #FFEDD5 !important;
          stroke-width: 1px !important;
          rx: 4px !important;
          ry: 4px !important;
          transform: scale(1.35, 1.25) !important;
          transform-box: fill-box !important;
          transform-origin: center !important;
        }
        .mermaid-container .edgeLabel span,
        .mermaid-container .edgeLabel text,
        .mermaid-container .edgeLabel tspan {
          color: #C2410C !important;
          fill: #C2410C !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          font-family: inherit !important;
        }
        .mermaid-container .edgeLabel {
          background-color: transparent !important;
        }

        /* 6. Layout Viewport & Print Media Configurations */
        @media screen {
          .mermaid-interactive-viewport {
            position: relative;
            width: 100%;
            height: 520px;
            border: 1px solid #E2E8F0;
            background-color: #F8FAFC;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .mermaid-interactive-viewport:hover {
            border-color: #CBD5E1;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
          }

          /* Full SVG responsiveness inside viewport */
          .mermaid-container svg {
            max-width: 95% !important;
            max-height: 95% !important;
            width: auto !important;
            height: auto !important;
            margin: 0 auto;
            pointer-events: none; /* Let dragging bubble to viewport */
          }
          .mermaid-container svg * {
            pointer-events: auto; /* Re-enable for nodes hover */
          }
        }

        @media print {
          .mermaid-interactive-viewport {
            border: none !important;
            background: transparent !important;
            height: auto !important;
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .mermaid-control-btn,
          .mermaid-control-hint,
          .mermaid-modal-backdrop {
            display: none !important;
          }
          .mermaid-container {
            transform: none !important;
            transition: none !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          .mermaid-container svg {
            max-height: none !important;
            max-width: 100% !important;
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
          }
          /* Ensure high contrast print colors */
          .mermaid-container .node rect {
            filter: none !important;
          }
        }
      `}</style>

      {parsedPieData ? (
        <div className="group/donut relative w-full">
          <DonutChart
            title={parsedPieData.title}
            data={parsedPieData.data}
            colors={parsePieColors(currentChart, DEFAULT_COLORS)}
            onSparklesClick={
              onChartChange ? () => setIsAiModalOpen(true) : undefined
            }
          />
        </div>
      ) : (
        <div
          ref={viewportRef}
          className="mermaid-interactive-viewport group select-none"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          {/* Info: (20260615 - Julian) 浮動工具列 */}
          <div className="mermaid-control-btn absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1.5 opacity-90 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
            {/* Info: (20260622 - Julian) AI 指令 */}
            {onChartChange && (
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="shrink-0 cursor-pointer rounded-md p-1.5 text-blue-600 transition-colors duration-150 hover:bg-slate-100"
                title="AI 智慧編輯 (AI Chart Editor)"
              >
                <Sparkles size={16} />
              </button>
            )}
            {/* Info: (20260615 - Julian) 下載選單 */}
            <div className="group/download relative shrink-0">
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-md p-1.5 text-orange-600 transition-colors duration-150 hover:bg-slate-100"
                title={t("chart.mermaid.download")!}
              >
                <Download size={16} />
              </button>
              <div className="absolute top-full right-0 z-20 hidden w-20 flex-col pt-1 group-hover/download:flex">
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
            <button
              type="button"
              onClick={zoomIn}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
              title={t("chart.mermaid.zoom_in")!}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
              title={t("chart.mermaid.zoom_out")!}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
              title={t("chart.mermaid.reset")!}
            >
              <Maximize size={16} />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
              title={t("chart.mermaid.fullscreen")!}
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Info: (20260615 - Julian) 操作提示 */}
          <div className="mermaid-control-hint pointer-events-none absolute bottom-2 left-3 text-[10px] font-medium text-slate-400">
            {t("chart.mermaid.hint_desktop")}
          </div>

          {/* Info: (20260615 - Julian) 可 transform 的 SVG 容器 */}
          <div
            className="mermaid-container flex h-full w-full items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging
                ? "none"
                : "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
        </div>
      )}

      {/* Info: (20260615 - Julian) 全螢幕預覽 */}
      {isFullscreen && (
        <div
          ref={modalRef}
          className="mermaid-modal-backdrop fixed inset-0 z-9999 flex items-center justify-center bg-slate-300 p-6 backdrop-blur-md select-none"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          {/* Info: (20260615 - Julian) 全螢幕 Header */}
          <div className="absolute top-4 left-6 z-10 flex items-center gap-2 font-medium text-slate-900">
            <span className="h-5 w-1 rounded-sm bg-[#FF9800]"></span>
            <span>{t("chart.mermaid.preview_title")}</span>
          </div>

          {/* Info: (20260615 - Julian) 全螢幕 Toolbar */}
          <div className="mermaid-control-btn absolute top-4 right-6 z-10 flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-2.5 py-2 shadow-lg">
            {/* Info: (20260622 - Julian) AI 指令 */}
            {onChartChange && (
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="cursor-lg shrink-0 rounded-lg p-1.5 text-blue-400 transition-colors duration-150 hover:bg-slate-700"
                title="AI 智慧編輯 (AI Chart Editor)"
              >
                <Sparkles size={20} />
              </button>
            )}
            {/* Info: (20260615 - Julian) 下載選單 */}
            <div className="group/download relative shrink-0">
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-lg p-1.5 text-orange-300 transition-colors duration-150 hover:bg-slate-500"
                title={t("chart.mermaid.download")!}
              >
                <Download size={20} />
              </button>
              <div className="absolute top-full right-0 z-20 hidden w-24 flex-col pt-1.5 group-hover/download:flex">
                <div className="flex flex-col rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={exportPng}
                    className="w-full px-3 py-2 text-left text-sm font-bold text-slate-300 transition-colors hover:bg-slate-500 hover:text-white"
                  >
                    {t("chart.mermaid.export_png")}
                  </button>
                  <button
                    type="button"
                    onClick={exportSvg}
                    className="w-full px-3 py-2 text-left text-sm font-bold text-slate-300 transition-colors hover:bg-slate-500 hover:text-white"
                  >
                    {t("chart.mermaid.export_svg")}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={zoomIn}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-slate-500"
              title={t("chart.mermaid.zoom_in")!}
            >
              <ZoomIn size={20} />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-slate-500"
              title={t("chart.mermaid.zoom_out")!}
            >
              <ZoomOut size={20} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-slate-500"
              title={t("chart.mermaid.reset")!}
            >
              <Maximize size={20} />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="ml-1 shrink-0 cursor-pointer rounded-lg border-l border-slate-700 p-1.5 pl-2 text-rose-400 transition-colors duration-150 hover:bg-slate-500 hover:text-rose-300"
              title={t("chart.mermaid.close_fullscreen")!}
            >
              <Minimize2 size={20} />
            </button>
          </div>

          {/* Info: (20260615 - Julian) 全螢幕操作提示 */}
          <div className="absolute bottom-4 left-6 text-xs text-slate-600">
            {t("chart.mermaid.hint_fullscreen")}
          </div>

          {/* Info: (20260615 - Julian) 可 transform 的 SVG 容器 */}
          <div
            className="mermaid-container flex h-full w-full items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging
                ? "none"
                : "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
        </div>
      )}

      {/* Info: (20260623 - Julian) AI 智慧編輯 Modal */}
      <MermaidAiModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentChart={currentChart}
        chartType={chartType}
        parsedNodes={parsedNodes}
        parsedPieItems={parsedPieItems}
        svgStr={svgStr}
        parsedPieData={parsedPieData}
        onAdopt={handleAdopt}
      />
    </div>
  );
};

export { MermaidChart };
