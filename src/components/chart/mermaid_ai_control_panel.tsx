import { useState, useEffect, FC } from "react";
import { FlowchartToolsSection } from "@/components/chart/flowchart_tools_submenu";
import { PieToolsSection } from "@/components/chart/pie_tools_submenu";
import { GanttToolsSection } from "@/components/chart/gantt_tools_submenu";
import { XYChartToolsSection } from "@/components/chart/xychart_tools_submenu";
import { SankeyToolsSection } from "@/components/chart/sankey_tools_submenu";
import { ChartEditorControlShell } from "@/components/chart/ai_chart_editor/chart_editor_control_shell";
import { useTranslation } from "@/i18n/i18n_context";
import { MermaidChartType } from "@/constants/mermaid_chart";
import { IChartAction } from "@/lib/utils/mermaid_helpers";

interface IMermaidAiControlPanelProps {
  chartType: MermaidChartType;
  aiInstruction: string;
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
  // Info: (20260716 - Julian) 只傳圖表字串，各 ToolsSection 自行解析所需資料
  chart: string;
  pendingActions: IChartAction[];
  onAddAction: (action: IChartAction) => void;
  onRemoveAction: (id: string) => void;
  chartTitle: string;
  onTitleChange: (newTitle: string) => void;
}

/**
 * Info: (20260721 - Julian)
 * mermaid 控制台：提供標題編輯與各圖表類型的工具區塊，版面外殼由 ChartEditorControlShell 共用。
 */
const MermaidAiControlPanel: FC<IMermaidAiControlPanelProps> = ({
  chartType,
  aiInstruction,
  setAiInstruction,
  chart,
  pendingActions,
  onAddAction,
  onRemoveAction,
  chartTitle,
  onTitleChange,
}) => {
  const { t } = useTranslation();
  const [localTitle, setLocalTitle] = useState<string>(chartTitle);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    setLocalTitle(chartTitle);
  }, [chartTitle]);

  const commitTitle = () => {
    if (localTitle !== chartTitle) {
      onTitleChange(localTitle);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitTitle();
      e.currentTarget.blur();
    }
  };

  // Info: (20260713 - Julian) Sankey 目前不支援 title 功能
  const isShowTitle = chartType !== MermaidChartType.SANKEY;

  const isShowTools =
    chartType === MermaidChartType.PIE ||
    chartType === MermaidChartType.FLOWCHART ||
    chartType === MermaidChartType.GANTT ||
    chartType === MermaidChartType.XYCHART ||
    chartType === MermaidChartType.SANKEY;

  const examples =
    t<string[]>(
      `chart.mermaid.ai_editor.${chartType.toLowerCase()}.examples`,
    ) || [];

  // Info: (20260721 - Julian) 標題編輯（Sankey 除外）
  const titleSlot = isShowTitle ? (
    <div className="mb-5 flex flex-col gap-2">
      <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
        {t("chart.mermaid.ai_editor.chart_title")}
      </span>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <input
          id="mermaid-title-input"
          type="text"
          className="w-full text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
          placeholder={t("chart.mermaid.ai_editor.chart_title_placeholder")}
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  ) : undefined;

  // Info: (20260721 - Julian) 工具區塊：依 chartType 分派；無工具則顯示佔位
  const toolsSlot = isShowTools ? (
    <div className="flex flex-col">
      <span className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
        {t("chart.mermaid.ai_editor.tabs.quick_tools")}
      </span>
      {chartType === MermaidChartType.PIE ? (
        <PieToolsSection
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          chart={chart}
          onAddAction={onAddAction}
        />
      ) : chartType === MermaidChartType.FLOWCHART ? (
        <FlowchartToolsSection
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          chart={chart}
          onAddAction={onAddAction}
        />
      ) : chartType === MermaidChartType.GANTT ? (
        <GanttToolsSection
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          chart={chart}
          onAddAction={onAddAction}
        />
      ) : chartType === MermaidChartType.XYCHART ? (
        <XYChartToolsSection
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          chart={chart}
          onAddAction={onAddAction}
        />
      ) : chartType === MermaidChartType.SANKEY ? (
        <SankeyToolsSection
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          chart={chart}
          onAddAction={onAddAction}
        />
      ) : null}
    </div>
  ) : (
    <div className="flex h-40 items-center justify-center text-xs text-slate-400">
      {t("chart.mermaid.ai_editor.no_tools_available")}
    </div>
  );

  return (
    <ChartEditorControlShell
      headerTitle={t("chart.mermaid.ai_editor.title")}
      headerSubtitle={t("chart.mermaid.ai_editor.subtitle")}
      tabToolsLabel={t("chart.mermaid.ai_editor.tabs.quick_tools")}
      tabAiLabel={t("chart.mermaid.ai_editor.tabs.ai_assistant")}
      titleSlot={titleSlot}
      toolsSlot={toolsSlot}
      pendingActions={pendingActions}
      onRemoveAction={onRemoveAction}
      commandListLabel={t("chart.mermaid.ai_editor.command_list")}
      aiInstruction={aiInstruction}
      setAiInstruction={setAiInstruction}
      instructionLabel={t("chart.mermaid.ai_editor.tabs.ai_assistant")}
      clearLabel={t("chart.mermaid.ai_editor.clear_btn")}
      instructionPlaceholder={t(
        "chart.mermaid.ai_editor.ai_assistant_placeholder",
      )}
      tipTitle={t("chart.mermaid.ai_editor.instructions_title")}
      tipDesc={t("chart.mermaid.ai_editor.instructions_desc")}
      examples={examples}
    />
  );
};

export { MermaidAiControlPanel };
