"use client";

import { FC, useMemo, useState } from "react";
import {
  DEFAULT_HISTOGRAM_TREND_COLOR,
  HistogramTrendType,
} from "@/constants/custom_chart";
import { useChartPalette } from "@/hooks/use_chart_palette";
import { ICustomHistogramBin } from "@/interfaces/custom_chart";

/**
 * Info: (20260810 - Julian) 直方圖的純繪圖層。只吃已分箱的 (label, count)。
 * 從 `histogram_chart` 抽出，幾何改成帶預設值的 props：
 * 不傳就是原本的報表尺寸，窄容器則傳一組緊湊的值。
 */

// Info: (20260720 - Julian) 報表／PDF 畫布的預設版面，數值沿用重構前的常數
const DEFAULT_VIEW_WIDTH = 720;
const DEFAULT_VIEW_HEIGHT = 460;
const DEFAULT_MARGIN_TOP = 56; // Info: (20260720 - Julian) 標題
const DEFAULT_MARGIN_BOTTOM = 76; // Info: (20260720 - Julian) x 軸分箱標籤 + 軸標題
const DEFAULT_MARGIN_LEFT = 72; // Info: (20260720 - Julian) y 軸刻度 + 軸標題
const DEFAULT_MARGIN_RIGHT = 32;
const DEFAULT_TICK_COUNT = 4; // Info: (20260720 - Julian) y 軸目標刻度數（實際依 nice step 微調）
const DEFAULT_ROTATE_SLOT_WIDTH = 56; // Info: (20260720 - Julian) 每格寬度小於此值時 x 標籤旋轉避免重疊
const DEFAULT_LABEL_FONT_SIZE = 12;
const DEFAULT_TITLE_FONT_SIZE = 18;

const SLOT_GAP = 0; // Info: (20260720 - Julian) 相鄰長條間距（直方圖不留間距）
const TREND_SAMPLES = 120; // Info: (20260720 - Julian) 曲線取樣點數（越多越平滑）

/** Info: (20260810 - Julian) 版面幾何。全部選填，不傳即報表尺寸 */
export interface IHistogramCanvasLayout {
  viewWidth?: number;
  viewHeight?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  tickCount?: number;
  rotateSlotWidth?: number;
  /** Info: (20260810 - Julian) 字級以 viewBox 為單位，因此縮放比越接近 1 越接近實際 px */
  labelFontSize?: number;
  titleFontSize?: number;
}

export interface IHistogramCanvasProps extends IHistogramCanvasLayout {
  bins: ICustomHistogramBin[];
  title?: string;
  xAxis?: string;
  yAxis?: string;
  trend?: HistogramTrendType;
  trendColor?: string;
}

// Info: (20260720 - Julian) 數值格式化（千分位、最多三位小數），避免浮點雜訊
const formatValue = (n: number): string =>
  n.toLocaleString(undefined, { maximumFractionDigits: 3 });

/**
 * Info: (20260720 - Julian)
 * 取「漂亮」的刻度數字（1/2/5 × 10^n）。round=true 取最接近、否則取不小於的級距。
 * 純幾何呈現用途；parser 不做任何數值計算。
 */
const niceNum = (range: number, round: boolean): number => {
  const safe = range > 0 ? range : 1;
  const exp = Math.floor(Math.log10(safe));
  const frac = safe / 10 ** exp;
  let nf: number;
  if (round) {
    nf = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  } else {
    nf = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  }
  return nf * 10 ** exp;
};

const HistogramCanvas: FC<IHistogramCanvasProps> = ({
  bins,
  title = undefined,
  xAxis = undefined,
  yAxis = undefined,
  trend = undefined,
  trendColor = undefined,
  viewWidth = DEFAULT_VIEW_WIDTH,
  viewHeight = DEFAULT_VIEW_HEIGHT,
  marginTop = DEFAULT_MARGIN_TOP,
  marginRight = DEFAULT_MARGIN_RIGHT,
  marginBottom = DEFAULT_MARGIN_BOTTOM,
  marginLeft = DEFAULT_MARGIN_LEFT,
  tickCount = DEFAULT_TICK_COUNT,
  rotateSlotWidth = DEFAULT_ROTATE_SLOT_WIDTH,
  labelFontSize = DEFAULT_LABEL_FONT_SIZE,
  titleFontSize = DEFAULT_TITLE_FONT_SIZE,
}) => {
  /**
   * Info: (20260802 - Luphia) 顏色從 CSS 變數讀出實值再寫進 SVG 屬性。
   * 不能直接在屬性寫 var()：匯出 SVG 會把節點 clone 出文件再序列化，
   * 那份檔案解不到變數，下載到的圖會沒有顏色（見 use_chart_palette）。
   */
  /**
   * Info: (20260803 - Tzuhan) 從自己的節點解析調色盤，不要讓 useChartPalette
   * 退回 document.documentElement。紙張預覽（PDF 編輯器、/share/pdf/[token]）的
   * A4 容器帶 .theme-static-light，深色模式下它內部是淺色的；從 <html> 讀會拿到
   * 深色值，於是白紙上出現淺灰座標軸與深色分隔線。use_chart_export 已經是從
   * 容器讀背景色，兩邊不一致時匯出的 PNG 會是淺底配深色模式的線條。
   * 用 state 回呼 ref 而非 useRef：useChartPalette 的 effect 相依是 [resolved, element]，
   * ref 物件的 .current 變動不會觸發重讀。
   */
  const [node, setNode] = useState<SVGSVGElement | null>(null);
  const palette = useChartPalette(node);

  const plotLeft = marginLeft;
  const plotRight = viewWidth - marginRight;
  const plotTop = marginTop;
  const plotBottom = viewHeight - marginBottom;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  // Info: (20260730 - Julian) 趨勢線色：DSL 指定優先，否則採預設色
  const trendStroke = trendColor ?? DEFAULT_HISTOGRAM_TREND_COLOR;

  // Info: (20260720 - Julian)
  // 常態趨勢線的加權統計（以「分箱序號 index」為 x、count 為權重，決定論計算）。
  // 用序號而非解析標籤數值，避免對非數值標籤做臆測；純呈現輔助，不改資料。
  const normalStats = useMemo(() => {
    if (trend !== HistogramTrendType.NORMAL) return null;
    const total = bins.reduce((sum, b) => sum + b.count, 0);
    if (total <= 0) return null;
    const mean = bins.reduce((sum, b, i) => sum + i * b.count, 0) / total;
    const variance =
      bins.reduce((sum, b, i) => sum + b.count * (i - mean) ** 2, 0) / total;
    const std = Math.sqrt(variance);
    if (std <= 0) return null; // Info: (20260720 - Julian) 無離散度（單箱）不畫曲線
    // Info: (20260720 - Julian) 以 count 尺度呈現：期望次數 = total × pdf(index)，峰值於 mean
    const peak = total / (std * Math.sqrt(2 * Math.PI));
    return { total, mean, std, peak };
  }, [trend, bins]);

  // Info: (20260720 - Julian) y 軸刻度：涵蓋最大 count 與趨勢線峰值，推導 nice 上限與級距
  const { niceMax, step } = useMemo(() => {
    const rawMax = Math.max(
      1,
      ...bins.map((b) => b.count),
      normalStats?.peak ?? 0,
    );
    const stepValue = niceNum(rawMax / tickCount, true);
    const max = Math.ceil(rawMax / stepValue) * stepValue;
    return { niceMax: max, step: stepValue };
  }, [bins, normalStats, tickCount]);

  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let v = 0; v <= niceMax + step / 2; v += step) list.push(v);
    return list;
  }, [niceMax, step]);

  const toY = (count: number): number =>
    plotBottom - (count / niceMax) * plotHeight;

  const slotW = plotWidth / bins.length;
  const barW = Math.max(1, slotW - SLOT_GAP);
  const rotateLabels = slotW < rotateSlotWidth;

  // Info: (20260720 - Julian)
  // 常態曲線路徑：index 域 [-0.5, n-0.5] 對映繪圖區左右緣，逐點取樣後連成平滑折線。
  const trendPath = useMemo(() => {
    if (!normalStats) return null;
    const { mean, std, peak } = normalStats;
    const n = bins.length;
    const points: string[] = [];
    for (let s = 0; s <= TREND_SAMPLES; s += 1) {
      const xi = -0.5 + (s / TREND_SAMPLES) * n;
      const screenX = plotLeft + ((xi + 0.5) / n) * plotWidth;
      const count = peak * Math.exp(-((xi - mean) ** 2) / (2 * std ** 2));
      const y = plotBottom - (count / niceMax) * plotHeight;
      points.push(`${screenX.toFixed(2)},${y.toFixed(2)}`);
    }
    return `M${points.join(" L")}`;
  }, [
    normalStats,
    bins.length,
    niceMax,
    plotLeft,
    plotWidth,
    plotBottom,
    plotHeight,
  ]);

  return (
    // Info: (20260720 - Julian) 外層灰底縮放平移容器由 ChartShell 提供，此處只回傳 SVG
    <svg
      ref={setNode}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title ?? "Histogram"}
    >
      {/* Info: (20260720 - Julian) hover：長條轉橘 + count 標籤上色（僅螢幕，避免列印殘影） */}
      <style>{`
        .histo-bar { cursor: pointer; }
        .histo-bar rect { transition: fill 0.15s ease; }
        @media screen {
          .histo-bar:hover rect { fill: #FF9800; }
          .histo-bar:hover .histo-count { fill: #EA580C; font-weight: 700; }
        }
      `}</style>

      {title && (
        <text
          x={viewWidth / 2}
          y={32}
          textAnchor="middle"
          className="fill-slate-800"
          fontSize={titleFontSize}
          fontWeight={700}
        >
          {title}
        </text>
      )}

      {/* Info: (20260720 - Julian) y 軸刻度線 + 刻度值（淺色網格） */}
      {ticks.map((t) => {
        const y = toY(t);
        return (
          <g key={`histo-tick-${t}`}>
            <line
              x1={plotLeft}
              y1={y}
              x2={plotRight}
              y2={y}
              stroke={palette.grid}
              strokeWidth={1}
            />
            <text
              x={plotLeft - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400"
              fontSize={labelFontSize}
            >
              {formatValue(t)}
            </text>
          </g>
        );
      })}

      {/* Info: (20260720 - Julian) 軸線 */}
      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotBottom}
        stroke={palette.axis}
        strokeWidth={1.5}
      />
      <line
        x1={plotLeft}
        y1={plotBottom}
        x2={plotRight}
        y2={plotBottom}
        stroke={palette.axis}
        strokeWidth={1.5}
      />

      {/* Info: (20260720 - Julian) 各分箱長條 + count 標籤 + x 標籤 */}
      {bins.map((bin, idx) => {
        const slotX = plotLeft + idx * slotW;
        const barX = slotX + (slotW - barW) / 2;
        const barTop = toY(bin.count);
        const barCenterX = slotX + slotW / 2;
        const barH = Math.max(0, plotBottom - barTop);

        return (
          <g key={`histo-bar-${idx}`} className="histo-bar">
            {barH > 0.5 && (
              <rect
                x={barX}
                y={barTop}
                width={barW}
                height={barH}
                fill={palette.series1}
                rx={2}
              />
            )}
            {/* Info: (20260720 - Julian) count 值（長條頂端上方） */}
            <text
              x={barCenterX}
              y={barTop - 6}
              textAnchor="middle"
              className="histo-count fill-slate-500"
              fontSize={labelFontSize}
              fontWeight={600}
            >
              {formatValue(bin.count)}
            </text>
            {/* Info: (20260720 - Julian) x 分箱標籤（過密則旋轉） */}
            {rotateLabels ? (
              <text
                transform={`translate(${barCenterX + 20}, ${plotBottom + 14}) rotate(-35)`}
                textAnchor="end"
                className="histo-count fill-slate-600"
                fontSize={labelFontSize}
              >
                {bin.label}
              </text>
            ) : (
              <text
                x={barCenterX}
                y={plotBottom + 20}
                textAnchor="middle"
                className="histo-count fill-slate-600"
                fontSize={labelFontSize}
              >
                {bin.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Info: (20260720 - Julian) 常態趨勢線 */}
      {trendPath && (
        <path
          d={trendPath}
          fill="none"
          stroke={trendStroke}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Info: (20260720 - Julian) x 軸標題 */}
      {xAxis && (
        <text
          x={plotLeft + plotWidth / 2}
          y={viewHeight - 12}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize={labelFontSize}
          fontWeight={600}
        >
          {xAxis}
        </text>
      )}

      {/* Info: (20260720 - Julian) y 軸標題（沿軸旋轉） */}
      {yAxis && (
        <text
          transform={`translate(20, ${plotTop + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize={labelFontSize}
          fontWeight={600}
        >
          {yAxis}
        </text>
      )}
    </svg>
  );
};

export { HistogramCanvas };
