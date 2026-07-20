"use client";

import { FC, useMemo } from "react";
import { ICustomHistogramAst } from "@/interfaces/custom_chart";

interface IHistogramChartProps {
  ast: ICustomHistogramAst;
}

// Info: (20260720 - Julian) SVG 版面常數（固定 viewBox，交由 ChartShell 等比縮放）
const VIEW_W = 720;
const VIEW_H = 460;
const MARGIN_TOP = 56; // Info: (20260720 - Julian) 標題
const MARGIN_BOTTOM = 76; // Info: (20260720 - Julian) x 軸分箱標籤 + 軸標題
const MARGIN_LEFT = 72; // Info: (20260720 - Julian) y 軸刻度 + 軸標題
const MARGIN_RIGHT = 32;
const PLOT_LEFT = MARGIN_LEFT;
const PLOT_RIGHT = VIEW_W - MARGIN_RIGHT;
const PLOT_TOP = MARGIN_TOP;
const PLOT_BOTTOM = VIEW_H - MARGIN_BOTTOM;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;

const TICK_COUNT = 4; // Info: (20260720 - Julian) y 軸目標刻度數（實際依 nice step 微調）
const SLOT_GAP = 0; // Info: (20260720 - Julian) 相鄰長條間距（直方圖不留間距）
const ROTATE_SLOT_W = 56; // Info: (20260720 - Julian) 每格寬度小於此值時 x 標籤旋轉避免重疊

// Info: (20260720 - Julian) 長條色 + hover 色（沿用設計系統）
const COLOR_BAR = "#152C5B";

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

const HistogramChart: FC<IHistogramChartProps> = ({ ast }) => {
  const { title, xAxis, yAxis, bins } = ast;

  // Info: (20260720 - Julian) y 軸刻度：由最大 count 推導 nice 上限與級距（渲染層職責）
  const { niceMax, step } = useMemo(() => {
    const rawMax = Math.max(1, ...bins.map((b) => b.count));
    const stepValue = niceNum(rawMax / TICK_COUNT, true);
    const max = Math.ceil(rawMax / stepValue) * stepValue;
    return { niceMax: max, step: stepValue };
  }, [bins]);

  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let v = 0; v <= niceMax + step / 2; v += step) list.push(v);
    return list;
  }, [niceMax, step]);

  const toY = (count: number): number =>
    PLOT_BOTTOM - (count / niceMax) * PLOT_H;

  const slotW = PLOT_W / bins.length;
  const barW = Math.max(1, slotW - SLOT_GAP);
  const rotateLabels = slotW < ROTATE_SLOT_W;

  return (
    // Info: (20260720 - Julian) 外層灰底縮放平移容器由 ChartShell 提供，此處只回傳 SVG
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
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
          x={VIEW_W / 2}
          y={32}
          textAnchor="middle"
          className="fill-slate-800"
          fontSize={18}
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
              x1={PLOT_LEFT}
              y1={y}
              x2={PLOT_RIGHT}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
            <text
              x={PLOT_LEFT - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400"
              fontSize={12}
            >
              {formatValue(t)}
            </text>
          </g>
        );
      })}

      {/* Info: (20260720 - Julian) 軸線 */}
      <line
        x1={PLOT_LEFT}
        y1={PLOT_TOP}
        x2={PLOT_LEFT}
        y2={PLOT_BOTTOM}
        stroke="#94A3B8"
        strokeWidth={1.5}
      />
      <line
        x1={PLOT_LEFT}
        y1={PLOT_BOTTOM}
        x2={PLOT_RIGHT}
        y2={PLOT_BOTTOM}
        stroke="#94A3B8"
        strokeWidth={1.5}
      />

      {/* Info: (20260720 - Julian) 各分箱長條 + count 標籤 + x 標籤 */}
      {bins.map((bin, idx) => {
        const slotX = PLOT_LEFT + idx * slotW;
        const barX = slotX + (slotW - barW) / 2;
        const barTop = toY(bin.count);
        const barCenterX = slotX + slotW / 2;
        const barH = Math.max(0, PLOT_BOTTOM - barTop);

        return (
          <g key={`histo-bar-${idx}`} className="histo-bar">
            {barH > 0.5 && (
              <rect
                x={barX}
                y={barTop}
                width={barW}
                height={barH}
                fill={COLOR_BAR}
                rx={2}
              />
            )}
            {/* Info: (20260720 - Julian) count 值（長條頂端上方） */}
            <text
              x={barCenterX}
              y={barTop - 6}
              textAnchor="middle"
              className="histo-count fill-slate-500"
              fontSize={12}
              fontWeight={600}
            >
              {formatValue(bin.count)}
            </text>
            {/* Info: (20260720 - Julian) x 分箱標籤（過密則旋轉） */}
            {rotateLabels ? (
              <text
                transform={`translate(${barCenterX + 20}, ${PLOT_BOTTOM + 14}) rotate(-35)`}
                textAnchor="end"
                className="histo-count fill-slate-600"
                fontSize={12}
              >
                {bin.label}
              </text>
            ) : (
              <text
                x={barCenterX}
                y={PLOT_BOTTOM + 20}
                textAnchor="middle"
                className="histo-count fill-slate-600"
                fontSize={12}
              >
                {bin.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Info: (20260720 - Julian) x 軸標題 */}
      {xAxis && (
        <text
          x={PLOT_LEFT + PLOT_W / 2}
          y={VIEW_H - 12}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize={12}
          fontWeight={600}
        >
          {xAxis}
        </text>
      )}

      {/* Info: (20260720 - Julian) y 軸標題（沿軸旋轉） */}
      {yAxis && (
        <text
          transform={`translate(20, ${PLOT_TOP + PLOT_H / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize={12}
          fontWeight={600}
        >
          {yAxis}
        </text>
      )}
    </svg>
  );
};

export { HistogramChart };
