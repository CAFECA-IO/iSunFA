"use client";

import { FC, useMemo } from "react";
import { MermaidChartType } from "@/constants/mermaid_chart";
import { useTranslation } from "@/i18n/i18n_context";
import { AiChartEditorModal } from "@/components/chart/ai_chart_editor/ai_chart_editor_modal";
import { createMermaidEditorAdapter } from "@/components/chart/ai_chart_editor/mermaid_editor_adapter";

interface IMermaidAiModalProps {
  open: boolean;
  onClose: () => void;
  currentChart: string;
  chartType: MermaidChartType;
  onAdopt: (newChart: string) => void;
}

/**
 * Info: (20260723 - Julian)
 * MermaidAiModal 為薄包裝：以 mermaid adapter 驅動通用 AiChartEditorModal。
 */
const MermaidAiModal: FC<IMermaidAiModalProps> = ({
  open,
  onClose,
  currentChart,
  chartType,
  onAdopt,
}) => {
  const { t } = useTranslation();

  const adapter = useMemo(
    () => createMermaidEditorAdapter({ chartType, t }),
    [chartType, t],
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
