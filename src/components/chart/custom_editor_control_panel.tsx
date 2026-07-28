"use client";

import { FC, useState } from "react";
import { CustomChartType } from "@/constants/custom_chart";
import { ICustomChartAction } from "@/interfaces/custom_chart";
import { MatrixToolsSection } from "@/components/chart/matrix_tools_submenu";
import { TornadoToolsSection } from "@/components/chart/tornado_tools_submenu";
import { HistogramToolsSection } from "@/components/chart/histogram_tools_submenu";
import { ChartEditorControlShell } from "@/components/chart/ai_chart_editor/chart_editor_control_shell";
import { useTranslation } from "@/i18n/i18n_context";

// Info: (20260721 - Julian) 各類型對應的 i18n 指令範例 key（chart.custom_chart.examples.*）
const EXAMPLE_KEY_BY_TYPE: Record<CustomChartType, string> = {
  [CustomChartType.MATRIX]: "matrix",
  [CustomChartType.TORNADO]: "tornado",
  [CustomChartType.HISTOGRAM]: "histogram",
  [CustomChartType.BOXPLOT]: "boxplot",
};

interface ICustomEditorControlPanelProps {
  chartType: CustomChartType;
  isMock: boolean;
  chartSubtitle: string; // Info: (20260721 - Julian) 副標（通常為圖表標題）
  chart: string;
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  pendingActions: ICustomChartAction[];
  onAddAction: (action: ICustomChartAction) => void;
  onRemoveAction: (id: string) => void;
}

/**
 * Info: (20260721 - Julian)
 * 自訂圖表控制台：提供各類型的常用工具（目前僅矩陣圖），版面外殼由 ChartEditorControlShell 共用。
 */
const CustomEditorControlPanel: FC<ICustomEditorControlPanelProps> = ({
  chartType,
  isMock,
  chartSubtitle,
  chart,
  aiInstruction,
  setAiInstruction,
  pendingActions,
  onAddAction,
  onRemoveAction,
}) => {
  const { t } = useTranslation();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const examples =
    t<string[]>(
      `chart.custom_chart.examples.${EXAMPLE_KEY_BY_TYPE[chartType]}`,
    ) || [];

  // Info: (20260721 - Julian) 工具區塊：矩陣、龍捲風已實作；其餘類型 hasTools=false，不會用到此 slot
  const getToolsSlot = () => {
    switch (chartType) {
      case CustomChartType.MATRIX:
        return (
          <MatrixToolsSection
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            chart={chart}
            onAddAction={onAddAction}
          />
        );
      case CustomChartType.TORNADO:
        return (
          <TornadoToolsSection
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            chart={chart}
            onAddAction={onAddAction}
          />
        );
      case CustomChartType.HISTOGRAM:
        return (
          <HistogramToolsSection
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            chart={chart}
            onAddAction={onAddAction}
          />
        );
      case CustomChartType.BOXPLOT:
        return null; // ToDo: (20260728 - Julian) 開發中
      default:
        return null;
    }
  };

  return (
    <ChartEditorControlShell
      headerTitle={t("chart.custom_chart.title")}
      headerSubtitle={`${chartType}${chartSubtitle ? ` · ${chartSubtitle}` : ""}`}
      mockBadge={isMock ? t("chart.custom_chart.mock_badge") : undefined}
      tabToolsLabel={t("chart.custom_chart.tab_quick_tools")}
      tabAiLabel={t("chart.custom_chart.tab_ai_command")}
      toolsSlot={getToolsSlot()}
      pendingActions={pendingActions}
      onRemoveAction={onRemoveAction}
      commandListLabel={t("chart.custom_chart.applied_changes")}
      aiInstruction={aiInstruction}
      setAiInstruction={setAiInstruction}
      instructionLabel={t("chart.custom_chart.instruction_label")}
      clearLabel={t("chart.custom_chart.clear")}
      instructionPlaceholder={t("chart.custom_chart.instruction_placeholder")!}
      tipTitle={t("chart.custom_chart.examples_title")}
      examples={examples}
    />
  );
};

export { CustomEditorControlPanel };
