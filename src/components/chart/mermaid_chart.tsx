"use client";

import { useEffect, useState, useMemo, FC } from "react";
import mermaid from "mermaid";
import { DonutChart } from "@/components/common/donut_chart";
import { useTranslation } from "@/i18n/i18n_context";
import { ChartShell } from "@/components/chart/chart_shell";
import { MermaidAiModal } from "@/components/chart/mermaid_ai_modal";
import {
  detectChartType,
  parsePieData,
  getChartTitle,
} from "@/lib/utils/mermaid_helpers";
import { renderMermaid } from "@/lib/utils/mermaid_render";
import { MermaidChartType } from "@/constants/mermaid_chart";
import { useChartPalette } from "@/hooks/use_chart_palette";

interface IMermaidChartProps {
  chart: string;
  onChartChange?: (newChart: string) => void;
}

// Info: (20260720 - Julian) Mermaid 縮放範圍（沿用原本手感，較自訂圖表大）
const MERMAID_MIN_SCALE = 0.5;
const MERMAID_MAX_SCALE = 4;
const MERMAID_WHEEL_STEP = 0.05;

const MermaidChart: FC<IMermaidChartProps> = ({
  chart,
  onChartChange = undefined,
}) => {
  const { t } = useTranslation();
  /**
   * Info: (20260802 - Luphia) Mermaid 吃設定物件而非 CSS，顏色必須是實值。
   * 主題一變 palette 就換一組，下方的 effect 會據此重新渲染整張圖。
   *
   * Info: (20260803 - Tzuhan) 從外層 wrapper 解析而非 document.documentElement。
   * 紙張預覽的 A4 容器帶 .theme-static-light，深色模式下其內部為淺色；
   * 從 <html> 讀會讓白紙上的流程圖套用深色調色盤。
   * 用 state 回呼 ref 而非 useRef：useChartPalette 的 effect 相依是
   * [resolved, element]，ref 物件的 .current 變動不會觸發重讀。
   */
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const palette = useChartPalette(node);

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

  // Info: (20260720 - Julian) 下載檔名跟隨圖表標題；無標題則退回預設
  const exportFileName = useMemo(
    () => getChartTitle(currentChart).trim() || "mermaid-chart",
    [currentChart],
  );

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

        /**
         * Info: (20260802 - Luphia) 流程圖配色。Mermaid 吃的是設定物件而非 CSS，
         * 所以顏色在此由 palette 帶入實值 —— 節點底、文字、邊框在深色模式整組翻轉，
         * 否則會是白底深藍字的節點浮在深色頁面上。
         * 連線色（琥珀）兩種主題共用，實測深色卡片上 8.16。
         */
        primaryColor: palette.nodeSurface,
        primaryTextColor: palette.nodeText,
        primaryBorderColor: palette.series1,
        lineColor: palette.series2,
        secondaryColor: palette.nodeSurfaceAlt,
        tertiaryColor: palette.nodeSurface,
        mainBkg: palette.nodeSurface,
        nodeBorder: palette.series1,
        clusterBkg: palette.nodeSurface,
        clusterBorder: palette.grid,
        defaultLinkColor: palette.series2,
        titleColor: palette.nodeText,
        // Info: (20260615 - Julian) 節點標籤底色（淺橘色）
        edgeLabelBackground: palette.edgeLabel,
        nodeTextColor: palette.nodeText,

        // Info: (20260418 - Tzuhan) Vibrant Palette for Pie Charts
        /**
         * Info: (20260802 - Luphia) 十色類別色板。深色下僅 pie1 靛藍需要處理 ——
         * 原色 #4F46E5 對深色卡片只有 2.8，與底色糊在一起；其餘九色 4.2～8.9 維持原值。
         * 沒有整組提亮，是因為那會改變十色之間的相互辨識度，而我無法在此驗證。
         */
        pie1: palette.categorical1,
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
        pieTitleTextColor: palette.value,
        pieSectionTextSize: "15px",
        // Info: (20260802 - Luphia) 圓餅區塊本身在兩種主題下都是鮮豔色，標籤維持白字
        pieSectionTextColor: "#FFFFFF",
        pieLegendTextSize: "14px",
        pieLegendTextColor: palette.label,
        pieStrokeColor: palette.nodeSurface,
        pieStrokeWidth: "3px",
        pieOuterStrokeWidth: "0px",
        pieOuterStrokeColor: "transparent",
        pieOpacity: "0.95",
      },
      securityLevel: "loose",
      // Info: (20260722 - Julian) 關閉 Mermaid 內建的錯誤爆炸圖注入，改由本元件 hasError 退回原始 code block
      suppressErrorRendering: true,
    });

    const renderChart = async () => {
      const trimmedChart = currentChart.trim();
      if (!trimmedChart) {
        if (isCurrent) {
          setSvgStr("");
          setHasError(false);
        }
        return;
      }

      // Info: (20260708 - Julian) 檢查是否具備 Mermaid 定義頭部，防止 UnknownDiagramError
      const type = detectChartType(trimmedChart);
      if (type === MermaidChartType.UNKNOWN) {
        console.warn("Unknown diagram type detected, skipping render");
        if (isCurrent) {
          setHasError(true);
        }
        return;
      }

      /**
       * Info: (20260722 - Julian) 渲染前先以 parse 驗證語法
       * suppressErrors 讓解析失敗回傳 false ，退回原始 code block，而非拋錯或注入爆炸圖
       * Info: (20260805 - Julian) Sankey 例外：其文法只認 ASCII，含中文節點需先由 renderMermaid 做 ASCII 別名，
       * 若在此拿原始（含 CJK）字串直接 parse 會誤判為語法錯，故 Sankey 跳過本護欄，交由下方 renderMermaid 的 try/catch 處理
       */
      if (type !== MermaidChartType.SANKEY) {
        try {
          const parseResult = await mermaid.parse(trimmedChart, {
            suppressErrors: true,
          });
          if (!parseResult) {
            if (isCurrent) {
              setHasError(true);
            }
            return;
          }
        } catch (error) {
          console.error("Mermaid parse failed", error);
          if (isCurrent) {
            setHasError(true);
          }
          return;
        }
      }

      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await renderMermaid(id, trimmedChart);

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
    // Info: (20260802 - Luphia) palette 進相依：主題切換時整張圖要以新色重畫
  }, [currentChart, parsedPieData, palette]);

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
    <div
      ref={setNode}
      className="relative w-full break-inside-avoid print:break-inside-avoid"
    >
      <style>{`
        /* 1. Subgraph Clusters Styling */
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
        .mermaid-container .node circle,
        .mermaid-container .node polygon,
        .mermaid-container .node path,
        .mermaid-container .node .label-container {
          fill: #ffffff !important;
          stroke: #152C5B !important;
          stroke-width: 1.5px !important;
          filter: drop-shadow(0px 2px 4px rgba(21, 44, 91, 0.05)) !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .mermaid-container .node rect {
          rx: 4px !important;
          ry: 4px !important;
        }

        /* Hover Node Styling on interactive screen */
        @media screen {
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

        /* 6. SVG responsiveness inside the shared shell */
        @media screen {
          .mermaid-container svg {
            max-width: 95% !important;
            max-height: 95% !important;
            width: auto !important;
            height: auto !important;
            margin: 0 auto;
            pointer-events: none; /* Let dragging bubble to the shell viewport */
          }
          .mermaid-container svg * {
            pointer-events: auto; /* Re-enable for node hover */
          }
        }

        @media print {
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
            onSparklesClick={
              onChartChange ? () => setIsAiModalOpen(true) : undefined
            }
          />
        </div>
      ) : (
        <ChartShell
          openAiModal={() => setIsAiModalOpen(true)}
          exportFileName={exportFileName}
          contentClassName="mermaid-container"
          fullscreenTitle={t("chart.mermaid.preview_title") ?? undefined}
          minScale={MERMAID_MIN_SCALE}
          maxScale={MERMAID_MAX_SCALE}
          wheelStep={MERMAID_WHEEL_STEP}
        >
          <div
            className="flex h-full w-full items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
        </ChartShell>
      )}

      {/* Info: (20260623 - Julian) AI 智慧編輯 Modal */}
      <MermaidAiModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentChart={currentChart}
        chartType={chartType}
        onAdopt={handleAdopt}
      />
    </div>
  );
};

export { MermaidChart };
