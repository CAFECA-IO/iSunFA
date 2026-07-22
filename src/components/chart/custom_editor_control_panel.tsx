"use client";

import { FC, useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  Sparkles,
  Wrench,
  MessageSquare,
  Lightbulb,
  Trash2,
} from "lucide-react";
import { CustomChartType } from "@/constants/custom_chart";
import { IMatrixAction } from "@/interfaces/custom_chart";
import { MatrixToolsSection } from "@/components/chart/matrix_tools_submenu";
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
  pendingActions: IMatrixAction[];
  onAddAction: (action: IMatrixAction) => void;
  onRemoveAction: (id: string) => void;
}

/**
 * Info: (20260721 - Julian)
 * 自訂圖表 AI 編輯器左欄（常用工具 + AI 指令）。由 custom adapter 提供給通用 modal。
 * 目前僅矩陣圖具備常用工具，其餘類型顯示「開發中」佔位。
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

  const isMatrix = chartType === CustomChartType.MATRIX;
  const examples =
    t<string[]>(
      `chart.custom_chart.examples.${EXAMPLE_KEY_BY_TYPE[chartType]}`,
    ) || [];

  return (
    <div className="flex w-full flex-col overflow-hidden border-r border-slate-200 bg-slate-50 md:w-2/5">
      {/* Info: (20260721 - Julian) Header */}
      <div className="flex shrink-0 items-center gap-2 bg-white px-5 py-4">
        <div className="shrink-0 rounded-lg bg-blue-50 p-1.5 text-blue-600">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-sm leading-none font-bold text-slate-800">
            {t("chart.custom_chart.title")}
            {isMock && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                {t("chart.custom_chart.mock_badge")}
              </span>
            )}
          </h3>
          <span className="text-[10px] font-medium text-slate-400">
            {chartType}
            {chartSubtitle ? ` · ${chartSubtitle}` : ""}
          </span>
        </div>
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
            {t("chart.custom_chart.tab_quick_tools")}
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
            {t("chart.custom_chart.tab_ai_command")}
          </Tab>
        </TabList>

        <TabPanels className="flex-1 overflow-y-auto p-5">
          {/* Info: (20260721 - Julian) 常用工具 Tab（矩陣圖已實作，其餘類型待後續逐一實作） */}
          <TabPanel className="flex flex-col gap-6 focus:outline-none">
            {isMatrix ? (
              <>
                <MatrixToolsSection
                  selectedTool={selectedTool}
                  setSelectedTool={setSelectedTool}
                  chart={chart}
                  onAddAction={onAddAction}
                />

                {/* Info: (20260721 - Julian) 結構化動作暫存清單 */}
                {pendingActions.length > 0 && (
                  <div className="flex flex-col border-t border-slate-200 pt-5">
                    <span className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                      {t("chart.custom_chart.applied_changes")}
                    </span>
                    <div className="flex flex-col gap-2">
                      {pendingActions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3 shadow-sm"
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-tight text-blue-600 uppercase">
                              {action.type}
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
              </>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-xs text-slate-400">
                <Wrench size={24} className="text-slate-300" />
                <span>{t("chart.custom_chart.quick_tools_developing")}</span>
                <span className="text-[11px] text-slate-300">
                  {t("chart.custom_chart.quick_tools_hint")}
                </span>
              </div>
            )}
          </TabPanel>

          {/* Info: (20260721 - Julian) AI 指令 Tab */}
          <TabPanel className="flex flex-col gap-5 focus:outline-none">
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="custom-ai-instruction"
                  className="text-xs font-bold tracking-wider text-slate-500"
                >
                  {t("chart.custom_chart.instruction_label")}
                </label>
                {aiInstruction && (
                  <button
                    type="button"
                    onClick={() => setAiInstruction("")}
                    className="text-[11px] font-bold text-slate-400 transition-colors hover:text-rose-500"
                  >
                    {t("chart.custom_chart.clear")}
                  </button>
                )}
              </div>
              <textarea
                id="custom-ai-instruction"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-xs placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder={t("chart.custom_chart.instruction_placeholder")!}
              />
            </div>
            <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-800">
              <div className="mb-1 flex items-center gap-1 font-bold">
                <Lightbulb size={14} strokeWidth={2.5} />
                <p>{t("chart.custom_chart.examples_title")}</p>
              </div>
              {examples.length > 0 && (
                <ul className="mt-1 ml-4 list-disc space-y-1 text-[11px] text-blue-600/80">
                  {examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              )}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
};

export { CustomEditorControlPanel };
