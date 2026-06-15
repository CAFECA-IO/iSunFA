"use client";

import { useEffect, useState, useMemo, FC, useRef } from "react";
import mermaid from "mermaid";
import { DonutChart, IDonutChartData } from "@/components/common/donut_chart";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from "lucide-react";

interface IMermaidChartProps {
  chart: string;
}

interface IPosition {
  x: number;
  y: number;
}

const MermaidChart: FC<IMermaidChartProps> = ({ chart }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [svgStr, setSvgStr] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);

  // Info: (20260615 - Julian) 縮放與位移狀態
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<IPosition>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<IPosition>({
    x: 0,
    y: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Info: (20260418 - Tzuhan) Intercept Mermaid Pie charts and render using our premium Recharts Donut instead
  const parsedPieData = useMemo(() => {
    if (!chart || typeof chart !== "string") return null;
    const cleanChart = chart.trim();
    if (!cleanChart.startsWith("pie")) return null;

    const lines = cleanChart.split("\n");
    let title = "";
    const data: IDonutChartData[] = [];

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("pie title")) {
        title = cleanLine.replace("pie title", "").trim();
      } else if (cleanLine.includes(":")) {
        const parts = cleanLine.split(":");
        if (parts.length >= 2) {
          let name = parts[0].trim();
          if (name.startsWith('"') && name.endsWith('"')) {
            name = name.slice(1, -1);
          }
          // Info: (20260418 - Tzuhan) Use the last part as value, in case there are multiple colons
          const valueStr = parts[parts.length - 1].trim();
          const value = parseFloat(valueStr.replace("%", ""));
          if (!isNaN(value)) {
            data.push({ name, value });
          }
        }
      }
    });

    if (data.length > 0) {
      return { title, data };
    }
    return null;
  }, [chart]);

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
        const { svg } = await mermaid.render(id, chart);

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

    if (chart && typeof window !== "undefined") {
      renderChart();
    }

    return () => {
      isCurrent = false; // Info: (20260615 - Julian) 清除 isCurrent（組件卸載或依賴更新時）
    };
  }, [chart, parsedPieData]);

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
  }, [isFullscreen]);

  // Info: (20260615 - Julian) 按下 ESC 鍵退出全螢幕
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const zoomIn = (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    setScale((prev) => Math.min(4, prev + 0.15));
  };

  const zoomOut = (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    setScale((prev) => Math.max(0.5, prev - 0.15));
  };

  const resetZoom = (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    setIsFullscreen((prev) => !prev);
    // Info: (20260615 - Julian) 重置尺寸與位移
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Info: (20260615 - Julian) 綁定 Viewport 事件，避免 JSX-a11y 警告
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleMouseDownNative = (e: MouseEvent) => {
      if (e.button !== 0) return; // Info: (20260615 - Julian) 僅允許左鍵
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    };

    const handleMouseMoveNative = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUpNative = () => {
      setIsDragging(false);
    };

    const handleMouseLeaveNative = () => {
      setIsDragging(false);
    };

    const handleDoubleClickNative = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      resetZoom();
    };

    viewport.addEventListener("mousedown", handleMouseDownNative);
    viewport.addEventListener("mousemove", handleMouseMoveNative);
    viewport.addEventListener("mouseup", handleMouseUpNative);
    viewport.addEventListener("mouseleave", handleMouseLeaveNative);
    viewport.addEventListener("dblclick", handleDoubleClickNative);

    return () => {
      viewport.removeEventListener("mousedown", handleMouseDownNative);
      viewport.removeEventListener("mousemove", handleMouseMoveNative);
      viewport.removeEventListener("mouseup", handleMouseUpNative);
      viewport.removeEventListener("mouseleave", handleMouseLeaveNative);
      viewport.removeEventListener("dblclick", handleDoubleClickNative);
    };
  }, [position, isDragging, dragStart]); // Info: (20260615 - Julian) 重新綁定事件

  // Info: (20260615 - Julian) 綁定 Modal 事件，避免 JSX-a11y 警告
  useEffect(() => {
    if (!isFullscreen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const handleMouseDownNative = (e: MouseEvent) => {
      if (e.button !== 0) return; // Info: (20260615 - Julian) 僅允許左鍵
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    };

    const handleMouseMoveNative = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUpNative = () => {
      setIsDragging(false);
    };

    const handleMouseLeaveNative = () => {
      setIsDragging(false);
    };

    const handleDoubleClickNative = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".mermaid-control-btn")) return;
      resetZoom();
    };

    modal.addEventListener("mousedown", handleMouseDownNative);
    modal.addEventListener("mousemove", handleMouseMoveNative);
    modal.addEventListener("mouseup", handleMouseUpNative);
    modal.addEventListener("mouseleave", handleMouseLeaveNative);
    modal.addEventListener("dblclick", handleDoubleClickNative);

    return () => {
      modal.removeEventListener("mousedown", handleMouseDownNative);
      modal.removeEventListener("mousemove", handleMouseMoveNative);
      modal.removeEventListener("mouseup", handleMouseUpNative);
      modal.removeEventListener("mouseleave", handleMouseLeaveNative);
      modal.removeEventListener("dblclick", handleDoubleClickNative);
    };
  }, [isFullscreen, position, isDragging, dragStart]);

  if (parsedPieData) {
    return <DonutChart title={parsedPieData.title} data={parsedPieData.data} />;
  }

  if (hasError) {
    return (
      <div className="my-4 overflow-x-auto rounded-md border border-red-500/30 bg-[#1E1E1E] p-4 text-sm">
        <p className="mb-2 font-semibold text-red-500">Mermaid Syntax Error</p>
        <pre className="whitespace-pre-wrap text-gray-300">{chart}</pre>
      </div>
    );
  }

  if (!svgStr) {
    return (
      <div className="my-6 flex animate-pulse justify-center p-10 text-gray-500">
        Rendering Chart...
      </div>
    );
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

      {/* Info: (20260615 - Julian) 互動式視窗容器 */}
      <div
        ref={viewportRef}
        className="mermaid-interactive-viewport group select-none"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        {/* Info: (20260615 - Julian) 浮動工具列 */}
        <div className="mermaid-control-btn absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1.5 opacity-90 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={zoomIn}
            className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
            title="放大 (Zoom In)"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
            title="縮小 (Zoom Out)"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
            title="重設 (Reset)"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100"
            title="全螢幕 (Fullscreen)"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Info: (20260615 - Julian) 操作提示 */}
        <div className="mermaid-control-hint pointer-events-none absolute bottom-2 left-3 text-[10px] font-medium text-slate-400">
          按住左鍵拖曳平移 • Ctrl + 滾輪縮放
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
            <span>流程圖預覽 (Fullscreen Flowchart Preview)</span>
          </div>

          {/* Info: (20260615 - Julian) 全螢幕 Toolbar */}
          <div className="mermaid-control-btn absolute top-4 right-6 z-10 flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-2.5 py-2 shadow-lg">
            <button
              type="button"
              onClick={zoomIn}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-slate-700"
              title="放大 (Zoom In)"
            >
              <ZoomIn size={20} />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-slate-700"
              title="縮小 (Zoom Out)"
            >
              <ZoomOut size={20} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-slate-700"
              title="重設 (Reset)"
            >
              <RotateCcw size={20} />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="ml-1 shrink-0 cursor-pointer rounded-lg border-l border-slate-700 p-1.5 pl-2 text-rose-400 transition-colors duration-150 hover:bg-slate-700 hover:text-rose-300"
              title="關閉全螢幕 (Close Fullscreen)"
            >
              <Minimize2 size={20} />
            </button>
          </div>

          {/* Info: (20260615 - Julian) 全螢幕操作提示 */}
          <div className="absolute bottom-4 left-6 text-xs text-slate-600">
            按住左鍵拖曳平移 • 滾輪縮放 • 按 ESC 鍵關閉
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
    </div>
  );
};

export { MermaidChart };
