"use client";

import { FC, useMemo } from "react";
import { ICustomMatrixAst } from "@/interfaces/custom_chart";
import { DEFAULT_COLORS } from "@/components/common/donut_chart";

interface IMatrixChartProps {
  ast: ICustomMatrixAst;
}

// Info: (20260720 - Julian) SVG 版面常數（固定 viewBox）
const VIEW_W = 720;
const VIEW_H = 600;
const PLOT_LEFT = 96;
const PLOT_TOP = 64;
const PLOT_SIZE = 440; // Info: (20260720 - Julian) 正方形繪圖區，矩陣圖以 1:1 最好讀
const PLOT_RIGHT = PLOT_LEFT + PLOT_SIZE;
const PLOT_BOTTOM = PLOT_TOP + PLOT_SIZE;
const LEGEND_X = PLOT_RIGHT + 24;

// Info: (20260720 - Julian) 無群組時的中性點色
const NEUTRAL_POINT = "#64748B";

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/**
 * Info: (20260720 - Julian)
 * 依資料與選填的 scale 推導座標域，並確保「中性中心」對應到繪圖區正中心：
 * - 含負值（雙極/帶號資料）：以 0 為原點，取對稱域 [-half, half]，讓十字軸交會於 0。
 * - 全為非負：以 [0, max] 呈現，中心落在 max/2（如重大性矩陣的中間值）。
 * 未給 scale 時加 8% 留白；渲染層才做縮放，parser 不負責計算。
 */
const getDomain = (
  values: number[],
  scale: number | undefined,
): { min: number; max: number } => {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  if (dataMin < 0) {
    // Info: (20260720 - Julian) 帶號資料 → 對稱於原點 0
    let half = scale ?? Math.max(Math.abs(dataMin), Math.abs(dataMax));
    if (half <= 0) half = 1;
    if (scale === undefined) half *= 1.08;
    return { min: -half, max: half };
  }

  // Info: (20260720 - Julian) 全非負 → 以 0 為下界，中心落在區間中點
  let max = scale ?? dataMax;
  if (max <= 0) max = 1;
  if (scale === undefined) max *= 1.08;
  return { min: 0, max };
};

const MatrixChart: FC<IMatrixChartProps> = ({ ast }) => {
  const { title, xAxis, yAxis, points, groupColors: customColors } = ast;

  /**
   * Info: (20260721 - Julian) 群組 → 顏色對照：優先採用使用者指定色，其餘依首次出現順序套用預設調色盤。
   * 調色盤索引只在「未指定色」的群組才遞增，避免自訂色影響其他群組的自動配色。
   */
  const groupColors = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    points.forEach((p) => {
      if (p.group && !map.has(p.group)) {
        const custom = customColors?.[p.group];
        if (custom) {
          map.set(p.group, custom);
        } else {
          map.set(p.group, DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
          i += 1;
        }
      }
    });
    return map;
  }, [points, customColors]);

  const xDomain = useMemo(
    () =>
      getDomain(
        points.map((p) => p.x),
        xAxis.scale,
      ),
    [points, xAxis.scale],
  );
  const yDomain = useMemo(
    () =>
      getDomain(
        points.map((p) => p.y),
        yAxis.scale,
      ),
    [points, yAxis.scale],
  );

  const toX = (v: number): number => {
    const t = (v - xDomain.min) / (xDomain.max - xDomain.min || 1);
    return clamp(PLOT_LEFT + t * PLOT_SIZE, PLOT_LEFT, PLOT_RIGHT);
  };
  // Info: (20260720 - Julian) y 反轉：值越大越靠上（螢幕 y 越小）
  const toY = (v: number): number => {
    const t = (v - yDomain.min) / (yDomain.max - yDomain.min || 1);
    return clamp(PLOT_BOTTOM - t * PLOT_SIZE, PLOT_TOP, PLOT_BOTTOM);
  };

  const midX = toX((xDomain.min + xDomain.max) / 2);
  const midY = toY((yDomain.min + yDomain.max) / 2);

  return (
    // Info: (20260720 - Julian) 外層容器（灰底、縮放平移）由 ChartShell 提供，此處只回傳 SVG
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title ?? "Matrix chart"}
    >
      <defs>
        <marker
          id="matrix-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#94A3B8" />
        </marker>
      </defs>

      {/* Info: (20260720 - Julian) 資料點 hover：橘黃色光暈 + 標籤上色（僅螢幕，避免列印殘影） */}
      <style>{`
        .matrix-point { cursor: pointer; }
        .matrix-point circle { transition: filter 0.15s ease; }
        @media screen {
          .matrix-point:hover circle {
            fill: #ff9900;
          }
          .matrix-point:hover text {
            fill: #ff9900;
            font-weight: 700;
          }
        }
      `}</style>

      {/* Info: (20260720 - Julian) 標題 */}
      {title && (
        <text
          x={PLOT_LEFT + PLOT_SIZE / 2}
          y={32}
          textAnchor="middle"
          className="fill-slate-800"
          fontSize={18}
          fontWeight={700}
        >
          {title}
        </text>
      )}

      {/* Info: (20260720 - Julian) 四象限底色 */}
      <rect
        x={midX}
        y={PLOT_TOP}
        width={PLOT_RIGHT - midX}
        height={midY - PLOT_TOP}
        fill="#FFE6B5" // Info: (20260720 - Julian) 第一象限，暖色調
      />
      <rect
        x={PLOT_LEFT}
        y={PLOT_TOP}
        width={midX - PLOT_LEFT}
        height={midY - PLOT_TOP}
        fill="#F1F0EE" // Info: (20260720 - Julian) 第二象限
      />
      <rect
        x={PLOT_LEFT}
        y={midY}
        width={midX - PLOT_LEFT}
        height={PLOT_BOTTOM - midY}
        fill="#E9E8E7" // Info: (20260720 - Julian) 第三象限
      />
      <rect
        x={midX}
        y={midY}
        width={PLOT_RIGHT - midX}
        height={PLOT_BOTTOM - midY}
        fill="#F1F0EE" // Info: (20260720 - Julian) 第四象限
      />

      {/* Info: (20260720 - Julian) 中央十字軸：原點交會於繪圖區中心，箭頭指向高值端 */}
      <line
        x1={PLOT_LEFT}
        y1={midY}
        x2={PLOT_RIGHT + 8}
        y2={midY}
        stroke="#94A3B8"
        strokeWidth={1.5}
        markerEnd="url(#matrix-arrow)"
      />
      <line
        x1={midX}
        y1={PLOT_BOTTOM}
        x2={midX}
        y2={PLOT_TOP - 8}
        stroke="#94A3B8"
        strokeWidth={1.5}
        markerEnd="url(#matrix-arrow)"
      />

      {/* Info: (20260720 - Julian) X 軸雙極端點文字 */}
      {xAxis.min && (
        <text
          x={PLOT_LEFT}
          y={PLOT_BOTTOM + 28}
          textAnchor="start"
          className="fill-slate-500"
          fontSize={12}
          fontWeight={600}
        >
          {xAxis.min}
        </text>
      )}
      {xAxis.max && (
        <text
          x={PLOT_RIGHT}
          y={PLOT_BOTTOM + 28}
          textAnchor="end"
          className="fill-slate-500"
          fontSize={12}
          fontWeight={600}
        >
          {xAxis.max}
        </text>
      )}

      {/* Info: (20260720 - Julian) Y 軸雙極端點文字（沿軸旋轉） */}
      {yAxis.max && (
        <text
          transform={`translate(${PLOT_LEFT - 16}, ${PLOT_TOP}) rotate(-90)`}
          textAnchor="end"
          className="fill-slate-500"
          fontSize={12}
          fontWeight={600}
        >
          {yAxis.max}
        </text>
      )}
      {yAxis.min && (
        <text
          transform={`translate(${PLOT_LEFT - 16}, ${PLOT_BOTTOM}) rotate(-90)`}
          textAnchor="start"
          className="fill-slate-500"
          fontSize={12}
          fontWeight={600}
        >
          {yAxis.min}
        </text>
      )}

      {/* Info: (20260720 - Julian) 資料點 + 標籤 */}
      {points.map((p, idx) => {
        const cx = toX(p.x);
        const cy = toY(p.y);
        const color = p.group
          ? (groupColors.get(p.group) ?? NEUTRAL_POINT)
          : NEUTRAL_POINT;
        // Info: (20260720 - Julian) 標籤朝內側擺放，避免超出繪圖區
        const onRightHalf = cx > (PLOT_LEFT + PLOT_RIGHT) / 2;
        const labelX = onRightHalf ? cx - 10 : cx + 10;
        const labelAnchor = onRightHalf ? "end" : "start";
        return (
          <g key={`matrix-point-${idx}`} className="matrix-point">
            <circle
              cx={cx}
              cy={cy}
              r={6}
              fill={color}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
            <text
              x={labelX}
              y={cy + 4}
              textAnchor={labelAnchor}
              className="fill-slate-700"
              fontSize={14}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      {/* Info: (20260720 - Julian) 群組圖例 */}
      {Array.from(groupColors.entries()).map(([group, color], idx) => (
        <g
          key={`matrix-legend-${group}`}
          transform={`translate(${LEGEND_X}, ${PLOT_TOP + idx * 22})`}
        >
          <rect width={12} height={12} rx={2} fill={color} />
          <text
            x={18}
            y={10}
            className="fill-slate-600"
            fontSize={11}
            fontWeight={600}
          >
            {group}
          </text>
        </g>
      ))}
    </svg>
  );
};

export { MatrixChart };
