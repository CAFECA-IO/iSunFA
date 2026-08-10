"use client";

import { FC } from "react";

/**
 * Info: (20260810 - Julian) 圓環圖的圖例明細。
 *
 * 與 `DonutCanvas` 分開，因為同一張 Donut 在不同版面需要不同密度的圖例：
 * 報表卡片是右側寬欄（大字、只列佔比），儀表板是圖下方的窄欄。
 */

export interface IDonutLegendItem {
  name: string;
  value: number;
  percent: number;
}

export interface IDonutLegendProps {
  items: IDonutLegendItem[];
  colors: string[];
  /** Info: (20260810 - Julian) 緊湊模式：小字、行距收窄，供窄欄使用 */
  dense?: boolean;
  /** Info: (20260810 - Julian) 是否在佔比之外一併顯示原始數值 */
  showValue?: boolean;
}

const DonutLegend: FC<IDonutLegendProps> = ({
  items,
  colors,
  dense = false,
  showValue = false,
}) => (
  <ul className={dense ? "flex flex-col gap-1.5" : "space-y-4"}>
    {items.map((item, index) => (
      <li
        key={item.name}
        className={`group flex min-w-0 items-center ${dense ? "text-xs" : ""}`}
      >
        <span
          className={`shrink-0 rounded-full ${
            dense
              ? "mr-2 h-2.5 w-2.5"
              : "mr-4 h-4 w-4 shadow-sm transition-transform duration-200 group-hover:scale-110"
          }`}
          style={{ backgroundColor: colors[index % colors.length] }}
        />
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
          <span
            className={
              dense
                ? "min-w-0 flex-1 truncate text-gray-600"
                : "truncate text-sm leading-tight font-semibold text-gray-700 transition-colors group-hover:text-gray-900"
            }
          >
            {item.name}
          </span>
          <div className="flex shrink-0 items-baseline gap-2">
            {showValue && (
              <span
                className={
                  dense
                    ? "font-semibold text-gray-700"
                    : "text-sm font-bold text-gray-700"
                }
              >
                {item.value}
              </span>
            )}
            <span
              className={
                dense
                  ? "w-10 text-right text-gray-400"
                  : "text-sm font-bold text-gray-700"
              }
            >
              {item.percent}%
            </span>
          </div>
        </div>
      </li>
    ))}
  </ul>
);

export { DonutLegend };
