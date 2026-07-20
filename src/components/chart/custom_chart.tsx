"use client";

import { FC, useMemo } from "react";
import { CustomChartType } from "@/constants/custom_chart";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";
import { ChartShell } from "@/components/chart/chart_shell";
import { MatrixChart } from "@/components/chart/matrix_chart";
import { TornadoChart } from "@/components/chart/tornado_chart";
import { HistogramChart } from "@/components/chart/histogram_chart";

interface ICustomChartProps {
  type: CustomChartType;
  raw: string;
}

/**
 * Info: (20260716 - Julian)
 * 自訂圖表容器。目前先完成「解析 + 錯誤/佔位」外殼；
 * 各圖表的實際繪製留待後續階段接上 result.ast。
 */
const CustomChart: FC<ICustomChartProps> = ({ type, raw }) => {
  const result = useMemo(() => parseCustomChart(type, raw), [type, raw]);

  if (!result.ok) {
    // Info: (20260716 - Julian) 解析失敗顯示錯誤態，避免整份 Markdown 崩潰
    return (
      <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-xs font-bold text-red-500">自訂圖表解析失敗</p>
        <p className="mt-1 text-[11px] text-slate-500">
          [{result.code}] {result.message}
        </p>
      </div>
    );
  }

  const { ast } = result;

  // Info: (20260720 - Julian) 依類型分派到各圖表渲染；尚未實作者暫以 AST 佔位呈現
  switch (ast.type) {
    case CustomChartType.MATRIX:
      return (
        <ChartShell>
          <MatrixChart ast={ast} />
        </ChartShell>
      );
    case CustomChartType.TORNADO:
      return (
        <ChartShell>
          <TornadoChart ast={ast} />
        </ChartShell>
      );
    case CustomChartType.HISTOGRAM:
      return (
        <ChartShell>
          <HistogramChart ast={ast} />
        </ChartShell>
      );
    default:
      return (
        <pre className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] text-slate-600">
          {JSON.stringify(ast, null, 2)}
        </pre>
      );
  }
};

export { CustomChart };
