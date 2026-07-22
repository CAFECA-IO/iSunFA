"use client";

import { FC, ReactNode, useMemo, useState } from "react";
import {
  CustomChartType,
  CustomChartExportName,
} from "@/constants/custom_chart";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";
import { ChartShell } from "@/components/chart/chart_shell";
import { CustomChartAiModal } from "@/components/chart/custom_chart_ai_modal";
import { MatrixChart } from "@/components/chart/matrix_chart";
import { TornadoChart } from "@/components/chart/tornado_chart";
import { HistogramChart } from "@/components/chart/histogram_chart";
import { BoxplotChart } from "@/components/chart/boxplot_chart";

interface ICustomChartProps {
  type: CustomChartType;
  raw: string;
}

/**
 * Info: (20260716 - Julian)
 * 自訂圖表容器：解析 DSL → 依類型分派渲染，統一包進共用外殼 ChartShell
 * （下載 / 全螢幕 / AI 助手），並掛上自訂圖表的 AI 編輯 Modal（目前為 mock）。
 */
const CustomChart: FC<ICustomChartProps> = ({ type, raw }) => {
  const result = useMemo(() => parseCustomChart(type, raw), [type, raw]);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  if (!result.ok) {
    // Info: (20260716 - Julian) 解析失敗顯示錯誤態，避免整份 Markdown 崩潰
    return (
      <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-xs font-bold text-red-500">自訂圖表解析失敗</p>
        <p className="mt-1 text-xs text-slate-500">
          [{result.code}] {result.message}
        </p>
      </div>
    );
  }

  const { ast } = result;

  // Info: (20260720 - Julian) 下載檔名優先採用圖表標題，未填標題才退回各類型的預設檔名
  const titleFileName = ast.title?.trim();

  // Info: (20260720 - Julian) 依類型決定要渲染的圖表元件與下載檔名
  let chartNode: ReactNode;
  let exportFileName: string;
  switch (ast.type) {
    case CustomChartType.MATRIX:
      chartNode = <MatrixChart ast={ast} />;
      exportFileName = titleFileName || CustomChartExportName.MATRIX;
      break;
    case CustomChartType.TORNADO:
      chartNode = <TornadoChart ast={ast} />;
      exportFileName = titleFileName || CustomChartExportName.TORNADO;
      break;
    case CustomChartType.HISTOGRAM:
      chartNode = <HistogramChart ast={ast} />;
      exportFileName = titleFileName || CustomChartExportName.HISTOGRAM;
      break;
    case CustomChartType.BOXPLOT:
      chartNode = <BoxplotChart ast={ast} />;
      exportFileName = titleFileName || CustomChartExportName.BOXPLOT;
      break;
    default:
      // Info: (20260720 - Julian) 未知類型：以 AST JSON 佔位，不進外殼
      return (
        <pre className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] text-slate-600">
          {JSON.stringify(ast, null, 2)}
        </pre>
      );
  }

  return (
    <>
      <ChartShell
        exportFileName={exportFileName}
        openAiModal={() => setIsAiModalOpen(true)}
      >
        {chartNode}
      </ChartShell>
      <CustomChartAiModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        chartType={ast.type}
        chartTitle={ast.title}
        raw={raw}
      />
    </>
  );
};

export { CustomChart };
