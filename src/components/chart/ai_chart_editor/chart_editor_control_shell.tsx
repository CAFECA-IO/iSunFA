"use client";

import { FC, ReactNode } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  Lightbulb,
  Sparkles,
  Wrench,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { IChartEditorAction } from "@/interfaces/ai_chart_editor";

interface IChartEditorControlShellProps {
  // Info: (20260721 - Julian) Header
  headerTitle: string;
  headerSubtitle: string;
  mockBadge?: string; // Info: (20260721 - Julian) 提供則於標題後顯示 Mock 徽章
  // Info: (20260721 - Julian) 分頁標籤
  tabToolsLabel: string;
  tabAiLabel: string;
  // Info: (20260721 - Julian) 標題編輯（選填；mermaid 用，custom 無）— 置於分頁內容之上
  titleSlot?: ReactNode;
  // Info: (20260721 - Julian) 常用工具內容（各圖表自帶工具區塊或「開發中」佔位）
  toolsSlot: ReactNode;
  // Info: (20260721 - Julian) 結構化動作暫存清單（共用）
  pendingActions: IChartEditorAction[];
  onRemoveAction: (id: string) => void;
  commandListLabel: string;
  // Info: (20260721 - Julian) AI 指令區
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  instructionLabel: string;
  clearLabel: string;
  instructionPlaceholder: string;
  // Info: (20260721 - Julian) 提示區：標題 + 選填說明 + 範例
  tipTitle: string;
  tipDesc?: string;
  examples: string[];
}

/**
 * Info: (20260721 - Julian)
 * AI 圖表編輯器左欄共用外殼：header + AI 指令區為必備；有常用工具時以「常用工具 / AI 指令」兩分頁呈現，
 * 無常用工具（hasTools=false）時去掉分頁、只顯示 AI 指令。圖表別差異以 slot + label 注入。
 */
const ChartEditorControlShell: FC<IChartEditorControlShellProps> = ({
  headerTitle,
  headerSubtitle,
  mockBadge = "",
  tabToolsLabel,
  tabAiLabel,
  titleSlot = null,
  toolsSlot,
  pendingActions,
  onRemoveAction,
  commandListLabel,
  aiInstruction,
  setAiInstruction,
  instructionLabel,
  clearLabel,
  instructionPlaceholder,
  tipTitle,
  tipDesc = "",
  examples,
}) => {
  const tabClass = ({ selected }: { selected: boolean }) =>
    `flex items-center justify-center gap-2 rounded-t-2xl border-x border-t border-slate-200 px-4 py-3 text-xs font-bold transition-all focus:outline-none ${
      selected
        ? "bg-slate-50 text-slate-700"
        : "bg-white text-slate-400 hover:text-slate-600"
    }`;

  // Info: (20260721 - Julian) Header（兩種模式共用）
  const header = (
    <div className="flex shrink-0 items-center justify-between bg-white px-5 py-4">
      <div className="flex items-center gap-2">
        <div className="shrink-0 rounded-lg bg-blue-50 p-1.5 text-blue-600">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-sm leading-none font-bold text-slate-800">
            {headerTitle}
            {mockBadge && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                {mockBadge}
              </span>
            )}
          </h3>
          <span className="text-[10px] font-medium text-slate-400">
            {headerSubtitle}
          </span>
        </div>
      </div>
    </div>
  );

  // Info: (20260721 - Julian) AI 指令區（分頁模式的 AI Tab 與無工具模式共用）
  const aiSection = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="aiInstructionInput"
            className="text-xs font-bold tracking-wider text-slate-500"
          >
            {instructionLabel}
          </label>
          {aiInstruction && (
            <button
              type="button"
              onClick={() => setAiInstruction("")}
              className="text-[11px] font-bold text-slate-400 transition-colors hover:text-rose-500"
            >
              {clearLabel}
            </button>
          )}
        </div>
        <textarea
          id="aiInstructionInput"
          value={aiInstruction}
          onChange={(e) => setAiInstruction(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-slate-200 bg-white p-4 text-xs placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder={instructionPlaceholder}
        />
      </div>
      <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-800">
        <div className="mb-1 flex items-center gap-1 font-bold">
          <Lightbulb size={14} strokeWidth={2.5} />
          <p>{tipTitle}</p>
        </div>
        {tipDesc && (
          <p className="whitespace-normal text-blue-700">{tipDesc}</p>
        )}
        {examples.length > 0 && (
          <ul className="mt-2 ml-4 list-disc space-y-1 text-[11px] text-blue-600/80">
            {examples.map((example, i) => (
              <li key={i}>{example}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex w-full flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 md:w-2/5">
      {header}

      <TabGroup className="flex flex-1 flex-col overflow-hidden">
        <TabList className="grid shrink-0 grid-cols-2 gap-1 bg-white px-5">
          <Tab className={tabClass}>
            <Wrench size={14} />
            {tabToolsLabel}
          </Tab>
          <Tab className={tabClass}>
            <MessageSquare size={14} />
            {tabAiLabel}
          </Tab>
        </TabList>

        <TabPanels className="flex-1 overflow-y-auto p-5">
          {/* Info: (20260721 - Julian) 標題編輯（選填） */}
          {titleSlot}

          {/* Info: (20260721 - Julian) 常用工具 Tab：工具內容 + 暫存動作清單 */}
          <TabPanel className="flex flex-col gap-6 focus:outline-none">
            {toolsSlot}

            {pendingActions.length > 0 && (
              <div className="flex flex-col border-t border-slate-200 pt-5">
                <span className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  {commandListLabel}
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
          </TabPanel>

          {/* Info: (20260721 - Julian) AI 指令 Tab */}
          <TabPanel className="focus:outline-none">{aiSection}</TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
};

export { ChartEditorControlShell };
