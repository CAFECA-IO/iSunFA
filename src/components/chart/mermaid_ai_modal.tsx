"use client";

import { FC, useMemo } from "react";
import { IDonutChartData } from "@/components/common/donut_chart";
import { MermaidChartType } from "@/constants/mermaid_chart";
import { useTranslation } from "@/i18n/i18n_context";
import { AiChartEditorModal } from "@/components/chart/ai_chart_editor/ai_chart_editor_modal";
import { createMermaidEditorAdapter } from "@/components/chart/ai_chart_editor/adapters/mermaid_editor_adapter";

interface IMermaidAiModalProps {
  open: boolean;
  onClose: () => void;
  currentChart: string;
  chartType: MermaidChartType;
  svgStr: string;
  parsedPieData: { title: string; data: IDonutChartData[] } | null;
  onAdopt: (newChart: string) => void;
}

/**
 * Info: (20260721 - Julian)
 * MermaidAiModal 現為薄包裝：以 mermaid adapter 驅動通用 AiChartEditorModal。
 * 對外 API 不變，呼叫端（MermaidChart）無須改動。狀態機與外殼由通用元件擁有。
 */
const MermaidAiModal: FC<IMermaidAiModalProps> = ({
  open,
  onClose,
  currentChart,
  chartType,
  svgStr,
  parsedPieData,
  onAdopt,
}) => {
  const { t } = useTranslation();

  const adapter = useMemo(
    () => createMermaidEditorAdapter({ chartType, svgStr, parsedPieData, t }),
    [chartType, svgStr, parsedPieData, t],
  );

  return (
    <AiChartEditorModal
      open={open}
      onClose={onClose}
      currentChart={currentChart}
      onAdopt={onAdopt}
      adapter={adapter}
    />
  );
};

export { MermaidAiModal };
