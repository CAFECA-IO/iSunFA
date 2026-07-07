"use client";

import { useState, FC } from "react";
import { DialogTitle } from "@headlessui/react";
import { Lightbulb, Sparkles, X } from "lucide-react";
import { FlowchartToolsSection } from "@/components/chart/flowchart_tools_submenu";
import { PieToolsSection } from "@/components/chart/pie_tools_submenu";
import { GanttToolsSection } from "@/components/chart/gantt_tools_submenu";
import { useTranslation } from "@/i18n/i18n_context";
import { MermaidChartType } from "@/constants/mermaid_chart";
import { IGanttItem } from "@/lib/utils/mermaid_helpers";

interface IMermaidAiControlPanelProps {
  chartType: MermaidChartType;
  aiInstruction: string;
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
  parsedNodes: { id: string; label: string }[];
  parsedPieItems: { label: string; value: number }[];
  parsedGanttItems: IGanttItem[];
  onCancel: () => void;
}

const MermaidAiControlPanel: FC<IMermaidAiControlPanelProps> = ({
  chartType,
  aiInstruction,
  setAiInstruction,
  parsedNodes,
  parsedPieItems,
  parsedGanttItems,
  onCancel,
}) => {
  const { t } = useTranslation();
  // Info: (20260623 - Julian) 快速指令工具
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // Info: (20260623 - Julian) 目前支援 pie 和 flowchart 小工具
  const isShowTools =
    chartType === MermaidChartType.PIE ||
    chartType === MermaidChartType.FLOWCHART ||
    chartType === MermaidChartType.GANTT;

  return (
    <div className="flex w-full flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 md:w-2/5">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
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

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Info: (20260623 - Julian) 指令編寫說明 */}
        <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-800">
          <div className="mb-1 flex items-center gap-1 font-bold">
            <div className="flex items-center gap-1">
              <Lightbulb size={14} strokeWidth={2.5} />
              <p>{t("chart.mermaid.ai_editor.instructions_title")}</p>
            </div>
          </div>
          <p className="text-blue-700">
            {t("chart.mermaid.ai_editor.instructions_desc")}
          </p>
          {chartType === MermaidChartType.PIE ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium text-blue-600/90">
              {t<string[]>("chart.mermaid.ai_editor.examples.pie").map(
                (ex, i) => (
                  <li key={`pie-ex-${i}`}>「{ex}」</li>
                ),
              )}
            </ul>
          ) : (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium text-blue-600/90">
              {t<string[]>("chart.mermaid.ai_editor.examples.flowchart").map(
                (ex, i) => (
                  <li key={`flow-ex-${i}`}>「{ex}」</li>
                ),
              )}
            </ul>
          )}
        </div>

        {/* Info: (20260623 - Julian) 指令輸入 */}
        <div className="flex shrink-0 flex-col">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="aiInstructionInput"
              className="text-xs font-bold tracking-wider text-slate-700"
            >
              {t("chart.mermaid.ai_editor.input_label")}
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
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            placeholder={
              chartType === MermaidChartType.PIE
                ? t("chart.mermaid.ai_editor.pie_placeholder")!
                : t("chart.mermaid.ai_editor.flowchart_placeholder")!
            }
          />
        </div>

        {/* Info: (20260623 - Julian) 常用修改工具 */}
        {isShowTools && (
          <div className="flex shrink-0 flex-col">
            <span className="mb-2 text-xs font-bold tracking-wider text-slate-700">
              {t("chart.mermaid.ai_editor.quick_tools")}
            </span>
            {chartType === MermaidChartType.PIE ? (
              <PieToolsSection
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                parsedPieItems={parsedPieItems}
                setAiInstruction={setAiInstruction}
              />
            ) : chartType === MermaidChartType.FLOWCHART ? (
              <FlowchartToolsSection
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                parsedNodes={parsedNodes}
                setAiInstruction={setAiInstruction}
              />
            ) : chartType === MermaidChartType.GANTT ? (
              <GanttToolsSection
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                parsedGanttItems={parsedGanttItems}
                setAiInstruction={setAiInstruction}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export { MermaidAiControlPanel };
