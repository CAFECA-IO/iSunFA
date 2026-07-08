import { useState, FC } from "react";
import {
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import {
  Lightbulb,
  Sparkles,
  X,
  Wrench,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { FlowchartToolsSection } from "@/components/chart/flowchart_tools_submenu";
import { PieToolsSection } from "@/components/chart/pie_tools_submenu";
import { GanttToolsSection } from "@/components/chart/gantt_tools_submenu";
import { useTranslation } from "@/i18n/i18n_context";
import { MermaidChartType } from "@/constants/mermaid_chart";
import { IGanttItem, IChartAction } from "@/lib/utils/mermaid_helpers";

interface IMermaidAiControlPanelProps {
  chartType: MermaidChartType;
  aiInstruction: string;
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
  parsedNodes: { id: string; label: string }[];
  parsedPieItems: { label: string; value: number }[];
  parsedGanttItems: IGanttItem[];
  pendingActions: IChartAction[];
  onAddAction: (action: IChartAction) => void;
  onRemoveAction: (id: string) => void;
  onCancel: () => void;
}

const MermaidAiControlPanel: FC<IMermaidAiControlPanelProps> = ({
  chartType,
  aiInstruction,
  setAiInstruction,
  parsedNodes,
  parsedPieItems,
  parsedGanttItems,
  pendingActions,
  onAddAction,
  onRemoveAction,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const isShowTools =
    chartType === MermaidChartType.PIE ||
    chartType === MermaidChartType.FLOWCHART ||
    chartType === MermaidChartType.GANTT;

  return (
    <div className="flex w-full flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 md:w-2/5">
      {/* Info: (20260708 - Julian) Header */}
      <div className="flex shrink-0 items-center justify-between bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="shrink-0 rounded-lg bg-blue-50 p-1.5 text-blue-600">
            <Sparkles size={20} />
          </div>
          <div>
            <DialogTitle
              as="h3"
              className="text-sm leading-none font-bold text-slate-800"
            >
              {t("chart.mermaid.ai_editor.title")}
            </DialogTitle>
            <span className="text-[10px] font-medium text-slate-400">
              {t("chart.mermaid.ai_editor.subtitle")}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      <TabGroup className="flex flex-1 flex-col overflow-hidden">
        <TabList className="grid shrink-0 grid-cols-2 gap-1 bg-white px-5">
          <Tab
            className={({ selected }) =>
              `flex items-center justify-center gap-2 rounded-t-2xl border-x border-t border-slate-200 px-4 py-3 text-xs font-bold transition-all focus:outline-none ${
                selected
                  ? "bg-slate-50 text-slate-700"
                  : "bg-white text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <Wrench size={14} />
            {t("chart.mermaid.ai_editor.tabs.quick_tools")}
          </Tab>
          <Tab
            className={({ selected }) =>
              `flex items-center justify-center gap-2 rounded-t-2xl border-x border-t border-slate-200 px-4 py-3 text-xs font-bold transition-all focus:outline-none ${
                selected
                  ? "bg-slate-50 text-slate-700"
                  : "bg-white text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <MessageSquare size={14} />
            {t("chart.mermaid.ai_editor.tabs.ai_assistant")}
          </Tab>
        </TabList>

        <TabPanels className="flex-1 overflow-y-auto">
          {/* Info: (20260708 - Julian) 快速工具 Tab */}
          <TabPanel className="flex flex-col gap-6 bg-slate-50 p-5 focus:outline-none">
            {isShowTools ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col">
                  <span className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    {t("chart.mermaid.ai_editor.tabs.quick_tools")}
                  </span>
                  {chartType === MermaidChartType.PIE ? (
                    <PieToolsSection
                      selectedTool={selectedTool}
                      setSelectedTool={setSelectedTool}
                      parsedPieItems={parsedPieItems}
                      onAddAction={onAddAction}
                    />
                  ) : chartType === MermaidChartType.FLOWCHART ? (
                    <FlowchartToolsSection
                      selectedTool={selectedTool}
                      setSelectedTool={setSelectedTool}
                      parsedNodes={parsedNodes}
                      onAddAction={onAddAction}
                    />
                  ) : chartType === MermaidChartType.GANTT ? (
                    <GanttToolsSection
                      selectedTool={selectedTool}
                      setSelectedTool={setSelectedTool}
                      parsedGanttItems={parsedGanttItems}
                      onAddAction={onAddAction}
                    />
                  ) : null}
                </div>

                {/* Info: (20260708 - Julian) 結構化動作列表 */}
                {pendingActions.length > 0 && (
                  <div className="flex flex-col border-t border-slate-200 pt-5">
                    <span className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                      {t("chart.mermaid.ai_editor.command_list")}
                    </span>
                    <div className="flex flex-col gap-2">
                      {pendingActions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3 shadow-sm"
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-tight text-blue-600 uppercase">
                              {action.type.split("_").pop()}
                            </span>
                            <span className="text-xs font-medium text-slate-700">
                              {action.description}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveAction(action.id)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-xs text-slate-400">
                {t("chart.mermaid.ai_editor.no_tools_available")}
              </div>
            )}
          </TabPanel>

          {/* Info: (20260708 - Julian) AI 輔助 Tab */}
          <TabPanel className="flex flex-col gap-5 p-5 focus:outline-none">
            {/* Info: (20260708 - Julian) AI 輸入 */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="aiInstructionInput"
                  className="text-xs font-bold tracking-wider text-slate-500"
                >
                  {t("chart.mermaid.ai_editor.tabs.ai_assistant")}
                </label>
                {aiInstruction && (
                  <button
                    type="button"
                    onClick={() => setAiInstruction("")}
                    className="text-[11px] font-bold text-slate-400 transition-colors hover:text-rose-500"
                  >
                    {t("chart.mermaid.ai_editor.clear_btn")}
                  </button>
                )}
              </div>
              <textarea
                id="aiInstructionInput"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-xs placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder={t(
                  "chart.mermaid.ai_editor.ai_assistant_placeholder",
                )}
              />
            </div>
            {/* Info: (20260708 - Julian) 說明 */}
            <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-800">
              <div className="mb-1 flex items-center gap-1 font-bold">
                <Lightbulb size={14} strokeWidth={2.5} />
                <p>{t("chart.mermaid.ai_editor.instructions_title")}</p>
              </div>
              <p className="text-blue-700">
                {t("chart.mermaid.ai_editor.instructions_desc")}
              </p>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
};

export { MermaidAiControlPanel };
