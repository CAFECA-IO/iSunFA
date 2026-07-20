"use client";

import { FC, useMemo } from "react";
import { ICustomBoxAst } from "@/interfaces/custom_chart";

interface IBoxplotChartProps {
  ast: ICustomBoxAst;
}

// Info: (20260720 - Julian) SVG 版面常數（固定 viewBox，交由 ChartShell 等比縮放）
const VIEW_W = 720;
const VIEW_H = 460;
const MARGIN_TOP = 56; // Info: (20260720 - Julian) 標題
const MARGIN_BOTTOM = 64; // Info: (20260720 - Julian) x 軸標籤
const MARGIN_LEFT = 72; // Info: (20260720 - Julian) y 軸刻度 + 軸標題
const MARGIN_RIGHT = 32;
const PLOT_LEFT = MARGIN_LEFT;
const PLOT_RIGHT = VIEW_W - MARGIN_RIGHT;
const PLOT_TOP = MARGIN_TOP;
const PLOT_BOTTOM = VIEW_H - MARGIN_BOTTOM;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;

const TICK_COUNT = 4; // Info: (20260720 - Julian) y 軸目標刻度數（依 nice step 微調）
const MAX_BOX_W = 90; // Info: (20260720 - Julian) 盒身最大寬度（過寬不好讀）
const ROTATE_SLOT_W = 72; // Info: (20260720 - Julian) 每格過窄則 x 標籤旋轉

// Info: (20260720 - Julian) 配色（沿用設計系統）：盒身深藍、中位數白線（深底上突顯）、離群點灰
const COLOR_BOX = "#152C5B";
const COLOR_MEDIAN = "#FFFFFF";
const COLOR_OUTLIER = "#94A3B8";
const COLOR_VALUE = "#334155"; // Info: (20260720 - Julian) hover 顯示的數值字色

// Info: (20260720 - Julian) 數值格式化（千分位、最多三位小數），避免浮點雜訊
const formatValue = (n: number): string =>
  n.toLocaleString(undefined, { maximumFractionDigits: 3 });

/**
 * Info: (20260720 - Julian)
 * 取「漂亮」的刻度數字（1/2/5 × 10^n）。純幾何呈現用途；parser 不做任何數值計算。
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

const BoxplotChart: FC<IBoxplotChartProps> = ({ ast }) => {
  const { title, yAxis, unit, boxes } = ast;

  // Info: (20260720 - Julian) y 軸域：涵蓋所有五數綜合與離群點，取 nice 上下界與級距（渲染層職責）
  const { niceMin, niceMax, step } = useMemo(() => {
    const values = boxes.flatMap((b) => [
      b.min,
      b.q1,
      b.median,
      b.q3,
      b.max,
      ...(b.outliers ?? []),
    ]);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const stepValue = niceNum((dataMax - dataMin) / TICK_COUNT || 1, true);
    return {
      niceMin: Math.floor(dataMin / stepValue) * stepValue,
      niceMax: Math.ceil(dataMax / stepValue) * stepValue,
      step: stepValue,
    };
  }, [boxes]);

  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let v = niceMin; v <= niceMax + step / 2; v += step) list.push(v);
    return list;
  }, [niceMin, niceMax, step]);

  const span = niceMax - niceMin || 1;
  const toY = (v: number): number =>
    PLOT_BOTTOM - ((v - niceMin) / span) * PLOT_H;

  const slotW = PLOT_W / boxes.length;
  const boxW = Math.min(slotW * 0.5, MAX_BOX_W);
  const capW = boxW * 0.5;
  const rotateLabels = slotW < ROTATE_SLOT_W;

  const axisTitle = [yAxis, unit ? `(${unit})` : ""].filter(Boolean).join(" ");

  return (
    // Info: (20260720 - Julian) 外層灰底縮放平移容器由 ChartShell 提供，此處只回傳 SVG
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title ?? "Box plot"}
    >
      {/* Info: (20260720 - Julian) hover：顯示五數綜合與離群點數值（列印時顯示全部數據） */}
      <style>{`
        .box-item { cursor: pointer; }
        .box-values { opacity: 0; transition: opacity 0.12s ease; }
        @media screen {
          .box-label:hover { fill: #EA580C; }
          .box-item:hover .box-values { opacity: 1; }
          .box-item:hover rect { stroke: #FF9800; fill: #FF9800; }
          .box-item:hover circle { fill: #FF9800; }
        }
        @media printer {
          .box-item .box-values { opacity: 1; }
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
          <g key={`box-tick-${t}`}>
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

      {/* Info: (20260720 - Julian) 各盒鬚：鬚線 + 端帽 + 盒身 + 中位數 + 離群點 + 標籤 */}
      {boxes.map((box, idx) => {
        const cx = PLOT_LEFT + idx * slotW + slotW / 2;
        const yMin = toY(box.min);
        const yMax = toY(box.max);
        const yQ1 = toY(box.q1);
        const yQ3 = toY(box.q3);
        const yMedian = toY(box.median);
        const boxTop = Math.min(yQ1, yQ3);
        const boxH = Math.max(1, Math.abs(yQ1 - yQ3));

        // Info: (20260720 - Julian) hover 數值放在盒身外側；靠右半邊則改置左側避免超出繪圖區
        const onRightHalf = cx > (PLOT_LEFT + PLOT_RIGHT) / 2;
        const valueX = onRightHalf ? cx - boxW / 2 - 6 : cx + boxW / 2 + 6;
        const valueAnchor = onRightHalf ? "end" : "start";
        const stats: { v: number; y: number }[] = [
          { v: box.max, y: yMax },
          { v: box.q3, y: yQ3 },
          { v: box.median, y: yMedian },
          { v: box.q1, y: yQ1 },
          { v: box.min, y: yMin },
        ];

        return (
          <g key={`box-item-${idx}`} className="box-item">
            {/* Info: (20260720 - Julian) 上下鬚線（max→q3、q1→min） */}
            <line
              x1={cx}
              y1={yMax}
              x2={cx}
              y2={yQ3}
              stroke={COLOR_BOX}
              strokeWidth={1.5}
            />
            <line
              x1={cx}
              y1={yQ1}
              x2={cx}
              y2={yMin}
              stroke={COLOR_BOX}
              strokeWidth={1.5}
            />
            {/* Info: (20260720 - Julian) 端帽（min / max） */}
            <line
              x1={cx - capW / 2}
              y1={yMax}
              x2={cx + capW / 2}
              y2={yMax}
              stroke={COLOR_BOX}
              strokeWidth={1.5}
            />
            <line
              x1={cx - capW / 2}
              y1={yMin}
              x2={cx + capW / 2}
              y2={yMin}
              stroke={COLOR_BOX}
              strokeWidth={1.5}
            />
            {/* Info: (20260720 - Julian) 盒身（q1→q3） */}
            <rect
              x={cx - boxW / 2}
              y={boxTop}
              width={boxW}
              height={boxH}
              fill={COLOR_BOX}
              fillOpacity={0.9}
              stroke={COLOR_BOX}
              strokeWidth={1.5}
              rx={2}
            />
            {/* Info: (20260720 - Julian) 中位數線 */}
            <line
              x1={cx - boxW / 2}
              y1={yMedian}
              x2={cx + boxW / 2}
              y2={yMedian}
              stroke={COLOR_MEDIAN}
              strokeWidth={2.5}
            />
            {/* Info: (20260720 - Julian) 離群點 */}
            {(box.outliers ?? []).map((o, oi) => (
              <circle
                key={`box-${idx}-outlier-${oi}`}
                className="box-outlier"
                cx={cx}
                cy={toY(o)}
                r={3}
                fill={COLOR_OUTLIER}
                stroke="#FFFFFF"
                strokeWidth={1}
              />
            ))}

            {/* Info: (20260720 - Julian) hover 才顯示的數值（五數綜合 + 離群點），白色描邊確保可讀 */}
            <g className="box-values">
              {stats.map((s, si) => (
                <text
                  key={`box-${idx}-stat-${si}`}
                  x={valueX}
                  y={s.y + 4}
                  textAnchor={valueAnchor}
                  fill={COLOR_VALUE}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  paintOrder="stroke"
                  fontSize={11}
                  fontWeight={600}
                >
                  {formatValue(s.v)}
                </text>
              ))}
              {(box.outliers ?? []).map((o, oi) => (
                <text
                  key={`box-${idx}-outval-${oi}`}
                  x={valueX}
                  y={toY(o) + 4}
                  textAnchor={valueAnchor}
                  fill={COLOR_VALUE}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  paintOrder="stroke"
                  fontSize={11}
                >
                  {formatValue(o)}
                </text>
              ))}
            </g>
            {/* Info: (20260720 - Julian) x 標籤（過密則旋轉） */}
            {rotateLabels ? (
              <text
                transform={`translate(${cx}, ${PLOT_BOTTOM + 14}) rotate(-35)`}
                textAnchor="end"
                className="box-label fill-slate-600"
                fontSize={12}
              >
                {box.label}
              </text>
            ) : (
              <text
                x={cx}
                y={PLOT_BOTTOM + 20}
                textAnchor="middle"
                className="box-label fill-slate-600"
                fontSize={12}
              >
                {box.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Info: (20260720 - Julian) y 軸標題（沿軸旋轉） */}
      {axisTitle && (
        <text
          transform={`translate(20, ${PLOT_TOP + PLOT_H / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize={12}
          fontWeight={600}
        >
          {axisTitle}
        </text>
      )}
    </svg>
  );
};

export { BoxplotChart };
