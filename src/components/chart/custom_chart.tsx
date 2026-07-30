"use client";

import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import {
  CustomChartType,
  CustomChartExportName,
} from "@/constants/custom_chart";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";
import { useTranslation } from "@/i18n/i18n_context";
import { ChartShell } from "@/components/chart/chart_shell";
import { AiChartEditorModal } from "@/components/chart/ai_chart_editor/ai_chart_editor_modal";
import { createCustomEditorAdapter } from "@/components/chart/ai_chart_editor/custom_editor_adapter";
import { MatrixChart } from "@/components/chart/matrix_chart";
import { TornadoChart } from "@/components/chart/tornado_chart";
import { HistogramChart } from "@/components/chart/histogram_chart";
import { BoxplotChart } from "@/components/chart/boxplot_chart";

interface ICustomChartProps {
  type: CustomChartType;
  raw: string;
  // Info: (20260723 - Julian) AI 採用後回寫 Markdown 原始碼（未提供則僅更新本地預覽）
  onChartChange?: (newChart: string) => void;
}

/**
 * Info: (20260716 - Julian)
 * 自訂圖表容器：解析 DSL → 依類型分派渲染，統一包進共用外殼 ChartShell
 * （下載 / 全螢幕 / AI 助手）。AI 編輯沿用通用化的 AiChartEditorModal（custom adapter，產生為 mock）。
 */
const CustomChart: FC<ICustomChartProps> = ({
  type,
  raw,
  onChartChange = undefined,
}) => {
  const { t } = useTranslation();

  // Info: (20260721 - Julian) 本地圖表內容（供 AI 採用後更新；raw prop 變動時同步）
  const [currentRaw, setCurrentRaw] = useState<string>(raw);
  useEffect(() => {
    setCurrentRaw(raw);
  }, [raw]);

  // Info: (20260723 - Julian) AI 採用：更新本地預覽，並（若有綁定）回寫 Markdown 原始碼
  const handleAdopt = (newChart: string) => {
    setCurrentRaw(newChart);
    onChartChange?.(newChart);
  };

  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  const result = useMemo(
    () => parseCustomChart(type, currentRaw),
    [type, currentRaw],
  );

  const adapter = useMemo(
    () => createCustomEditorAdapter({ chartType: type, t }),
    [type, t],
  );

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
        openAiModal={onChartChange ? () => setIsAiModalOpen(true) : undefined}
      >
        {chartNode}
      </ChartShell>
      <AiChartEditorModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentChart={currentRaw}
        onAdopt={handleAdopt}
        adapter={adapter}
      />
    </>
  );
};

export { CustomChart };
