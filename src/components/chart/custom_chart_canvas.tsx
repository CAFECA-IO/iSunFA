"use client";

import { FC, useMemo } from "react";
import { CustomChartType } from "@/constants/custom_chart";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";
import { MatrixChart } from "@/components/chart/matrix_chart";
import { TornadoChart } from "@/components/chart/tornado_chart";
import { HistogramChart } from "@/components/chart/histogram_chart";
import { BoxplotChart } from "@/components/chart/boxplot_chart";

interface ICustomChartCanvasProps {
  type: CustomChartType;
  raw: string;
}

/**
 * Info: (20260720 - Julian)
 * 自訂圖表「純畫布」：解析 DSL → 渲染對應圖表 SVG，不含 ChartShell 外殼。
 * 供 CustomChart（外層包 ChartShell）與 AI 編輯 Modal 的前後預覽共用。
 */
const CustomChartCanvas: FC<ICustomChartCanvasProps> = ({ type, raw }) => {
  const result = useMemo(() => parseCustomChart(type, raw), [type, raw]);

  if (!result.ok) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-center">
        <p className="text-[11px] text-slate-400">
          [{result.code}] {result.message}
        </p>
      </div>
    );
  }

  const { ast } = result;
  switch (ast.type) {
    case CustomChartType.MATRIX:
      return <MatrixChart ast={ast} />;
    case CustomChartType.TORNADO:
      return <TornadoChart ast={ast} />;
    case CustomChartType.HISTOGRAM:
      return <HistogramChart ast={ast} />;
    case CustomChartType.BOXPLOT:
      return <BoxplotChart ast={ast} />;
    default:
      return (
        <pre className="overflow-auto p-4 font-mono text-[11px] text-slate-500">
          {JSON.stringify(ast, null, 2)}
        </pre>
      );
  }
};

export { CustomChartCanvas };
