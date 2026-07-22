"use client";

import { FC } from "react";
import { Loader2 } from "lucide-react";
import { CustomChartType } from "@/constants/custom_chart";
import { CustomChartCanvas } from "@/components/chart/custom_chart_canvas";
import { ChartEditorPreviewShell } from "@/components/chart/ai_chart_editor/chart_editor_preview_shell";
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
 * 自訂圖表預覽面板：前後預覽以 CustomChartCanvas 渲染，版面外殼由 ChartEditorPreviewShell 共用。
 * 產生目前為 mock（失敗訊息顯示於「修改後」區）。
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

  return (
    <ChartEditorPreviewShell
      before={<CustomChartCanvas type={chartType} raw={baseChart} />}
      after={renderAfter()}
      previewCompareLabel={t("chart.custom_chart.preview_compare")}
      beforeLabel={t("chart.custom_chart.before")}
      afterLabel={t("chart.custom_chart.after")}
      cancelLabel={t("chart.custom_chart.cancel")}
      generateLabel={t("chart.custom_chart.generate")}
      stopGeneratingLabel={t("chart.custom_chart.stop_generating")}
      adoptLabel={t("chart.custom_chart.adopt")}
      aiInstruction={aiInstruction}
      isGenerating={isGenerating}
      canAdopt={!apiError}
      onCancel={onCancel}
      onGenerate={onGenerate}
      onAbort={onAbort}
      onAdopt={onAdopt}
    />
  );
};

export { CustomEditorPreviewPanel };
