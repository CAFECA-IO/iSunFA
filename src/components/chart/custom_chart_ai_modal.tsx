"use client";

import { FC, useState, useEffect, useMemo } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  Sparkles,
  X,
  Wrench,
  MessageSquare,
  Lightbulb,
  Loader2,
  Rows2,
  Columns2,
  Send,
  Trash2,
} from "lucide-react";
import { CustomChartType } from "@/constants/custom_chart";
import { IMatrixAction } from "@/interfaces/custom_chart";
import { applyMatrixAction } from "@/lib/utils/custom_matrix_editor";
import { CustomChartCanvas } from "@/components/chart/custom_chart_canvas";
import { MatrixToolsSection } from "@/components/chart/matrix_tools_submenu";

interface ICustomChartAiModalProps {
  open: boolean;
  onClose: () => void;
  chartType: CustomChartType;
  chartTitle?: string;
  raw: string;
}

// Info: (20260720 - Julian) mock 模擬「思考」耗時（毫秒），純前端計時，不呼叫後端
const MOCK_THINKING_MS = 800;

// Info: (20260720 - Julian) 各類型的 AI 指令範例
const AI_EXAMPLES: Record<CustomChartType, string[]> = {
  [CustomChartType.MATRIX]: [
    "把座標軸標籤改成中文",
    "新增一個資料點「供應鏈稽核」",
  ],
  [CustomChartType.TORNADO]: [
    "把左右數列名稱改為 2023 / 2024",
    "依影響幅度由大到小排序",
  ],
  [CustomChartType.HISTOGRAM]: ["疊加常態分佈趨勢線", "標題改為「金額分布」"],
  [CustomChartType.BOXPLOT]: ["新增一個部門的盒鬚", "單位改為新台幣"],
};

// Info: (20260720 - Julian) 預覽排版方向
enum PreviewDirective {
  ROW = "ROW",
  COLUMN = "COLUMN",
}

/**
 * Info: (20260720 - Julian)
 * 自訂圖表 AI 智慧編輯器（以 MermaidAiModal 為藍本的兩欄式版面）。
 * 左側：常用修改工具（本輪先為佔位，後續逐一實作）＋ AI 編輯指令。
 * 右側：變更前後預覽對比。
 * 目前「產生」為 mock：模擬思考後回報開發中，不呼叫後端、不變更圖表。
 */
const CustomChartAiModal: FC<ICustomChartAiModalProps> = ({
  open,
  onClose,
  chartType,
  chartTitle = "",
  raw,
}) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const [instruction, setInstruction] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewDirective, setPreviewDirective] = useState<PreviewDirective>(
    PreviewDirective.ROW,
  );

  // Info: (20260721 - Julian) 矩陣圖常用工具的結構化編輯動作（暫存清單）
  const [pendingActions, setPendingActions] = useState<IMatrixAction[]>([]);

  // Info: (20260721 - Julian) 目前僅矩陣圖支援結構化工具編輯
  const isMatrix = chartType === CustomChartType.MATRIX;

  // Info: (20260721 - Julian) 依序套用暫存動作，決定論算出修改後的 DSL（不呼叫後端）
  const modifiedRaw = useMemo(
    () =>
      isMatrix
        ? pendingActions.reduce(
            (result, action) => applyMatrixAction(result, action),
            raw,
          )
        : raw,
    [isMatrix, pendingActions, raw],
  );

  // Info: (20260720 - Julian) 開啟時重置狀態
  useEffect(() => {
    if (open) {
      setInstruction("");
      setIsGenerating(false);
      setNotice(null);
      setPreviewDirective(PreviewDirective.ROW);
      setSelectedTool(null);
      setPendingActions([]);
    }
  }, [open]);

  const handleAddAction = (action: IMatrixAction) => {
    setPendingActions((prev) => [...prev, action]);
  };

  const handleRemoveAction = (id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
  };

  if (!open) return null;

  const handleMockGenerate = () => {
    if (!instruction.trim() || isGenerating) return;
    setIsGenerating(true);
    setNotice(null);
    // Info: (20260720 - Julian) mock：模擬思考後回報開發中，不動任何資料
    window.setTimeout(() => {
      setIsGenerating(false);
      setNotice(
        "自訂圖表的 AI 產生尚在開發中（mock），此為介面預覽，不會變更圖表。",
      );
    }, MOCK_THINKING_MS);
  };

  const examples = AI_EXAMPLES[chartType] ?? [];

  const previewStyle =
    previewDirective === PreviewDirective.ROW
      ? "h-[48%] min-h-[200px] w-full"
      : "h-full w-[48%]";

  // Info: (20260720 - Julian) 修改後預覽區內容（依狀態早退）
  const renderAfter = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 size={32} className="animate-spin text-orange-600" />
          <span className="text-xs font-bold text-orange-600">產生中…</span>
        </div>
      );
    }
    if (notice) {
      return (
        <div className="mx-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
          {notice}
        </div>
      );
    }
    // Info: (20260721 - Julian) 有結構化編輯動作時，即時預覽套用後的圖表
    if (isMatrix && pendingActions.length > 0) {
      return <CustomChartCanvas type={chartType} raw={modifiedRaw} />;
    }
    return (
      <div className="text-center text-slate-400">
        <Sparkles
          size={24}
          className="mx-auto mb-2 animate-pulse text-slate-300"
        />
        <span className="text-xs">
          使用常用工具或輸入 AI 指令，即可預覽修改後的圖表
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-8888 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md sm:p-6 md:p-10">
      <div className="relative flex h-[85vh] max-h-[720px] min-h-[560px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:flex-row">
        {/* Info: (20260720 - Julian) 左側：常用工具 + AI 指令 */}
        <div className="flex w-full flex-col overflow-hidden border-r border-slate-200 bg-slate-50 md:w-2/5">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-white px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="shrink-0 rounded-lg bg-blue-50 p-1.5 text-blue-600">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-sm leading-none font-bold text-slate-800">
                  AI 智慧圖表編輯
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                    Mock
                  </span>
                </h3>
                <span className="text-[10px] font-medium text-slate-400">
                  {chartType}
                  {chartTitle ? ` · ${chartTitle}` : ""}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="關閉"
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
                常用工具
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
                AI 指令
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
                      chart={raw}
                      onAddAction={handleAddAction}
                    />

                    {/* Info: (20260721 - Julian) 結構化動作暫存清單 */}
                    {pendingActions.length > 0 && (
                      <div className="flex flex-col border-t border-slate-200 pt-5">
                        <span className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                          已套用的變更
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
                                onClick={() => handleRemoveAction(action.id)}
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
                  <div className="flex h-40 items-center justify-center text-center text-xs text-slate-400">
                    此圖表類型的常用工具開發中
                  </div>
                )}
              </TabPanel>

              {/* Info: (20260720 - Julian) AI 指令 Tab */}
              <TabPanel className="flex flex-col gap-5 focus:outline-none">
                <div className="flex flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="custom-ai-instruction"
                      className="text-xs font-bold tracking-wider text-slate-500"
                    >
                      AI 編輯指令
                    </label>
                    {instruction && (
                      <button
                        type="button"
                        onClick={() => setInstruction("")}
                        className="text-[11px] font-bold text-slate-400 transition-colors hover:text-rose-500"
                      >
                        清除
                      </button>
                    )}
                  </div>
                  <textarea
                    id="custom-ai-instruction"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-xs placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="用自然語言描述想要的修改，例如：把長條由大到小排序、標題改為「Q1 分布」…"
                  />
                </div>
                <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-800">
                  <div className="mb-1 flex items-center gap-1 font-bold">
                    <Lightbulb size={14} strokeWidth={2.5} />
                    <p>指令範例</p>
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

        {/* Info: (20260720 - Julian) 右側：變更前後預覽對比 */}
        <div className="flex w-full flex-col overflow-hidden bg-slate-100 md:w-3/5">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <p className="text-sm font-bold text-slate-700">變更預覽對比</p>
            <div className="flex items-center gap-1 rounded-lg bg-gray-200 p-1">
              <button
                type="button"
                onClick={() => setPreviewDirective(PreviewDirective.ROW)}
                className={`shrink-0 rounded-sm p-1 ${
                  previewDirective === PreviewDirective.ROW
                    ? "bg-white text-orange-500 shadow-sm"
                    : "text-gray-500 hover:bg-gray-300"
                }`}
                title="上下對照"
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
                title="左右對照"
              >
                <Columns2 size={16} />
              </button>
            </div>
          </div>

          <div
            className={`flex flex-1 gap-4 overflow-y-auto p-4 ${
              previewDirective === PreviewDirective.COLUMN
                ? "flex-row"
                : "flex-col"
            }`}
          >
            {/* 修改前 */}
            <div className={`flex flex-col ${previewStyle}`}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                修改前
              </div>
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
                <CustomChartCanvas type={chartType} raw={raw} />
              </div>
            </div>

            {/* 修改後 */}
            <div className={`flex flex-col ${previewStyle}`}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
                修改後
              </div>
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
                {renderAfter()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:text-slate-400"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleMockGenerate}
              disabled={!instruction.trim() || isGenerating}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Send size={14} />
              產生
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CustomChartAiModal };
