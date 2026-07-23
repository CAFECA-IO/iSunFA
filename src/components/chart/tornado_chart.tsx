"use client";

import { FC, useMemo } from "react";
import { ICustomTornadoAst } from "@/interfaces/custom_chart";

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

// Info: (20260720 - Julian) 兩數列配色（沿用設計系統色）：左=深藍、右=橘
const COLOR_LEFT = "#152C5B";
const COLOR_RIGHT = "#FF9800";

// Info: (20260720 - Julian) 數值標籤：內嵌 / 外置的字寬估算與配色
const CHAR_W = 6.5; // Info: (20260720 - Julian) fontSize 11 下每字元約略寬度（含逗號）
const LABEL_PAD = 4; // Info: (20260720 - Julian) 數值標籤與長條端點間距（越小越貼近）

// Info: (20260720 - Julian) 數值格式化（千分位、最多三位小數），避免浮點雜訊
const formatValue = (n: number): string =>
  n.toLocaleString(undefined, { maximumFractionDigits: 3 });

const TornadoChart: FC<ITornadoChartProps> = ({ ast }) => {
  const { title, unit, baseline, leftSeries, rightSeries, bars } = ast;

  // Info: (20260723 - Julian) 數列顏色：DSL 指定優先，否則採預設（左深藍、右橘）
  const colorLeft = ast.leftColor ?? COLOR_LEFT;
  const colorRight = ast.rightColor ?? COLOR_RIGHT;

  // Info: (20260723 - Julian) 中心參考標籤：基準線與單位擇有者顯示（以直線分隔）
  const centerLabel = [
    baseline !== undefined ? `基準 ${formatValue(baseline)}` : null,
    unit ? `單位：${unit}` : null,
  ]
    .filter((s): s is string => s !== null)
    .join("　｜　");

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

  // Info: (20260720 - Julian) 圖例項目：僅顯示有填名稱的數列；皆未填則不畫圖例、亦不留底部空間
  const legendItems = [
    leftSeries ? { name: leftSeries, color: colorLeft } : null,
    rightSeries ? { name: rightSeries, color: colorRight } : null,
  ].filter((item): item is { name: string; color: string } => item !== null);

  const plotBottom = MARGIN_TOP + sortedBars.length * ROW_H;
  const viewH = plotBottom + (legendItems.length > 0 ? MARGIN_BOTTOM : 16);

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
        stroke="#94A3B8"
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
              fill="#64748B"
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
              fill="#64748B"
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
