"use client";

import { FC } from "react";
import { HistogramCanvas } from "@/components/chart/histogram_canvas";
import { ICustomHistogramAst } from "@/interfaces/custom_chart";

interface IHistogramChartProps {
  ast: ICustomHistogramAst;
}

/**
 * Info: (20260810 - Julian) 自訂圖表 DSL 的直方圖轉接層。
 * 繪圖層在 `HistogramCanvas`；這裡只負責把 AST 攤成它的 props。
 */
const HistogramChart: FC<IHistogramChartProps> = ({ ast }) => (
  <HistogramCanvas
    bins={ast.bins}
    title={ast.title}
    xAxis={ast.xAxis}
    yAxis={ast.yAxis}
    trend={ast.trend}
    trendColor={ast.trendColor}
  />
);

export { HistogramChart };
