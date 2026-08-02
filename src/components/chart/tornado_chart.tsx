"use client";

import { FC, useMemo } from "react";
import { ICustomTornadoAst } from "@/interfaces/custom_chart";
import { TornadoMode } from "@/constants/custom_chart";
import { useChartPalette } from "@/hooks/use_chart_palette";

interface ITornadoChartProps {
  ast: ICustomTornadoAst;
}

// Info: (20260720 - Julian) SVG 版面常數（固定寬度；高度依 bar 數動態計算）
const VIEW_W = 720;
const VAR_LABEL_X = 150; // Info: (20260720 - Julian) 項目名稱欄
const MARGIN_TOP = 56; // Info: (20260720 - Julian) 標題 + 單位標籤
const MARGIN_BOTTOM = 44; // Info: (20260720 - Julian) 底部圖例列空間
const ROW_H = 38;
const BAR_H = 22;
const LEGEND_SWATCH = 12; // Info: (20260720 - Julian) 圖例色塊邊長
// Info: (20260720 - Julian) 兩側各保留固定間隙給端點數值標籤，避免最寬 bar 壓到項目名或超出邊界
const PLOT_LEFT = 128;
const PLOT_RIGHT = VIEW_W - 56;
const CENTER_X = (PLOT_LEFT + PLOT_RIGHT) / 2;
const HALF_W = (PLOT_RIGHT - PLOT_LEFT) / 2;

// Info: (20260723 - Julian) 敏感度型（絕對值軸）繪圖區：左留類別欄與 lo 標籤、右留 hi 標籤空間
const SENS_PLOT_LEFT = 220;
const SENS_PLOT_RIGHT = VIEW_W - 84;

// Info: (20260720 - Julian) 兩數列配色（沿用設計系統色）：左=深藍、右=橘

// Info: (20260720 - Julian) 數值標籤：內嵌 / 外置的字寬估算與配色
const CHAR_W = 6.5; // Info: (20260720 - Julian) fontSize 11 下每字元約略寬度（含逗號）
const LABEL_PAD = 4; // Info: (20260720 - Julian) 數值標籤與長條端點間距（越小越貼近）

// Info: (20260720 - Julian) 數值格式化（千分位、最多三位小數），避免浮點雜訊
const formatValue = (n: number): string =>
  n.toLocaleString(undefined, { maximumFractionDigits: 3 });

const TornadoChart: FC<ITornadoChartProps> = ({ ast }) => {
  /**
   * Info: (20260802 - Luphia) 顏色從 CSS 變數讀出實值再寫進 SVG 屬性。
   * 不能直接在屬性寫 var()：匯出 SVG 會把節點 clone 出文件再序列化，
   * 那份檔案解不到變數，下載到的圖會沒有顏色（見 use_chart_palette）。
   */
  const palette = useChartPalette();

  const { title, unit, mode, baseline, leftSeries, rightSeries, bars } = ast;

  // Info: (20260723 - Julian) 敏感度型：中心＝基準值、兩側為 ±偏移；比較型：中心＝數列分隔線
  const isSensitivity = mode === TornadoMode.SENSITIVITY;

  // Info: (20260723 - Julian) 數列顏色：DSL 指定優先，否則採預設（左深藍、右橘）
  const colorLeft = ast.leftColor ?? palette.series1;
  const colorRight = ast.rightColor ?? palette.series2;

  // Info: (20260723 - Julian) 比較型頂端置中標籤：僅單位（敏感度型的基準改標於基準線上）
  const centerLabel = unit ? `單位：${unit}` : "";

  // Info: (20260720 - Julian) 依左右合計由大到小排序，呈現龍捲風收斂外型（渲染層職責，不動 AST）
  const sortedBars = useMemo(
    () => [...bars].sort((a, b) => b.left + b.right - (a.left + a.right)),
    [bars],
  );

  // Info: (20260720 - Julian) 對稱座標域：兩側共用同一比例尺，取所有數值最大者並留 8% 邊距
  const halfMax = useMemo(() => {
    const max = Math.max(0, ...bars.map((b) => Math.max(b.left, b.right)));
    return max > 0 ? max * 1.08 : 1;
  }, [bars]);

  // Info: (20260720 - Julian) 由數值換算長條長度（負值以 0 長度處理，數值仍照實顯示）
  const toLen = (v: number): number => (Math.max(0, v) / halfMax) * HALF_W;

  // Info: (20260723 - Julian) 敏感度型：每列取 [lo, hi]（悲觀/樂觀不論大小），依區間寬度由大到小排序（龍捲風收斂）
  const sensBars = useMemo(
    () =>
      [...bars]
        .map((b) => ({
          category: b.category,
          lo: Math.min(b.left, b.right),
          hi: Math.max(b.left, b.right),
        }))
        .sort((a, b) => b.hi - b.lo - (a.hi - a.lo)),
    [bars],
  );

  // Info: (20260723 - Julian) 絕對值軸域：涵蓋所有 lo/hi 與基準值，兩端各留 8% 邊距
  const sensDomain = useMemo(() => {
    if (sensBars.length === 0) return { min: 0, max: 1 };
    let min = Math.min(...sensBars.map((b) => b.lo));
    let max = Math.max(...sensBars.map((b) => b.hi));
    if (baseline !== undefined) {
      min = Math.min(min, baseline);
      max = Math.max(max, baseline);
    }
    const range = max - min || Math.abs(max) || 1;
    const pad = range * 0.08;
    return { min: min - pad, max: max + pad };
  }, [sensBars, baseline]);

  // Info: (20260723 - Julian) 敏感度型：實際數值 → 繪圖 x 座標
  const sx = (v: number): number =>
    SENS_PLOT_LEFT +
    ((v - sensDomain.min) / (sensDomain.max - sensDomain.min)) *
      (SENS_PLOT_RIGHT - SENS_PLOT_LEFT);

  // Info: (20260720 - Julian) 圖例項目：僅顯示有填名稱的數列；皆未填則不畫圖例、亦不留底部空間
  const legendItems = [
    leftSeries ? { name: leftSeries, color: colorLeft } : null,
    rightSeries ? { name: rightSeries, color: colorRight } : null,
  ].filter((item): item is { name: string; color: string } => item !== null);

  const plotBottom = MARGIN_TOP + sortedBars.length * ROW_H;
  const viewH = plotBottom + (legendItems.length > 0 ? MARGIN_BOTTOM : 16);

  // Info: (20260723 - Julian) 敏感度型（絕對值軸）：長條沿實際數值軸從 lo 畫到 hi，基準值以垂直參考線標於圖上
  if (isSensitivity) {
    const hasBaseline = baseline !== undefined;
    const baseX = baseline !== undefined ? sx(baseline) : 0;
    const sensViewH = plotBottom + (hasBaseline ? MARGIN_BOTTOM : 16);
    // Info: (20260723 - Julian) 圖例：以基準為界，低於基準／高於基準兩色（有設基準才顯示）
    const sensLegend = hasBaseline
      ? [
          { name: "低於基準", color: colorLeft },
          { name: "高於基準", color: colorRight },
        ]
      : [];

    return (
      <svg
        viewBox={`0 0 ${VIEW_W} ${sensViewH}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={title ?? "Sensitivity tornado chart"}
      >
        <style>{`
          .tornado-row rect { transition: opacity 0.15s ease; }
          @media screen {
            .tornado-row:hover rect { opacity: 0.7; }
            .tornado-row:hover .t-var { fill: #EA580C; font-weight: 700; }
          }
        `}</style>

        {title && (
          <text
            x={VIEW_W / 2}
            y={28}
            textAnchor="middle"
            className="fill-slate-800"
            fontSize={18}
            fontWeight={700}
          >
            {title}
          </text>
        )}

        {/* Info: (20260723 - Julian) 單位：置於頂端左側，避免與基準線標籤重疊 */}
        {unit && (
          <text
            x={SENS_PLOT_LEFT}
            y={MARGIN_TOP - 8}
            textAnchor="start"
            className="fill-slate-400"
            fontSize={12}
          >
            {`單位：${unit}`}
          </text>
        )}

        {/* Info: (20260723 - Julian) 基準垂直參考線 + 標籤（標於線上方） */}
        {baseline !== undefined && (
          <>
            <line
              x1={baseX}
              y1={MARGIN_TOP}
              x2={baseX}
              y2={plotBottom}
              stroke={palette.axis}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text
              x={baseX}
              y={MARGIN_TOP - 8}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize={11}
              fontWeight={600}
            >
              {`基準 ${formatValue(baseline)}`}
            </text>
          </>
        )}

        {sensBars.map((bar, idx) => {
          const rowY = MARGIN_TOP + idx * ROW_H;
          const barY = rowY + (ROW_H - BAR_H) / 2;
          const cY = rowY + ROW_H / 2;
          const loX = sx(bar.lo);
          const hiX = sx(bar.hi);

          /**
           * Info: (20260723 - Julian) 以基準切分區間：低於基準段用 colorLeft、高於基準段用 colorRight
           * 以繪圖座標比較（避免 baseline 可能為 undefined 的型別問題）
           */
          const segments: { x: number; w: number; fill: string }[] = [];
          if (hasBaseline && loX < baseX && baseX < hiX) {
            segments.push({ x: loX, w: baseX - loX, fill: colorLeft });
            segments.push({ x: baseX, w: hiX - baseX, fill: colorRight });
          } else {
            const aboveOnly = hasBaseline && loX >= baseX;
            segments.push({
              x: loX,
              w: hiX - loX,
              fill: aboveOnly ? colorRight : colorLeft,
            });
          }

          return (
            <g key={`sens-row-${idx}`} className="tornado-row">
              {segments.map(
                (s, si) =>
                  s.w > 0.5 && (
                    <rect
                      key={si}
                      x={s.x}
                      y={barY}
                      width={s.w}
                      height={BAR_H}
                      fill={s.fill}
                      rx={2}
                    />
                  ),
              )}
              <text
                x={VAR_LABEL_X}
                y={cY + 4}
                textAnchor="end"
                className="t-var fill-slate-700"
                fontSize={12}
                fontWeight={600}
              >
                {bar.category}
              </text>
              <text
                x={loX - LABEL_PAD}
                y={cY + 4}
                textAnchor="end"
                fill={palette.label}
                fontSize={11}
              >
                {formatValue(bar.lo)}
              </text>
              <text
                x={hiX + LABEL_PAD}
                y={cY + 4}
                textAnchor="start"
                fill={palette.label}
                fontSize={11}
              >
                {formatValue(bar.hi)}
              </text>
            </g>
          );
        })}

        {sensLegend.length > 0 &&
          (() => {
            const legendY = plotBottom + 24;
            const swatchTextGap = 6;
            const itemGap = 28;
            const cjkW = 8;
            const widths = sensLegend.map(
              (it) => LEGEND_SWATCH + swatchTextGap + it.name.length * cjkW,
            );
            const totalW =
              widths.reduce((sum, w) => sum + w, 0) +
              itemGap * (sensLegend.length - 1);
            const swatchY = legendY - LEGEND_SWATCH + 2;
            const starts: number[] = [];
            let cursor = (VIEW_W - totalW) / 2;
            for (const w of widths) {
              starts.push(cursor);
              cursor += w + itemGap;
            }
            return (
              <g>
                {sensLegend.map((it, i) => (
                  <g key={`sens-legend-${i}`}>
                    <rect
                      x={starts[i]}
                      y={swatchY}
                      width={LEGEND_SWATCH}
                      height={LEGEND_SWATCH}
                      fill={it.color}
                      rx={2}
                    />
                    <text
                      x={starts[i] + LEGEND_SWATCH + swatchTextGap}
                      y={legendY}
                      textAnchor="start"
                      className="fill-slate-500"
                      fontSize={12}
                    >
                      {it.name}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${viewH}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title ?? "Tornado chart"}
    >
      {/* Info: (20260720 - Julian) hover：bar 微亮 + 項目名高亮（不動內嵌數值字色，避免破壞對比） */}
      <style>{`
        .tornado-row rect { transition: opacity 0.15s ease; }
        @media screen {
          .tornado-row:hover rect { opacity: 0.7; }
          .tornado-row:hover .t-var { fill: #EA580C; font-weight: 700; }
        }
      `}</style>

      {title && (
        <text
          x={VIEW_W / 2}
          y={28}
          textAnchor="middle"
          className="fill-slate-800"
          fontSize={18}
          fontWeight={700}
        >
          {title}
        </text>
      )}

      {/* Info: (20260720 - Julian) 中心分隔線（左右數列的分界） */}
      <line
        x1={CENTER_X}
        y1={MARGIN_TOP}
        x2={CENTER_X}
        y2={plotBottom}
        stroke={palette.axis}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      {centerLabel && (
        <text
          x={CENTER_X}
          y={MARGIN_TOP - 8}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize={12}
        >
          {centerLabel}
        </text>
      )}

      {sortedBars.map((bar, idx) => {
        const rowY = MARGIN_TOP + idx * ROW_H;
        const barY = rowY + (ROW_H - BAR_H) / 2;
        const barCenterY = rowY + ROW_H / 2;

        const leftW = toLen(bar.left);
        const rightW = toLen(bar.right);
        const leftStart = CENTER_X - leftW; // Info: (20260720 - Julian) 左長條外端
        const rightEnd = CENTER_X + rightW; // Info: (20260720 - Julian) 右長條外端

        const leftLabel = formatValue(bar.left);
        const rightLabel = formatValue(bar.right);

        // Info: (20260720 - Julian) 自適應：長條夠寬則數值內嵌於外端（依底色配字色），否則外置
        const leftFits = leftW >= leftLabel.length * CHAR_W + LABEL_PAD * 2;
        const rightFits = rightW >= rightLabel.length * CHAR_W + LABEL_PAD * 2;

        return (
          <g key={`tornado-row-${idx}`} className="tornado-row">
            {/* Info: (20260720 - Julian) 左數列長條 */}
            {leftW > 0.5 && (
              <rect
                x={leftStart}
                y={barY}
                width={leftW}
                height={BAR_H}
                fill={colorLeft}
                rx={2}
              />
            )}
            {/* Info: (20260720 - Julian) 右數列長條 */}
            {rightW > 0.5 && (
              <rect
                x={CENTER_X}
                y={barY}
                width={rightW}
                height={BAR_H}
                fill={colorRight}
                rx={2}
              />
            )}

            {/* Info: (20260720 - Julian) 項目名稱（固定左欄，必填） */}
            <text
              x={VAR_LABEL_X}
              y={barCenterY + 4}
              textAnchor="end"
              className="t-var fill-slate-700"
              fontSize={12}
              fontWeight={600}
            >
              {bar.category}
            </text>

            {/* Info: (20260720 - Julian) 左數列數值：內嵌貼近外端(白字)，放不下則外置(slate) */}
            <text
              x={leftFits ? leftStart + LABEL_PAD : leftStart - LABEL_PAD}
              y={barCenterY + 4}
              textAnchor={leftFits ? "start" : "end"}
              fill={palette.label}
              filter={leftFits ? "invert(1)" : ""}
              fontSize={12}
              fontWeight={leftFits ? 600 : 400}
            >
              {leftLabel}
            </text>
            {/* Info: (20260720 - Julian) 右數列數值：內嵌貼近外端(深棕字)，放不下則外置(slate) */}
            <text
              x={rightFits ? rightEnd - LABEL_PAD : rightEnd + LABEL_PAD}
              y={barCenterY + 4}
              textAnchor={rightFits ? "end" : "start"}
              fill={palette.label}
              filter={leftFits ? "invert(1)" : ""}
              fontSize={12}
              fontWeight={rightFits ? 600 : 400}
            >
              {rightLabel}
            </text>
          </g>
        );
      })}

      {/* Info: (20260720 - Julian) 圖例：僅畫有填名稱的數列；皆未填則整段不顯示 */}
      {legendItems.length > 0 &&
        (() => {
          const legendY = plotBottom + 24;
          const swatchTextGap = 6;
          const itemGap = 28;
          const cjkW = 8; // Info: (20260720 - Julian) 圖例文字寬度粗估（中英混合）
          const widths = legendItems.map(
            (it) => LEGEND_SWATCH + swatchTextGap + it.name.length * cjkW,
          );
          const totalW =
            widths.reduce((sum, w) => sum + w, 0) +
            itemGap * (legendItems.length - 1);
          const swatchY = legendY - LEGEND_SWATCH + 2;

          // Info: (20260720 - Julian) 預先算出每個項目的起點 x（水平置中）
          const starts: number[] = [];
          let cursor = (VIEW_W - totalW) / 2;
          for (const w of widths) {
            starts.push(cursor);
            cursor += w + itemGap;
          }

          return (
            <g>
              {legendItems.map((it, i) => (
                <g key={`legend-${i}`}>
                  <rect
                    x={starts[i]}
                    y={swatchY}
                    width={LEGEND_SWATCH}
                    height={LEGEND_SWATCH}
                    fill={it.color}
                    rx={2}
                  />
                  <text
                    x={starts[i] + LEGEND_SWATCH + swatchTextGap}
                    y={legendY}
                    textAnchor="start"
                    className="fill-slate-500"
                    fontSize={12}
                  >
                    {it.name}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}
    </svg>
  );
};

export { TornadoChart };
