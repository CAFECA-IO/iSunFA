"use client";

import { FC, useState } from "react";
import { Loader2, Rows2, Columns2, Send, CircleX } from "lucide-react";
import { CustomChartType } from "@/constants/custom_chart";
import { PreviewDirective } from "@/constants/chart_ui";
import { CustomChartCanvas } from "@/components/chart/custom_chart_canvas";
import { useTranslation } from "@/i18n/i18n_context";

interface ICustomEditorPreviewPanelProps {
  chartType: CustomChartType;
  baseChart: string;
  newChartPreview: string;
  aiInstruction: string;
  isGenerating: boolean;
  apiError: string | null;
  onCancel: () => void;
  onGenerate: () => void;
  onAbort: () => void;
  onAdopt: () => void;
}

/**
 * Info: (20260721 - Julian)
 * 自訂圖表 AI 編輯器右欄（變更前後預覽對比 + 產生/採用）。由 custom adapter 提供給通用 modal。
 * 前後預覽皆以 CustomChartCanvas 渲染；產生目前為 mock（失敗訊息顯示於「修改後」區）。
 */
const CustomEditorPreviewPanel: FC<ICustomEditorPreviewPanelProps> = ({
  chartType,
  baseChart,
  newChartPreview,
  aiInstruction,
  isGenerating,
  apiError,
  onCancel,
  onGenerate,
  onAbort,
  onAdopt,
}) => {
  const { t } = useTranslation();
  const [previewDirective, setPreviewDirective] = useState<PreviewDirective>(
    PreviewDirective.ROW,
  );

  const previewStyle =
    previewDirective === PreviewDirective.ROW
      ? "h-[48%] min-h-[200px] w-full"
      : "h-full w-[48%]";

  // Info: (20260721 - Julian) 修改後預覽（依狀態早退）
  const renderAfter = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 size={32} className="animate-spin text-orange-600" />
          <span className="text-xs font-bold text-orange-600">
            {t("chart.custom_chart.generating")}
          </span>
        </div>
      );
    }
    if (apiError) {
      return (
        <div className="mx-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
          {apiError}
        </div>
      );
    }
    return <CustomChartCanvas type={chartType} raw={newChartPreview} />;
  };

  const generateButton = isGenerating ? (
    <button
      type="button"
      onClick={onAbort}
      className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-5 py-2 text-xs font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-100"
    >
      <CircleX size={14} />
      {t("chart.custom_chart.stop_generating")}
    </button>
  ) : (
    <button
      type="button"
      onClick={onGenerate}
      disabled={!aiInstruction.trim()}
      className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
    >
      <Send size={14} />
      {t("chart.custom_chart.generate")}
    </button>
  );

  return (
    <div className="flex w-full flex-col overflow-hidden bg-slate-100 md:w-3/5">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-bold text-slate-700">
          {t("chart.custom_chart.preview_compare")}
        </p>
        <div className="flex items-center gap-1 rounded-lg bg-gray-200 p-1">
          <button
            type="button"
            onClick={() => setPreviewDirective(PreviewDirective.ROW)}
            className={`shrink-0 rounded-sm p-1 ${
              previewDirective === PreviewDirective.ROW
                ? "bg-white text-orange-500 shadow-sm"
                : "text-gray-500 hover:bg-gray-300"
            }`}
            title={t("chart.custom_chart.layout_row")!}
          >
            <Rows2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPreviewDirective(PreviewDirective.COLUMN)}
            className={`shrink-0 rounded-sm p-1 ${
              previewDirective === PreviewDirective.COLUMN
                ? "bg-white text-orange-500 shadow-sm"
                : "text-gray-500 hover:bg-gray-300"
            }`}
            title={t("chart.custom_chart.layout_column")!}
          >
            <Columns2 size={16} />
          </button>
        </div>
      </div>

      <div
        className={`flex flex-1 gap-4 overflow-y-auto p-4 ${
          previewDirective === PreviewDirective.COLUMN ? "flex-row" : "flex-col"
        }`}
      >
        {/* Info: (20260721 - Julian) 修改前 */}
        <div className={`flex flex-col ${previewStyle}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
            {t("chart.custom_chart.before")}
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            <CustomChartCanvas type={chartType} raw={baseChart} />
          </div>
        </div>

        {/* Info: (20260721 - Julian) 修改後 */}
        <div className={`flex flex-col ${previewStyle}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
            {t("chart.custom_chart.after")}
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            {renderAfter()}
          </div>
        </div>
      </div>

      {/* Info: (20260721 - Julian) Footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onCancel}
          className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:text-slate-400"
        >
          {t("chart.custom_chart.cancel")}
        </button>

        {generateButton}

        {!apiError && (
          <button
            type="button"
            onClick={onAdopt}
            className="cursor-pointer rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-500"
          >
            {t("chart.custom_chart.adopt")}
          </button>
        )}
      </div>
    </div>
  );
};

export { CustomEditorPreviewPanel };
