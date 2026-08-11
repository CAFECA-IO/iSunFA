"use client";

import { FC, useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

/**
 * Info: (20260810 - Julian) 圓環圖的純繪圖層。
 * 從 `donut_chart` 抽出，這一層只畫圓環與中心標籤，不含外框、工具列。
 */

export interface IDonutCanvasDatum {
  name: string;
  value: number;
}

interface ICustomTooltipPayload {
  name: string;
  value: number | string;
}

interface ICustomTooltipProps {
  active?: boolean;
  payload?: ICustomTooltipPayload[];
  valueSuffix?: string;
}

const CustomTooltip: FC<ICustomTooltipProps> = ({
  active = false,
  payload = [],
  valueSuffix = "",
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="z-100 rounded-xl border border-gray-100/50 bg-white/95 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm">
        <p className="text-sm font-semibold text-gray-800">{payload[0].name}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Intl.NumberFormat("en-US").format(Number(payload[0].value))}
          {valueSuffix}
        </p>
      </div>
    );
  }
  return null;
};

export interface IDonutCanvasProps {
  data: IDonutCanvasDatum[];
  colors: string[];
  /** Info: (20260810 - Julian) 正方形邊長（px）。呼叫端決定尺寸，元件不自作主張 */
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  /** Info: (20260810 - Julian) 中心是否顯示最大切片的佔比 */
  showCenterLabel?: boolean;
  /**
   * Info: (20260810 - Julian) tooltip 數值後綴。
   * 預設 " %" 是沿用重構前 `donut_chart` 的行為，改動它會改到既有報表的顯示。
   */
  valueSuffix?: string;
}

const DEFAULT_SIZE = 200;
const DEFAULT_INNER_RADIUS = 65;
const DEFAULT_OUTER_RADIUS = 90;
const DEFAULT_PADDING_ANGLE = 4;

// Info: (20260418 - Tzuhan) Truncate name for center label
const getShortName = (name: string): string =>
  name.length > 5 ? `${name.substring(0, 4)}..` : name;

const DonutCanvas: FC<IDonutCanvasProps> = ({
  data,
  colors,
  size = DEFAULT_SIZE,
  innerRadius = DEFAULT_INNER_RADIUS,
  outerRadius = DEFAULT_OUTER_RADIUS,
  paddingAngle = DEFAULT_PADDING_ANGLE,
  showCenterLabel = true,
  valueSuffix = " %",
}) => {
  const total = useMemo(
    () => data.reduce((acc, current) => acc + current.value, 0),
    [data],
  );

  // Info: (20260418 - Tzuhan) Find the largest slice for the center emphasis
  const primaryItem = useMemo(() => {
    if (data.length === 0) return { name: "", percent: 0 };
    const largest = data.reduce((prev, current) =>
      prev.value > current.value ? prev : current,
    );
    return {
      name: largest.name,
      percent: total > 0 ? Math.round((largest.value / total) * 100) : 0,
    };
  }, [data, total]);

  return (
    <div
      className="relative mx-auto shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Info: (20260418 - Tzuhan) Custom Center UI */}
      {showCenterLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl leading-none font-black tracking-tight text-[#0B1F45]">
            {primaryItem.percent}%
          </span>
          <span className="mt-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {getShortName(primaryItem.name)}
          </span>
        </div>
      )}
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={paddingAngle}
          dataKey="value"
          nameKey="name"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={colors[index % colors.length]}
              className="drop-shadow-sm transition-opacity outline-none hover:opacity-90"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} />
      </PieChart>
    </div>
  );
};

export { DonutCanvas };
